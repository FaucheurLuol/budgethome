const express = require('express');
const crypto = require('crypto');
const pool = require('../db');
const verifierToken = require('../middleware/auth');

const router = express.Router();

function genererCode() {
  return crypto.randomBytes(6).toString('hex').toUpperCase(); // 12 caractères
}

// GET /foyers/moi - infos du foyer de l'utilisateur connecté
router.get('/moi', verifierToken, async (req, res, next) => {
  try {
    const resultat = await pool.query(
      `SELECT f.id, f.code_invitation
       FROM foyers f
       JOIN utilisateurs u ON u.foyer_id = f.id
       WHERE u.id = $1`,
      [req.utilisateur.id]
    );

    if (resultat.rows.length === 0) {
      return res.json(null);
    }

    res.json(resultat.rows[0]);
  } catch (erreur) {
    next(erreur);
  }
});

// POST /foyers - créer un nouveau foyer et y rattacher l'utilisateur connecté
router.post('/', verifierToken, async (req, res, next) => {
  try {
    const dejaDansFoyer = await pool.query('SELECT foyer_id FROM utilisateurs WHERE id = $1', [req.utilisateur.id]);
    if (dejaDansFoyer.rows[0].foyer_id) {
      return res.status(400).json({ erreur: 'Vous appartenez déjà à un foyer.' });
    }

    let code;
    let unique = false;
    while (!unique) {
      code = genererCode();
      const verif = await pool.query('SELECT 1 FROM foyers WHERE code_invitation = $1', [code]);
      unique = verif.rows.length === 0;
    }

    const nouveauFoyer = await pool.query(
      'INSERT INTO foyers (code_invitation) VALUES ($1) RETURNING *',
      [code]
    );

    await pool.query('UPDATE utilisateurs SET foyer_id = $1 WHERE id = $2', [nouveauFoyer.rows[0].id, req.utilisateur.id]);

    res.status(201).json(nouveauFoyer.rows[0]);
  } catch (erreur) {
    next(erreur);
  }
});

// POST /foyers/rejoindre - rejoindre un foyer existant via son code
router.post('/rejoindre', verifierToken, async (req, res, next) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ erreur: 'Le code d\'invitation est requis.' });
    }

    const dejaDansFoyer = await pool.query('SELECT foyer_id FROM utilisateurs WHERE id = $1', [req.utilisateur.id]);
    if (dejaDansFoyer.rows[0].foyer_id) {
      return res.status(400).json({ erreur: 'Vous appartenez déjà à un foyer.' });
    }

    const foyer = await pool.query('SELECT id FROM foyers WHERE code_invitation = $1', [code.toUpperCase()]);
    if (foyer.rows.length === 0) {
      return res.status(404).json({ erreur: 'Code d\'invitation invalide.' });
    }

    await pool.query('UPDATE utilisateurs SET foyer_id = $1 WHERE id = $2', [foyer.rows[0].id, req.utilisateur.id]);

    res.json({ message: 'Foyer rejoint avec succès.' });
  } catch (erreur) {
    next(erreur);
  }
});

// POST /foyers/quitter - quitte le foyer actuel
router.post('/quitter', verifierToken, async (req, res, next) => {
  try {
    const moi = await pool.query('SELECT foyer_id FROM utilisateurs WHERE id = $1', [req.utilisateur.id]);
    if (!moi.rows[0].foyer_id) {
      return res.status(400).json({ erreur: 'Vous n\'appartenez à aucun foyer.' });
    }

    await pool.query('UPDATE utilisateurs SET foyer_id = NULL WHERE id = $1', [req.utilisateur.id]);

    res.json({ message: 'Vous avez quitté le foyer.' });
  } catch (erreur) {
    next(erreur);
  }
});

module.exports = router;