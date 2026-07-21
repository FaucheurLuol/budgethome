const express = require('express');
const pool = require('../db');
const verifierToken = require('../middleware/auth');

const router = express.Router();

async function verifierAccesCompte(compteId, utilisateurId) {
  const resultat = await pool.query(
    'SELECT 1 FROM compte_utilisateurs WHERE compte_id = $1 AND utilisateur_id = $2',
    [compteId, utilisateurId]
  );
  return resultat.rows.length > 0;
}

// GET /modeles?compte_id=X - liste les modèles d'un compte
/**
 * @swagger
 * /modeles:
 *   get:
 *     summary: Liste les modèles d'un compte, avec indicateur d'utilisation ce mois-ci
 *     tags: [Modèles]
 *     parameters:
 *       - in: query
 *         name: compte_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Liste des modèles (champ utilise_ce_mois calculé, tolérance ±10%)
 *       404:
 *         description: Compte introuvable
 */
router.get('/', verifierToken, async (req, res, next) => {
  try {
    const { compte_id } = req.query;

    if (!compte_id) {
      return res.status(400).json({ erreur: 'Le paramètre compte_id est requis.' });
    }

    const acces = await verifierAccesCompte(compte_id, req.utilisateur.id);
    if (!acces) {
      return res.status(404).json({ erreur: 'Compte introuvable.' });
    }

    const maintenant = new Date();
    const debutMois = `${maintenant.getFullYear()}-${String(maintenant.getMonth() + 1).padStart(2, '0')}-01`;
    const finMoisDate = new Date(maintenant.getFullYear(), maintenant.getMonth() + 1, 1);
    const finMois = `${finMoisDate.getFullYear()}-${String(finMoisDate.getMonth() + 1).padStart(2, '0')}-01`;

    const resultat = await pool.query(
      `SELECT m.*,
        EXISTS (
          SELECT 1 FROM transactions t
          WHERE t.compte_id = m.compte_id
            AND t.montant BETWEEN ROUND(m.montant * 0.9) AND ROUND(m.montant * 1.1)
            AND t.date >= $2 AND t.date < $3
            AND (
              (m.est_virement_epargne = FALSE AND t.categorie_id = m.categorie_id)
              OR (m.est_virement_epargne = TRUE AND t.description = m.nom)
            )
        ) AS utilise_ce_mois
       FROM modeles_transactions m
       WHERE m.compte_id = $1
       ORDER BY m.nom`,
      [compte_id, debutMois, finMois]
    );

    res.json(resultat.rows);
  } catch (erreur) {
    next(erreur);
  }
});

// POST /modeles - création
/**
 * @swagger
 * /modeles:
 *   post:
 *     summary: Crée un modèle (classique ou virement épargne automatisé)
 *     tags: [Modèles]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [compte_id, nom, type_transaction]
 *             properties:
 *               compte_id:
 *                 type: integer
 *               nom:
 *                 type: string
 *               categorie_id:
 *                 type: integer
 *                 nullable: true
 *               montant:
 *                 type: integer
 *                 nullable: true
 *               type_transaction:
 *                 type: string
 *                 enum: [depense, revenu]
 *               moyen_paiement:
 *                 type: string
 *                 nullable: true
 *               est_virement_epargne:
 *                 type: boolean
 *               compte_epargne_id:
 *                 type: integer
 *                 nullable: true
 *               objectif_id:
 *                 type: integer
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Modèle créé
 *       400:
 *         description: Champs requis manquants
 */
router.post('/', verifierToken, async (req, res, next) => {
  try {
    const {
      compte_id, nom, categorie_id, montant, type_transaction, moyen_paiement,
      est_virement_epargne, compte_epargne_id, objectif_id
    } = req.body;

    if (!compte_id || !nom || !type_transaction) {
      return res.status(400).json({ erreur: 'Compte, nom et type sont requis.' });
    }

    if (!est_virement_epargne && !categorie_id) {
      return res.status(400).json({ erreur: 'Une catégorie est requise pour un modèle classique.' });
    }

    if (est_virement_epargne && !compte_epargne_id) {
      return res.status(400).json({ erreur: 'Un compte d\'épargne de destination est requis.' });
    }

    const acces = await verifierAccesCompte(compte_id, req.utilisateur.id);
    if (!acces) {
      return res.status(404).json({ erreur: 'Compte introuvable.' });
    }

    if (categorie_id) {
      const foyerRes = await pool.query('SELECT foyer_id FROM utilisateurs WHERE id = $1', [req.utilisateur.id]);
      const foyerId = foyerRes.rows[0].foyer_id;

      const verifCategorie = await pool.query(
        `SELECT 1 FROM categories
        WHERE id = $1 AND (foyer_id = $2 OR (utilisateur_id = $3 AND foyer_id IS NULL))`,
        [categorie_id, foyerId, req.utilisateur.id]
      );
      if (verifCategorie.rows.length === 0) {
        return res.status(400).json({ erreur: 'Catégorie introuvable.' });
      }
    }

    const resultat = await pool.query(
      `INSERT INTO modeles_transactions
       (utilisateur_id, compte_id, nom, categorie_id, montant, type_transaction, moyen_paiement,
        est_virement_epargne, compte_epargne_id, objectif_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        req.utilisateur.id, compte_id, nom, categorie_id || null, montant || null,
        type_transaction, moyen_paiement || null,
        est_virement_epargne || false, compte_epargne_id || null, objectif_id || null
      ]
    );

    res.status(201).json(resultat.rows[0]);
  } catch (erreur) {
    next(erreur);
  }
});

// POST /modeles/virement-compte-commun - crée ou remplace le modèle "Virement vers compte commun"
/**
 * @swagger
 * /modeles/virement-compte-commun:
 *   post:
 *     summary: Crée ou remplace le modèle "Virement vers compte commun" à partir d'une répartition
 *     tags: [Modèles]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [compte_id, montant]
 *             properties:
 *               compte_id:
 *                 type: integer
 *               montant:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Modèle créé ou mis à jour
 *       404:
 *         description: Compte introuvable
 */
router.post('/virement-compte-commun', verifierToken, async (req, res, next) => {
  try {
    const { compte_id, montant } = req.body;

    if (!compte_id || montant === undefined) {
      return res.status(400).json({ erreur: 'compte_id et montant sont requis.' });
    }

    const acces = await verifierAccesCompte(compte_id, req.utilisateur.id);
    if (!acces) {
      return res.status(404).json({ erreur: 'Compte introuvable.' });
    }

    // Catégorie "Compte commun" dédiée (dépense)
    const categorieExistante = await pool.query(
      `SELECT id FROM categories
       WHERE utilisateur_id = $1 AND type_categorie = 'depense' AND nom = 'Compte commun'
       LIMIT 1`,
      [req.utilisateur.id]
    );
    let categorieId;
    if (categorieExistante.rows.length > 0) {
      categorieId = categorieExistante.rows[0].id;
    } else {
      const nouvelleCategorie = await pool.query(
        `INSERT INTO categories (nom, utilisateur_id, type_categorie) VALUES ('Compte commun', $1, 'depense') RETURNING id`,
        [req.utilisateur.id]
      );
      categorieId = nouvelleCategorie.rows[0].id;
    }

    // Cherche si le modèle "Virement vers compte commun" existe déjà pour ce compte
    const modeleExistant = await pool.query(
      `SELECT id FROM modeles_transactions
       WHERE compte_id = $1 AND utilisateur_id = $2 AND nom = 'Virement vers compte commun'`,
      [compte_id, req.utilisateur.id]
    );

    let resultat;
    if (modeleExistant.rows.length > 0) {
      resultat = await pool.query(
        `UPDATE modeles_transactions SET montant = $1, categorie_id = $2 WHERE id = $3 RETURNING *`,
        [montant, categorieId, modeleExistant.rows[0].id]
      );
    } else {
      resultat = await pool.query(
        `INSERT INTO modeles_transactions
         (utilisateur_id, compte_id, nom, categorie_id, montant, type_transaction, moyen_paiement)
         VALUES ($1, $2, 'Virement vers compte commun', $3, $4, 'depense', 'Virement')
         RETURNING *`,
        [req.utilisateur.id, compte_id, categorieId, montant]
      );
    }

    res.status(200).json(resultat.rows[0]);
  } catch (erreur) {
    next(erreur);
  }
});

// PUT /modeles/:id - modification
/**
 * @swagger
 * /modeles/{id}:
 *   put:
 *     summary: Modifie un modèle existant
 *     tags: [Modèles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nom:
 *                 type: string
 *               categorie_id:
 *                 type: integer
 *                 nullable: true
 *               montant:
 *                 type: integer
 *                 nullable: true
 *               type_transaction:
 *                 type: string
 *               moyen_paiement:
 *                 type: string
 *                 nullable: true
 *               est_virement_epargne:
 *                 type: boolean
 *               compte_epargne_id:
 *                 type: integer
 *                 nullable: true
 *               objectif_id:
 *                 type: integer
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Modèle modifié
 *       404:
 *         description: Modèle introuvable
 */
router.put('/:id', verifierToken, async (req, res, next) => {
  try {
    const {
      nom, categorie_id, montant, type_transaction, moyen_paiement,
      est_virement_epargne, compte_epargne_id, objectif_id
    } = req.body;

    const existant = await pool.query(
      'SELECT compte_id FROM modeles_transactions WHERE id = $1 AND utilisateur_id = $2',
      [req.params.id, req.utilisateur.id]
    );
    if (existant.rows.length === 0) {
      return res.status(404).json({ erreur: 'Modèle introuvable.' });
    }

    const resultat = await pool.query(
      `UPDATE modeles_transactions
       SET nom = $1, categorie_id = $2, montant = $3, type_transaction = $4, moyen_paiement = $5,
           est_virement_epargne = $6, compte_epargne_id = $7, objectif_id = $8
       WHERE id = $9
       RETURNING *`,
      [
        nom, categorie_id || null, montant || null, type_transaction, moyen_paiement || null,
        est_virement_epargne || false, compte_epargne_id || null, objectif_id || null,
        req.params.id
      ]
    );

    res.json(resultat.rows[0]);
  } catch (erreur) {
    next(erreur);
  }
});

// DELETE /modeles/:id
/**
 * @swagger
 * /modeles/{id}:
 *   delete:
 *     summary: Supprime un modèle
 *     tags: [Modèles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Supprimé
 *       404:
 *         description: Modèle introuvable
 */
router.delete('/:id', verifierToken, async (req, res, next) => {
  try {
    const existant = await pool.query(
      'SELECT 1 FROM modeles_transactions WHERE id = $1 AND utilisateur_id = $2',
      [req.params.id, req.utilisateur.id]
    );
    if (existant.rows.length === 0) {
      return res.status(404).json({ erreur: 'Modèle introuvable.' });
    }

    await pool.query('DELETE FROM modeles_transactions WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (erreur) {
    next(erreur);
  }
});

module.exports = router;