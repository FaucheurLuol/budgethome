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

// ---------- BUDGET PAR DÉFAUT ----------

// GET /budgets/defaut?compte_id=X
router.get('/defaut', verifierToken, async (req, res, next) => {
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
      'SELECT * FROM budget_defaut WHERE compte_id = $1 ORDER BY id',
      [compte_id]
    );

    res.json(resultat.rows);
  } catch (erreur) {
    next(erreur);
  }
});

// POST /budgets/defaut
router.post('/defaut', verifierToken, async (req, res, next) => {
  try {
    const { compte_id, categorie_id, montant_par_defaut } = req.body;

    if (!compte_id || !categorie_id || montant_par_defaut === undefined) {
      return res.status(400).json({ erreur: 'compte_id, categorie_id et montant_par_defaut sont requis.' });
    }

    const acces = await verifierAccesCompte(compte_id, req.utilisateur.id);
    if (!acces) {
      return res.status(404).json({ erreur: 'Compte introuvable.' });
    }

    const resultat = await pool.query(
      'INSERT INTO budget_defaut (compte_id, categorie_id, montant_par_defaut) VALUES ($1, $2, $3) RETURNING *',
      [compte_id, categorie_id, montant_par_defaut]
    );

    res.status(201).json(resultat.rows[0]);
  } catch (erreur) {
    next(erreur);
  }
});

// PUT /budgets/defaut/:id
router.put('/defaut/:id', verifierToken, async (req, res, next) => {
  try {
    const { montant_par_defaut } = req.body;

    const existant = await pool.query('SELECT compte_id FROM budget_defaut WHERE id = $1', [req.params.id]);
    if (existant.rows.length === 0) {
      return res.status(404).json({ erreur: 'Budget par défaut introuvable.' });
    }

    const acces = await verifierAccesCompte(existant.rows[0].compte_id, req.utilisateur.id);
    if (!acces) {
      return res.status(404).json({ erreur: 'Budget par défaut introuvable.' });
    }

    const resultat = await pool.query(
      'UPDATE budget_defaut SET montant_par_defaut = $1 WHERE id = $2 RETURNING *',
      [montant_par_defaut, req.params.id]
    );

    res.json(resultat.rows[0]);
  } catch (erreur) {
    next(erreur);
  }
});

// DELETE /budgets/defaut/:id
router.delete('/defaut/:id', verifierToken, async (req, res, next) => {
  try {
    const existant = await pool.query('SELECT compte_id FROM budget_defaut WHERE id = $1', [req.params.id]);
    if (existant.rows.length === 0) {
      return res.status(404).json({ erreur: 'Budget par défaut introuvable.' });
    }

    const acces = await verifierAccesCompte(existant.rows[0].compte_id, req.utilisateur.id);
    if (!acces) {
      return res.status(404).json({ erreur: 'Budget par défaut introuvable.' });
    }

    await pool.query('DELETE FROM budget_defaut WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (erreur) {
    next(erreur);
  }
});

// ---------- BUDGET MENSUEL ----------

// GET /budgets/mensuel?compte_id=X&mois=2026-07-01
router.get('/mensuel', verifierToken, async (req, res, next) => {
  try {
    const { compte_id, mois } = req.query;

    if (!compte_id || !mois) {
      return res.status(400).json({ erreur: 'Les paramètres compte_id et mois sont requis.' });
    }

    const acces = await verifierAccesCompte(compte_id, req.utilisateur.id);
    if (!acces) {
      return res.status(404).json({ erreur: 'Compte introuvable.' });
    }

    const resultat = await pool.query(
      'SELECT * FROM budget_mensuel WHERE compte_id = $1 AND mois = $2 ORDER BY id',
      [compte_id, mois]
    );

    res.json(resultat.rows);
  } catch (erreur) {
    next(erreur);
  }
});

// POST /budgets/mensuel/generer - reconduction automatique depuis les budgets par défaut
router.post('/mensuel/generer', verifierToken, async (req, res, next) => {
  try {
    const { compte_id, mois } = req.body;

    if (!compte_id || !mois) {
      return res.status(400).json({ erreur: 'compte_id et mois sont requis.' });
    }

    const acces = await verifierAccesCompte(compte_id, req.utilisateur.id);
    if (!acces) {
      return res.status(404).json({ erreur: 'Compte introuvable.' });
    }

    const resultat = await pool.query(
      `INSERT INTO budget_mensuel (compte_id, categorie_id, mois, montant)
       SELECT compte_id, categorie_id, $2, montant_par_defaut
       FROM budget_defaut
       WHERE compte_id = $1
       ON CONFLICT (compte_id, categorie_id, mois) DO NOTHING
       RETURNING *`,
      [compte_id, mois]
    );

    res.status(201).json(resultat.rows);
  } catch (erreur) {
    next(erreur);
  }
});

// PUT /budgets/mensuel/:id - modification manuelle (montant et/ou catégorie)
router.put('/mensuel/:id', verifierToken, async (req, res, next) => {
  try {
    const { montant, categorie_id } = req.body;

    const existant = await pool.query('SELECT compte_id FROM budget_mensuel WHERE id = $1', [req.params.id]);
    if (existant.rows.length === 0) {
      return res.status(404).json({ erreur: 'Budget mensuel introuvable.' });
    }

    const acces = await verifierAccesCompte(existant.rows[0].compte_id, req.utilisateur.id);
    if (!acces) {
      return res.status(404).json({ erreur: 'Budget mensuel introuvable.' });
    }

    const resultat = await pool.query(
      'UPDATE budget_mensuel SET montant = $1, categorie_id = COALESCE($2, categorie_id) WHERE id = $3 RETURNING *',
      [montant, categorie_id || null, req.params.id]
    );

    res.json(resultat.rows[0]);
  } catch (erreur) {
    next(erreur);
  }
});

// DELETE /budgets/mensuel/:id
router.delete('/mensuel/:id', verifierToken, async (req, res, next) => {
  try {
    const existant = await pool.query('SELECT compte_id FROM budget_mensuel WHERE id = $1', [req.params.id]);
    if (existant.rows.length === 0) {
      return res.status(404).json({ erreur: 'Budget mensuel introuvable.' });
    }

    const acces = await verifierAccesCompte(existant.rows[0].compte_id, req.utilisateur.id);
    if (!acces) {
      return res.status(404).json({ erreur: 'Budget mensuel introuvable.' });
    }

    await pool.query('DELETE FROM budget_mensuel WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (erreur) {
    next(erreur);
  }
});

module.exports = router;