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

// GET /budgets/mensuel/suivi?compte_id=X&mois=2026-07-01 - budget vs dépenses réelles
router.get('/mensuel/suivi', verifierToken, async (req, res, next) => {
  try {
    const { compte_id, mois } = req.query;

    if (!compte_id || !mois) {
      return res.status(400).json({ erreur: 'Les paramètres compte_id et mois sont requis.' });
    }

    const acces = await verifierAccesCompte(compte_id, req.utilisateur.id);
    if (!acces) {
      return res.status(404).json({ erreur: 'Compte introuvable.' });
    }

    const finMois = new Date(new Date(mois).getFullYear(), new Date(mois).getMonth() + 1, 1)
      .toISOString()
      .slice(0, 10);

    const resultat = await pool.query(
      `SELECT
        bm.id, bm.categorie_id, c.nom AS categorie_nom, bm.montant AS budget,
        COALESCE(SUM(t.montant), 0) AS depense_reelle
      FROM budget_mensuel bm
      JOIN categories c ON c.id = bm.categorie_id
      LEFT JOIN LATERAL categorie_et_descendants(bm.categorie_id) descendants ON TRUE
      LEFT JOIN transactions t ON t.categorie_id = descendants.id
        AND t.compte_id = bm.compte_id
        AND t.type_transaction = 'depense'
        AND t.date >= $2 AND t.date < $3
      WHERE bm.compte_id = $1 AND bm.mois = $2
      GROUP BY bm.id, c.nom
      ORDER BY c.nom`,
      [compte_id, mois, finMois]
    );

    const suivi = resultat.rows.map((ligne) => ({
      ...ligne,
      depense_reelle: Number(ligne.depense_reelle),
      reste: ligne.budget - Number(ligne.depense_reelle),
    }));

    res.json(suivi);
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

// GET /budgets/solde-restant?compte_id=X&mois=2026-07-01 - solde perso disponible pour budgétiser
router.get('/solde-restant', verifierToken, async (req, res, next) => {
  try {
    const { compte_id, mois } = req.query;

    if (!compte_id || !mois) {
      return res.status(400).json({ erreur: 'Les paramètres compte_id et mois sont requis.' });
    }

    const acces = await verifierAccesCompte(compte_id, req.utilisateur.id);
    if (!acces) {
      return res.status(404).json({ erreur: 'Compte introuvable.' });
    }

    // Vérifie que c'est bien un compte courant perso (un seul propriétaire, type courant)
    const infoCompte = await pool.query(
      `SELECT c.type_compte, COUNT(cu.utilisateur_id) AS nb_proprietaires
      FROM comptes c
      JOIN compte_utilisateurs cu ON cu.compte_id = c.id
      WHERE c.id = $1
      GROUP BY c.type_compte`,
      [compte_id]
    );

    if (infoCompte.rows.length === 0 || Number(infoCompte.rows[0].nb_proprietaires) > 1) {
      return res.status(400).json({ erreur: 'Le solde restant ne s\'applique qu\'à un compte personnel.' });
    }

    if (infoCompte.rows[0].type_compte !== 'Compte courant') {
      return res.status(400).json({ erreur: 'Le solde restant ne s\'applique qu\'à un compte courant.' });
    }

    // Récupère la répartition active
    const repartitionActive = await pool.query(
      'SELECT revenus, resultat FROM repartitions_communes WHERE est_active = TRUE LIMIT 1'
    );

    if (repartitionActive.rows.length === 0) {
      return res.json({ solde_restant: null, message: 'Aucune répartition active.' });
    }

    const { revenus, resultat } = repartitionActive.rows[0];

    const revenuPerso = revenus
      .filter((r) => r.utilisateur_id === req.utilisateur.id)
      .reduce((total, r) => total + r.montant, 0);

    const ligneRepartition = resultat.repartition.find((r) => {
      const revenuCorrespondant = revenus.find((rv) => rv.personne === r.nom && rv.utilisateur_id === req.utilisateur.id);
      return revenuCorrespondant;
    });
    const partAVerser = ligneRepartition ? ligneRepartition.part_a_verser : 0;

    // Somme des budgets déjà définis ce mois-ci sur ce compte
    const budgetsExistants = await pool.query(
      'SELECT COALESCE(SUM(montant), 0) AS total FROM budget_mensuel WHERE compte_id = $1 AND mois = $2',
      [compte_id, mois]
    );
    const totalBudgete = Number(budgetsExistants.rows[0].total);

    const soldeRestant = revenuPerso - partAVerser - totalBudgete;

    res.json({
      solde_restant: soldeRestant,
      revenu_perso: revenuPerso,
      part_a_verser: partAVerser,
      total_budgete: totalBudgete,
    });
  } catch (erreur) {
    next(erreur);
  }
});

module.exports = router;