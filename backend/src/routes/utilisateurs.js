const express = require('express');
const pool = require('../db');
const verifierToken = require('../middleware/auth');

const router = express.Router();

// GET /utilisateurs - liste les utilisateurs du même foyer uniquement
router.get('/', verifierToken, async (req, res, next) => {
  try {
    const moi = await pool.query('SELECT foyer_id FROM utilisateurs WHERE id = $1', [req.utilisateur.id]);
    const foyerId = moi.rows[0].foyer_id;

    if (!foyerId) {
      const resultatSeul = await pool.query('SELECT id, nom FROM utilisateurs WHERE id = $1', [req.utilisateur.id]);
      return res.json(resultatSeul.rows);
    }

    const resultat = await pool.query(
      'SELECT id, nom FROM utilisateurs WHERE foyer_id = $1 ORDER BY nom',
      [foyerId]
    );
    res.json(resultat.rows);
  } catch (erreur) {
    next(erreur);
  }
});

module.exports = router;