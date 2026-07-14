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
    const { nom, parent_id } = req.body;

    if (!nom) {
      return res.status(400).json({ erreur: 'Le nom est requis.' });
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
      'INSERT INTO categories (nom, parent_id, utilisateur_id) VALUES ($1, $2, $3) RETURNING *',
      [nom, parent_id || null, req.utilisateur.id]
    );

    res.status(201).json(resultat.rows[0]);
  } catch (erreur) {
    next(erreur);
  }
});

// PUT /categories/:id - modification
router.put('/:id', verifierToken, async (req, res, next) => {
  try {
    const { nom, parent_id } = req.body;

    const verifAcces = await pool.query(
      'SELECT 1 FROM categories WHERE id = $1 AND utilisateur_id = $2',
      [req.params.id, req.utilisateur.id]
    );
    if (verifAcces.rows.length === 0) {
      return res.status(404).json({ erreur: 'Catégorie introuvable.' });
    }

    const resultat = await pool.query(
      'UPDATE categories SET nom = $1, parent_id = $2 WHERE id = $3 RETURNING *',
      [nom, parent_id || null, req.params.id]
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

module.exports = router;