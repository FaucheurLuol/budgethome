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

// GET /simulations?compte_id=X
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

    const resultat = await pool.query(
      'SELECT * FROM transactions_simulees WHERE compte_id = $1 ORDER BY date_prevue',
      [compte_id]
    );

    res.json(resultat.rows);
  } catch (erreur) {
    next(erreur);
  }
});

// POST /simulations
router.post('/', verifierToken, async (req, res, next) => {
  try {
    const { compte_id, categorie_id, date_prevue, montant, description, type_transaction } = req.body;

    if (!compte_id || !categorie_id || !date_prevue || !montant || !type_transaction) {
      return res.status(400).json({ erreur: 'Champs obligatoires manquants.' });
    }

    const acces = await verifierAccesCompte(compte_id, req.utilisateur.id);
    if (!acces) {
      return res.status(404).json({ erreur: 'Compte introuvable.' });
    }

    const resultat = await pool.query(
      `INSERT INTO transactions_simulees (compte_id, categorie_id, date_prevue, montant, description, type_transaction)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [compte_id, categorie_id, date_prevue, montant, description || null, type_transaction]
    );

    res.status(201).json(resultat.rows[0]);
  } catch (erreur) {
    next(erreur);
  }
});

// PUT /simulations/:id
router.put('/:id', verifierToken, async (req, res, next) => {
  try {
    const { categorie_id, date_prevue, montant, description, type_transaction } = req.body;

    const existant = await pool.query('SELECT compte_id FROM transactions_simulees WHERE id = $1', [req.params.id]);
    if (existant.rows.length === 0) {
      return res.status(404).json({ erreur: 'Simulation introuvable.' });
    }

    const acces = await verifierAccesCompte(existant.rows[0].compte_id, req.utilisateur.id);
    if (!acces) {
      return res.status(404).json({ erreur: 'Simulation introuvable.' });
    }

    const resultat = await pool.query(
      `UPDATE transactions_simulees
       SET categorie_id = $1, date_prevue = $2, montant = $3, description = $4, type_transaction = $5
       WHERE id = $6
       RETURNING *`,
      [categorie_id, date_prevue, montant, description || null, type_transaction, req.params.id]
    );

    res.json(resultat.rows[0]);
  } catch (erreur) {
    next(erreur);
  }
});

// DELETE /simulations/:id
router.delete('/:id', verifierToken, async (req, res, next) => {
  try {
    const existant = await pool.query('SELECT compte_id FROM transactions_simulees WHERE id = $1', [req.params.id]);
    if (existant.rows.length === 0) {
      return res.status(404).json({ erreur: 'Simulation introuvable.' });
    }

    const acces = await verifierAccesCompte(existant.rows[0].compte_id, req.utilisateur.id);
    if (!acces) {
      return res.status(404).json({ erreur: 'Simulation introuvable.' });
    }

    await pool.query('DELETE FROM transactions_simulees WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (erreur) {
    next(erreur);
  }
});

module.exports = router;