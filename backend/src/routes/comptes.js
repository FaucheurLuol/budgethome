const express = require('express');
const pool = require('../db');
const verifierToken = require('../middleware/auth');

const router = express.Router();

// GET /comptes - liste les comptes visibles par l'utilisateur connecté
router.get('/', verifierToken, async (req, res, next) => {
  try {
    const resultat = await pool.query(
      `SELECT c.*
       FROM comptes c
       JOIN compte_utilisateurs cu ON c.id = cu.compte_id
       WHERE cu.utilisateur_id = $1 AND c.est_archive = FALSE
       ORDER BY c.nom`,
      [req.utilisateur.id]
    );
    res.json(resultat.rows);
  } catch (erreur) {
    next(erreur);
  }
});

// GET /comptes/:id - détail d'un compte (si l'utilisateur y a accès)
router.get('/:id', verifierToken, async (req, res, next) => {
  try {
    const resultat = await pool.query(
      `SELECT c.*
       FROM comptes c
       JOIN compte_utilisateurs cu ON c.id = cu.compte_id
       WHERE c.id = $1 AND cu.utilisateur_id = $2`,
      [req.params.id, req.utilisateur.id]
    );

    if (resultat.rows.length === 0) {
      return res.status(404).json({ erreur: 'Compte introuvable.' });
    }

    res.json(resultat.rows[0]);
  } catch (erreur) {
    next(erreur);
  }
});

// POST /comptes - création d'un compte perso ou partagé
router.post('/', verifierToken, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { nom, type_compte, solde_initial, partage, utilisateurs_associes } = req.body;

    if (!nom || !type_compte || solde_initial === undefined) {
      return res.status(400).json({ erreur: 'Nom, type de compte et solde initial sont requis.' });
    }

    await client.query('BEGIN');

    const resultatCompte = await client.query(
      'INSERT INTO comptes (nom, type_compte, solde_initial) VALUES ($1, $2, $3) RETURNING *',
      [nom, type_compte, solde_initial]
    );
    const compte = resultatCompte.rows[0];

    const idsAAssocier = new Set([req.utilisateur.id]);
    if (partage && Array.isArray(utilisateurs_associes)) {
      utilisateurs_associes.forEach((id) => idsAAssocier.add(id));
    }

    for (const utilisateurId of idsAAssocier) {
      await client.query(
        'INSERT INTO compte_utilisateurs (compte_id, utilisateur_id) VALUES ($1, $2)',
        [compte.id, utilisateurId]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(compte);
  } catch (erreur) {
    await client.query('ROLLBACK');
    next(erreur);
  } finally {
    client.release();
  }
});

// PUT /comptes/:id - modification (nom, type_compte)
router.put('/:id', verifierToken, async (req, res, next) => {
  try {
    const { nom, type_compte } = req.body;

    const verifAcces = await pool.query(
      'SELECT 1 FROM compte_utilisateurs WHERE compte_id = $1 AND utilisateur_id = $2',
      [req.params.id, req.utilisateur.id]
    );
    if (verifAcces.rows.length === 0) {
      return res.status(404).json({ erreur: 'Compte introuvable.' });
    }

    const resultat = await pool.query(
      'UPDATE comptes SET nom = $1, type_compte = $2 WHERE id = $3 RETURNING *',
      [nom, type_compte, req.params.id]
    );

    res.json(resultat.rows[0]);
  } catch (erreur) {
    next(erreur);
  }
});

// PATCH /comptes/:id/archiver - archivage plutôt que suppression
router.patch('/:id/archiver', verifierToken, async (req, res, next) => {
  try {
    const verifAcces = await pool.query(
      'SELECT 1 FROM compte_utilisateurs WHERE compte_id = $1 AND utilisateur_id = $2',
      [req.params.id, req.utilisateur.id]
    );
    if (verifAcces.rows.length === 0) {
      return res.status(404).json({ erreur: 'Compte introuvable.' });
    }

    const resultat = await pool.query(
      'UPDATE comptes SET est_archive = TRUE WHERE id = $1 RETURNING *',
      [req.params.id]
    );

    res.json(resultat.rows[0]);
  } catch (erreur) {
    next(erreur);
  }
});

// DELETE /comptes/:id - suppression définitive (uniquement si aucune transaction liée)
router.delete('/:id', verifierToken, async (req, res, next) => {
  try {
    const verifAcces = await pool.query(
      'SELECT 1 FROM compte_utilisateurs WHERE compte_id = $1 AND utilisateur_id = $2',
      [req.params.id, req.utilisateur.id]
    );
    if (verifAcces.rows.length === 0) {
      return res.status(404).json({ erreur: 'Compte introuvable.' });
    }

    await pool.query('DELETE FROM comptes WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (erreur) {
    next(erreur);
  }
});

module.exports = router;