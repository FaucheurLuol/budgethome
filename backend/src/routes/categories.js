const express = require('express');
const pool = require('../db');
const verifierToken = require('../middleware/auth');

const router = express.Router();

async function obtenirFoyerId(utilisateurId) {
  const resultat = await pool.query('SELECT foyer_id FROM utilisateurs WHERE id = $1', [utilisateurId]);
  return resultat.rows[0].foyer_id;
}

// GET /categories - partagées par foyer, ou propres à moi si pas de foyer
/**
 * @swagger
 * /categories:
 *   get:
 *     summary: Liste les catégories du foyer (ou propres à moi si pas de foyer)
 *     tags: [Catégories]
 *     responses:
 *       200:
 *         description: Liste des catégories
 */
router.get('/', verifierToken, async (req, res, next) => {
  try {
    const foyerId = await obtenirFoyerId(req.utilisateur.id);

    let resultat;
    if (foyerId) {
      resultat = await pool.query(
        `SELECT c.* FROM categories c
         JOIN utilisateurs u ON u.id = c.utilisateur_id
         WHERE c.foyer_id = $1 OR (c.utilisateur_id = $2 AND c.foyer_id IS NULL)
         ORDER BY c.nom`,
        [foyerId, req.utilisateur.id]
      );
    } else {
      resultat = await pool.query(
        'SELECT * FROM categories WHERE utilisateur_id = $1 ORDER BY nom',
        [req.utilisateur.id]
      );
    }
    res.json(resultat.rows);
  } catch (erreur) {
    next(erreur);
  }
});

// POST /categories - création (racine ou sous-catégorie)
/**
 * @swagger
 * /categories:
 *   post:
 *     summary: Crée une catégorie (racine ou sous-catégorie)
 *     tags: [Catégories]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nom, type_categorie]
 *             properties:
 *               nom:
 *                 type: string
 *               type_categorie:
 *                 type: string
 *                 enum: [depense, revenu]
 *               parent_id:
 *                 type: integer
 *                 nullable: true
 *               est_recurrente:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Catégorie créée
 *       400:
 *         description: Nom/type manquant, ou catégorie parente introuvable
 */
router.post('/', verifierToken, async (req, res, next) => {
  try {
    const { nom, parent_id, type_categorie, est_recurrente } = req.body;

    if (!nom || !type_categorie) {
      return res.status(400).json({ erreur: 'Le nom et le type de catégorie sont requis.' });
    }

    const foyerId = await obtenirFoyerId(req.utilisateur.id);

    if (parent_id) {
      const verifParent = await pool.query(
        `SELECT 1 FROM categories
         WHERE id = $1 AND (foyer_id = $2 OR (utilisateur_id = $3 AND foyer_id IS NULL))`,
        [parent_id, foyerId, req.utilisateur.id]
      );
      if (verifParent.rows.length === 0) {
        return res.status(400).json({ erreur: 'Catégorie parente introuvable.' });
      }
    }

    const resultat = await pool.query(
      'INSERT INTO categories (nom, parent_id, utilisateur_id, foyer_id, type_categorie, est_recurrente) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [nom, parent_id || null, req.utilisateur.id, foyerId, type_categorie, est_recurrente || false]
    );

    res.status(201).json(resultat.rows[0]);
  } catch (erreur) {
    next(erreur);
  }
});

// PUT /categories/:id - modification
/**
 * @swagger
 * /categories/{id}:
 *   put:
 *     summary: Modifie une catégorie
 *     tags: [Catégories]
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
 *               parent_id:
 *                 type: integer
 *                 nullable: true
 *               type_categorie:
 *                 type: string
 *                 enum: [depense, revenu]
 *               est_recurrente:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Catégorie modifiée
 *       404:
 *         description: Catégorie introuvable
 */
router.put('/:id', verifierToken, async (req, res, next) => {
  try {
    const { nom, parent_id, type_categorie, est_recurrente } = req.body;
    const foyerId = await obtenirFoyerId(req.utilisateur.id);

    const verifAcces = await pool.query(
      `SELECT 1 FROM categories
       WHERE id = $1 AND (foyer_id = $2 OR (utilisateur_id = $3 AND foyer_id IS NULL))`,
      [req.params.id, foyerId, req.utilisateur.id]
    );
    if (verifAcces.rows.length === 0) {
      return res.status(404).json({ erreur: 'Catégorie introuvable.' });
    }

    const resultat = await pool.query(
      'UPDATE categories SET nom = $1, parent_id = $2, type_categorie = $3, est_recurrente = $4 WHERE id = $5 RETURNING *',
      [nom, parent_id || null, type_categorie, est_recurrente || false, req.params.id]
    );

    res.json(resultat.rows[0]);
  } catch (erreur) {
    next(erreur);
  }
});

// DELETE /categories/:id - suppression
/**
 * @swagger
 * /categories/{id}:
 *   delete:
 *     summary: Supprime une catégorie
 *     tags: [Catégories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Supprimée
 *       404:
 *         description: Catégorie introuvable
 *       409:
 *         description: Des transactions/modèles utilisent encore cette catégorie
 */
router.delete('/:id', verifierToken, async (req, res, next) => {
  try {
    const foyerId = await obtenirFoyerId(req.utilisateur.id);

    const verifAcces = await pool.query(
      `SELECT 1 FROM categories
       WHERE id = $1 AND (foyer_id = $2 OR (utilisateur_id = $3 AND foyer_id IS NULL))`,
      [req.params.id, foyerId, req.utilisateur.id]
    );
    if (verifAcces.rows.length === 0) {
      return res.status(404).json({ erreur: 'Catégorie introuvable.' });
    }

    await pool.query('DELETE FROM categories WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (erreur) {
    next(erreur);
  }
});

// POST /categories/epargne-defaut - garantit l'existence des catégories "Épargne"
/**
 * @swagger
 * /categories/epargne-defaut:
 *   post:
 *     summary: Garantit l'existence des catégories "Épargne" (dépense + revenu)
 *     tags: [Catégories]
 *     responses:
 *       200:
 *         description: Catégories Épargne (trouvées ou créées)
 */
router.post('/epargne-defaut', verifierToken, async (req, res, next) => {
  try {
    const foyerId = await obtenirFoyerId(req.utilisateur.id);

    async function trouverOuCreer(typeCategorie) {
      const existante = await pool.query(
        `SELECT * FROM categories
         WHERE nom = 'Épargne' AND type_categorie = $1
           AND (foyer_id = $2 OR (utilisateur_id = $3 AND foyer_id IS NULL))`,
        [typeCategorie, foyerId, req.utilisateur.id]
      );
      if (existante.rows.length > 0) {
        return existante.rows[0];
      }
      const creee = await pool.query(
        'INSERT INTO categories (nom, utilisateur_id, foyer_id, type_categorie) VALUES ($1, $2, $3, $4) RETURNING *',
        ['Épargne', req.utilisateur.id, foyerId, typeCategorie]
      );
      return creee.rows[0];
    }

    const [depense, revenu] = await Promise.all([
      trouverOuCreer('depense'),
      trouverOuCreer('revenu'),
    ]);

    res.json({ depense, revenu });
  } catch (erreur) {
    next(erreur);
  }
});

module.exports = router;