const express = require('express');
const pool = require('../db');
const verifierToken = require('../middleware/auth');

const router = express.Router();

// GET /categories - liste les catégories de l'utilisateur connecté
router.get('/', verifierToken, async (req, res, next) => {
  try {
    const resultat = await pool.query(
      'SELECT * FROM categories WHERE utilisateur_id = $1 ORDER BY nom',
      [req.utilisateur.id]
    );
    res.json(resultat.rows);
  } catch (erreur) {
    next(erreur);
  }
});

// POST /categories - création (racine ou sous-catégorie)
router.post('/', verifierToken, async (req, res, next) => {
  try {
    const { nom, parent_id, type_categorie } = req.body;

    if (!nom || !type_categorie) {
      return res.status(400).json({ erreur: 'Le nom et le type de catégorie sont requis.' });
    }

    if (parent_id) {
      const verifParent = await pool.query(
        'SELECT 1 FROM categories WHERE id = $1 AND utilisateur_id = $2',
        [parent_id, req.utilisateur.id]
      );
      if (verifParent.rows.length === 0) {
        return res.status(400).json({ erreur: 'Catégorie parente introuvable.' });
      }
    }

    const resultat = await pool.query(
      'INSERT INTO categories (nom, parent_id, utilisateur_id, type_categorie) VALUES ($1, $2, $3, $4) RETURNING *',
      [nom, parent_id || null, req.utilisateur.id, type_categorie]
    );

    res.status(201).json(resultat.rows[0]);
  } catch (erreur) {
    next(erreur);
  }
});

// PUT /categories/:id - modification
router.put('/:id', verifierToken, async (req, res, next) => {
  try {
    const { nom, parent_id, type_categorie } = req.body;

    const verifAcces = await pool.query(
      'SELECT 1 FROM categories WHERE id = $1 AND utilisateur_id = $2',
      [req.params.id, req.utilisateur.id]
    );
    if (verifAcces.rows.length === 0) {
      return res.status(404).json({ erreur: 'Catégorie introuvable.' });
    }

    const resultat = await pool.query(
      'UPDATE categories SET nom = $1, parent_id = $2, type_categorie = $3 WHERE id = $4 RETURNING *',
      [nom, parent_id || null, type_categorie, req.params.id]
    );

    res.json(resultat.rows[0]);
  } catch (erreur) {
    next(erreur);
  }
});

// DELETE /categories/:id - suppression
router.delete('/:id', verifierToken, async (req, res, next) => {
  try {
    const verifAcces = await pool.query(
      'SELECT 1 FROM categories WHERE id = $1 AND utilisateur_id = $2',
      [req.params.id, req.utilisateur.id]
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

// POST /categories/epargne-defaut - garantit l'existence des catégories "Épargne" (dépense + revenu)
router.post('/epargne-defaut', verifierToken, async (req, res, next) => {
  try {
    async function trouverOuCreer(typeCategorie) {
      const existante = await pool.query(
        'SELECT * FROM categories WHERE utilisateur_id = $1 AND type_categorie = $2 AND nom = $3',
        [req.utilisateur.id, typeCategorie, 'Épargne']
      );
      if (existante.rows.length > 0) {
        return existante.rows[0];
      }
      const creee = await pool.query(
        'INSERT INTO categories (nom, utilisateur_id, type_categorie) VALUES ($1, $2, $3) RETURNING *',
        ['Épargne', req.utilisateur.id, typeCategorie]
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