const express = require('express');
const pool = require('../db');
const verifierToken = require('../middleware/auth');

const router = express.Router();

async function obtenirFoyerId(utilisateurId) {
  const resultat = await pool.query('SELECT foyer_id FROM utilisateurs WHERE id = $1', [utilisateurId]);
  return resultat.rows[0].foyer_id;
}

function clauseAcces(foyerId, alias = 'o') {
  return `(${alias}.foyer_id = $FOYER_ID OR (${alias}.utilisateur_id = $UTILISATEUR_ID AND ${alias}.foyer_id IS NULL))`;
}

// GET /objectifs - liste les objectifs accessibles (miens + communs de mon foyer)
/**
 * @swagger
 * /objectifs:
 *   get:
 *     summary: Liste les objectifs accessibles (miens + communs du foyer), avec progression
 *     tags: [Objectifs]
 *     responses:
 *       200:
 *         description: Liste des objectifs avec montant_actuel calculé
 */
router.get('/', verifierToken, async (req, res, next) => {
  try {
    const foyerId = await obtenirFoyerId(req.utilisateur.id);

    const resultat = await pool.query(
      `SELECT
         o.id, o.nom, o.montant_cible, o.foyer_id,
         COALESCE(SUM(
           CASE WHEN t.type_transaction = 'revenu' THEN a.montant_fleche
                WHEN t.type_transaction = 'depense' THEN -a.montant_fleche
           END
         ), 0) AS montant_actuel
       FROM objectifs_epargne o
       LEFT JOIN allocations_epargne a ON a.objectif_id = o.id
       LEFT JOIN transactions t ON t.id = a.transaction_id
       WHERE o.foyer_id = $1 OR (o.utilisateur_id = $2 AND o.foyer_id IS NULL)
       GROUP BY o.id
       ORDER BY o.nom`,
      [foyerId, req.utilisateur.id]
    );

    res.json(resultat.rows);
  } catch (erreur) {
    next(erreur);
  }
});

// POST /objectifs
/**
 * @swagger
 * /objectifs:
 *   post:
 *     summary: Crée un objectif d'épargne (individuel ou commun au foyer)
 *     tags: [Objectifs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nom, montant_cible]
 *             properties:
 *               nom:
 *                 type: string
 *               montant_cible:
 *                 type: integer
 *               est_commun:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Objectif créé
 *       400:
 *         description: Champs manquants, ou pas de foyer pour un objectif commun
 */
router.post('/', verifierToken, async (req, res, next) => {
  try {
    const { nom, montant_cible, est_commun } = req.body;

    if (!nom || !montant_cible) {
      return res.status(400).json({ erreur: 'Nom et montant cible sont requis.' });
    }

    let foyerId = null;
    if (est_commun) {
      foyerId = await obtenirFoyerId(req.utilisateur.id);
      if (!foyerId) {
        return res.status(400).json({ erreur: 'Vous devez appartenir à un foyer pour créer un objectif commun.' });
      }
    }

    const resultat = await pool.query(
      'INSERT INTO objectifs_epargne (nom, montant_cible, utilisateur_id, foyer_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [nom, montant_cible, req.utilisateur.id, foyerId]
    );

    res.status(201).json(resultat.rows[0]);
  } catch (erreur) {
    next(erreur);
  }
});

// PUT /objectifs/:id
/**
 * @swagger
 * /objectifs/{id}:
 *   put:
 *     summary: Modifie un objectif
 *     tags: [Objectifs]
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
 *               montant_cible:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Objectif modifié
 *       404:
 *         description: Objectif introuvable
 */
router.put('/:id', verifierToken, async (req, res, next) => {
  try {
    const { nom, montant_cible } = req.body;
    const foyerId = await obtenirFoyerId(req.utilisateur.id);

    const verifAcces = await pool.query(
      'SELECT 1 FROM objectifs_epargne WHERE id = $1 AND (foyer_id = $2 OR (utilisateur_id = $3 AND foyer_id IS NULL))',
      [req.params.id, foyerId, req.utilisateur.id]
    );
    if (verifAcces.rows.length === 0) {
      return res.status(404).json({ erreur: 'Objectif introuvable.' });
    }

    const resultat = await pool.query(
      'UPDATE objectifs_epargne SET nom = $1, montant_cible = $2 WHERE id = $3 RETURNING *',
      [nom, montant_cible, req.params.id]
    );

    res.json(resultat.rows[0]);
  } catch (erreur) {
    next(erreur);
  }
});

// DELETE /objectifs/:id
/**
 * @swagger
 * /objectifs/{id}:
 *   delete:
 *     summary: Supprime un objectif
 *     tags: [Objectifs]
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
 *         description: Objectif introuvable
 */
router.delete('/:id', verifierToken, async (req, res, next) => {
  try {
    const foyerId = await obtenirFoyerId(req.utilisateur.id);

    const verifAcces = await pool.query(
      'SELECT 1 FROM objectifs_epargne WHERE id = $1 AND (foyer_id = $2 OR (utilisateur_id = $3 AND foyer_id IS NULL))',
      [req.params.id, foyerId, req.utilisateur.id]
    );
    if (verifAcces.rows.length === 0) {
      return res.status(404).json({ erreur: 'Objectif introuvable.' });
    }

    await pool.query('DELETE FROM objectifs_epargne WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (erreur) {
    next(erreur);
  }
});

// POST /objectifs/:id/allocations - flécher une transaction vers cet objectif
/**
 * @swagger
 * /objectifs/{id}/allocations:
 *   post:
 *     summary: Flèche une transaction vers cet objectif
 *     tags: [Objectifs]
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
 *             required: [transaction_id, montant_fleche]
 *             properties:
 *               transaction_id:
 *                 type: integer
 *               montant_fleche:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Allocation créée
 *       400:
 *         description: Compte courant non autorisé pour l'épargne
 *       404:
 *         description: Objectif ou transaction introuvable
 */
router.post('/:id/allocations', verifierToken, async (req, res, next) => {
  try {
    const { transaction_id, montant_fleche } = req.body;
    const objectifId = req.params.id;
    const foyerId = await obtenirFoyerId(req.utilisateur.id);

    if (!transaction_id || !montant_fleche) {
      return res.status(400).json({ erreur: 'transaction_id et montant_fleche sont requis.' });
    }

    const verifObjectif = await pool.query(
      'SELECT 1 FROM objectifs_epargne WHERE id = $1 AND (foyer_id = $2 OR (utilisateur_id = $3 AND foyer_id IS NULL))',
      [objectifId, foyerId, req.utilisateur.id]
    );
    if (verifObjectif.rows.length === 0) {
      return res.status(404).json({ erreur: 'Objectif introuvable.' });
    }

    const verifTransaction = await pool.query(
      `SELECT t.id, c.type_compte
       FROM transactions t
       JOIN comptes c ON c.id = t.compte_id
       JOIN compte_utilisateurs cu ON cu.compte_id = c.id
       WHERE t.id = $1 AND cu.utilisateur_id = $2`,
      [transaction_id, req.utilisateur.id]
    );
    if (verifTransaction.rows.length === 0) {
      return res.status(404).json({ erreur: 'Transaction introuvable.' });
    }

    if (verifTransaction.rows[0].type_compte === 'Compte courant') {
      return res.status(400).json({ erreur: 'Impossible de flécher de l\'épargne depuis un compte courant.' });
    }

    const resultat = await pool.query(
      'INSERT INTO allocations_epargne (transaction_id, objectif_id, montant_fleche) VALUES ($1, $2, $3) RETURNING *',
      [transaction_id, objectifId, montant_fleche]
    );

    res.status(201).json(resultat.rows[0]);
  } catch (erreur) {
    next(erreur);
  }
});

// DELETE /objectifs/allocations/:id
/**
 * @swagger
 * /objectifs/allocations/{id}:
 *   delete:
 *     summary: Retire un flèchage d'allocation
 *     tags: [Objectifs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Allocation supprimée
 *       404:
 *         description: Allocation introuvable
 */
router.delete('/allocations/:id', verifierToken, async (req, res, next) => {
  try {
    const foyerId = await obtenirFoyerId(req.utilisateur.id);

    const verifAcces = await pool.query(
      `SELECT a.id
       FROM allocations_epargne a
       JOIN objectifs_epargne o ON o.id = a.objectif_id
       WHERE a.id = $1 AND (o.foyer_id = $2 OR (o.utilisateur_id = $3 AND o.foyer_id IS NULL))`,
      [req.params.id, foyerId, req.utilisateur.id]
    );
    if (verifAcces.rows.length === 0) {
      return res.status(404).json({ erreur: 'Allocation introuvable.' });
    }

    await pool.query('DELETE FROM allocations_epargne WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (erreur) {
    next(erreur);
  }
});

module.exports = router;