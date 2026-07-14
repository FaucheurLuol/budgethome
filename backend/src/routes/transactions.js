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

// GET /transactions?compte_id=X - liste les transactions d'un compte donné
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
      'SELECT * FROM transactions WHERE compte_id = $1 ORDER BY date DESC, id DESC',
      [compte_id]
    );

    res.json(resultat.rows);
  } catch (erreur) {
    next(erreur);
  }
});

// POST /transactions - création
router.post('/', verifierToken, async (req, res, next) => {
  try {
    const {
      date, montant, description, moyen_paiement,
      categorie_id, compte_id, type_transaction, type_revenu, est_recurrente
    } = req.body;

    if (!date || !montant || !moyen_paiement || !categorie_id || !compte_id || !type_transaction) {
      return res.status(400).json({ erreur: 'Champs obligatoires manquants.' });
    }

    const acces = await verifierAccesCompte(compte_id, req.utilisateur.id);
    if (!acces) {
      return res.status(404).json({ erreur: 'Compte introuvable.' });
    }

    const resultat = await pool.query(
      `INSERT INTO transactions
       (date, montant, description, moyen_paiement, categorie_id, compte_id, type_transaction, type_revenu, est_recurrente)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [date, montant, description || null, moyen_paiement, categorie_id, compte_id, type_transaction, type_revenu || null, est_recurrente || false]
    );

    res.status(201).json(resultat.rows[0]);
  } catch (erreur) {
    next(erreur);
  }
});

// PUT /transactions/:id - modification
router.put('/:id', verifierToken, async (req, res, next) => {
  try {
    const {
      date, montant, description, moyen_paiement,
      categorie_id, type_transaction, type_revenu, est_recurrente
    } = req.body;

    const resultatExistant = await pool.query(
      'SELECT compte_id FROM transactions WHERE id = $1',
      [req.params.id]
    );
    if (resultatExistant.rows.length === 0) {
      return res.status(404).json({ erreur: 'Transaction introuvable.' });
    }

    const acces = await verifierAccesCompte(resultatExistant.rows[0].compte_id, req.utilisateur.id);
    if (!acces) {
      return res.status(404).json({ erreur: 'Transaction introuvable.' });
    }

    const resultat = await pool.query(
      `UPDATE transactions
       SET date = $1, montant = $2, description = $3, moyen_paiement = $4,
           categorie_id = $5, type_transaction = $6, type_revenu = $7, est_recurrente = $8
       WHERE id = $9
       RETURNING *`,
      [date, montant, description || null, moyen_paiement, categorie_id, type_transaction, type_revenu || null, est_recurrente || false, req.params.id]
    );

    res.json(resultat.rows[0]);
  } catch (erreur) {
    next(erreur);
  }
});

// DELETE /transactions/:id - suppression
router.delete('/:id', verifierToken, async (req, res, next) => {
  try {
    const resultatExistant = await pool.query(
      'SELECT compte_id FROM transactions WHERE id = $1',
      [req.params.id]
    );
    if (resultatExistant.rows.length === 0) {
      return res.status(404).json({ erreur: 'Transaction introuvable.' });
    }

    const acces = await verifierAccesCompte(resultatExistant.rows[0].compte_id, req.utilisateur.id);
    if (!acces) {
      return res.status(404).json({ erreur: 'Transaction introuvable.' });
    }

    await pool.query('DELETE FROM transactions WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (erreur) {
    next(erreur);
  }
});

module.exports = router;