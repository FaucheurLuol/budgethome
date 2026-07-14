const express = require('express');
const pool = require('../db');
const verifierToken = require('../middleware/auth');

const router = express.Router();

// GET /utilisateurs - liste tous les utilisateurs (pour sélection de comptes partagés)
router.get('/', verifierToken, async (req, res, next) => {
  try {
    const resultat = await pool.query(
      'SELECT id, nom FROM utilisateurs ORDER BY nom'
    );
    res.json(resultat.rows);
  } catch (erreur) {
    next(erreur);
  }
});

module.exports = router;