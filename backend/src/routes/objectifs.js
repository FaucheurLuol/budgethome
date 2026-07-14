const express = require('express');
const pool = require('../db');
const verifierToken = require('../middleware/auth');

const router = express.Router();

// ---------- OBJECTIFS D'ÉPARGNE ----------

// GET /objectifs - liste les objectifs de l'utilisateur, avec progression calculée
router.get('/', verifierToken, async (req, res, next) => {
  try {
    const resultat = await pool.query(
      `SELECT
         o.id, o.nom, o.montant_cible,
         COALESCE(SUM(
           CASE WHEN t.type_transaction = 'revenu' THEN a.montant_fleche
                WHEN t.type_transaction = 'depense' THEN -a.montant_fleche
           END
         ), 0) AS montant_actuel
       FROM objectifs_epargne o
       LEFT JOIN allocations_epargne a ON a.objectif_id = o.id
       LEFT JOIN transactions t ON t.id = a.transaction_id
       WHERE o.utilisateur_id = $1
       GROUP BY o.id
       ORDER BY o.nom`,
      [req.utilisateur.id]
    );

    res.json(resultat.rows);
  } catch (erreur) {
    next(erreur);
  }
});

// POST /objectifs
router.post('/', verifierToken, async (req, res, next) => {
  try {
    const { nom, montant_cible } = req.body;

    if (!nom || !montant_cible) {
      return res.status(400).json({ erreur: 'Nom et montant cible sont requis.' });
    }

    const resultat = await pool.query(
      'INSERT INTO objectifs_epargne (nom, montant_cible, utilisateur_id) VALUES ($1, $2, $3) RETURNING *',
      [nom, montant_cible, req.utilisateur.id]
    );

    res.status(201).json(resultat.rows[0]);
  } catch (erreur) {
    next(erreur);
  }
});

// PUT /objectifs/:id
router.put('/:id', verifierToken, async (req, res, next) => {
  try {
    const { nom, montant_cible } = req.body;

    const verifAcces = await pool.query(
      'SELECT 1 FROM objectifs_epargne WHERE id = $1 AND utilisateur_id = $2',
      [req.params.id, req.utilisateur.id]
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
router.delete('/:id', verifierToken, async (req, res, next) => {
  try {
    const verifAcces = await pool.query(
      'SELECT 1 FROM objectifs_epargne WHERE id = $1 AND utilisateur_id = $2',
      [req.params.id, req.utilisateur.id]
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

// ---------- ALLOCATIONS D'ÉPARGNE ----------

// POST /objectifs/:id/allocations - flécher une transaction vers cet objectif
router.post('/:id/allocations', verifierToken, async (req, res, next) => {
  try {
    const { transaction_id, montant_fleche } = req.body;
    const objectifId = req.params.id;

    if (!transaction_id || !montant_fleche) {
      return res.status(400).json({ erreur: 'transaction_id et montant_fleche sont requis.' });
    }

    const verifObjectif = await pool.query(
      'SELECT 1 FROM objectifs_epargne WHERE id = $1 AND utilisateur_id = $2',
      [objectifId, req.utilisateur.id]
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

// DELETE /objectifs/allocations/:id - retirer un flèchage (erreur de saisie)
router.delete('/allocations/:id', verifierToken, async (req, res, next) => {
  try {
    const verifAcces = await pool.query(
      `SELECT a.id
       FROM allocations_epargne a
       JOIN objectifs_epargne o ON o.id = a.objectif_id
       WHERE a.id = $1 AND o.utilisateur_id = $2`,
      [req.params.id, req.utilisateur.id]
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