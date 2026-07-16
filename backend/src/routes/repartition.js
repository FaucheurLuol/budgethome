const express = require('express');
const pool = require('../db');
const verifierToken = require('../middleware/auth');
const { calculerRepartition } = require('../services/repartitionCompteCommun');

const router = express.Router();

// POST /repartition - calcule et sauvegarde une simulation
router.post('/', verifierToken, async (req, res, next) => {
  try {
    const { revenus, depenses, mois } = req.body;

    if (!revenus || !depenses || !mois) {
      return res.status(400).json({ erreur: 'revenus, depenses et mois sont requis.' });
    }

    const resultat = calculerRepartition(revenus, depenses);

    const insertion = await pool.query(
      `INSERT INTO repartitions_communes (utilisateur_id, mois, revenus, depenses, resultat)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.utilisateur.id, mois, JSON.stringify(revenus), JSON.stringify(depenses), JSON.stringify(resultat)]
    );

    res.status(201).json(insertion.rows[0]);
  } catch (erreur) {
    next(erreur);
  }
});

// GET /repartition/historique - liste toutes les simulations passées
router.get('/historique', verifierToken, async (req, res, next) => {
  try {
    const moi = await pool.query('SELECT foyer_id FROM utilisateurs WHERE id = $1', [req.utilisateur.id]);
    const foyerId = moi.rows[0].foyer_id;

    let resultat;
    if (!foyerId) {
      resultat = await pool.query(
        'SELECT * FROM repartitions_communes WHERE utilisateur_id = $1 ORDER BY mois DESC, cree_le DESC',
        [req.utilisateur.id]
      );
    } else {
      resultat = await pool.query(
        `SELECT rc.* FROM repartitions_communes rc
         JOIN utilisateurs u ON u.id = rc.utilisateur_id
         WHERE u.foyer_id = $1
         ORDER BY rc.mois DESC, rc.cree_le DESC`,
        [foyerId]
      );
    }
    res.json(resultat.rows);
  } catch (erreur) {
    next(erreur);
  }
});

// GET /repartition/active - récupère la répartition actuellement active (pour le Dashboard)
router.get('/active', verifierToken, async (req, res, next) => {
  try {
    const moi = await pool.query('SELECT foyer_id FROM utilisateurs WHERE id = $1', [req.utilisateur.id]);
    const foyerId = moi.rows[0].foyer_id;

    let resultat;
    if (!foyerId) {
      resultat = await pool.query(
        'SELECT * FROM repartitions_communes WHERE est_active = TRUE AND utilisateur_id = $1 LIMIT 1',
        [req.utilisateur.id]
      );
    } else {
      resultat = await pool.query(
        `SELECT rc.* FROM repartitions_communes rc
         JOIN utilisateurs u ON u.id = rc.utilisateur_id
         WHERE rc.est_active = TRUE AND u.foyer_id = $1
         LIMIT 1`,
        [foyerId]
      );
    }

    if (resultat.rows.length === 0) return res.json(null);
    res.json(resultat.rows[0]);
  } catch (erreur) {
    next(erreur);
  }
});

// PATCH /repartition/:id/activer - marque cette répartition comme active, désactive les autres
router.patch('/:id/activer', verifierToken, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const verif = await client.query('SELECT 1 FROM repartitions_communes WHERE id = $1', [req.params.id]);
    if (verif.rows.length === 0) {
      return res.status(404).json({ erreur: 'Répartition introuvable.' });
    }

    await client.query('BEGIN');
    await client.query('UPDATE repartitions_communes SET est_active = FALSE');
    const resultat = await client.query(
      'UPDATE repartitions_communes SET est_active = TRUE WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    await client.query('COMMIT');

    res.json(resultat.rows[0]);
  } catch (erreur) {
    await client.query('ROLLBACK');
    next(erreur);
  } finally {
    client.release();
  }
});

// DELETE /repartition/:id
router.delete('/:id', verifierToken, async (req, res, next) => {
  try {
    const verif = await pool.query('SELECT 1 FROM repartitions_communes WHERE id = $1', [req.params.id]);
    if (verif.rows.length === 0) {
      return res.status(404).json({ erreur: 'Répartition introuvable.' });
    }

    await pool.query('DELETE FROM repartitions_communes WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (erreur) {
    next(erreur);
  }
});

module.exports = router;