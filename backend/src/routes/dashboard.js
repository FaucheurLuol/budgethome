const express = require('express');
const pool = require('../db');
const verifierToken = require('../middleware/auth');
const { query } = require('express-validator');
const gererErreursValidation = require('../middleware/validation');

const router = express.Router();

// GET /dashboard/soldes - solde réel actuel de chaque compte non archivé
/**
 * @swagger
 * /dashboard/soldes:
 *   get:
 *     summary: Solde réel et projeté actuel de chaque compte
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Liste des comptes avec solde_actuel et solde_projete
 */
router.get('/soldes', verifierToken, async (req, res, next) => {
  try {
    const resultat = await pool.query(
      `SELECT
         c.id, c.nom, c.type_compte,
         c.solde_initial + COALESCE(SUM(
           CASE WHEN t.est_simulee = FALSE THEN
             CASE WHEN t.type_transaction = 'revenu' THEN t.montant ELSE -t.montant END
           ELSE 0 END
         ), 0) AS solde_actuel,
         c.solde_initial + COALESCE(SUM(
           CASE WHEN t.type_transaction = 'revenu' THEN t.montant ELSE -t.montant END
         ), 0) AS solde_projete
       FROM comptes c
       JOIN compte_utilisateurs cu ON cu.compte_id = c.id
       LEFT JOIN transactions t ON t.compte_id = c.id
       WHERE cu.utilisateur_id = $1 AND cu.est_archive = FALSE
       GROUP BY c.id
       ORDER BY c.est_favori DESC, c.nom`,
      [req.utilisateur.id]
    );

    res.json(resultat.rows.map((r) => ({
      ...r,
      solde_actuel: Number(r.solde_actuel),
      solde_projete: Number(r.solde_projete),
    })));
  } catch (erreur) {
    next(erreur);
  }
});

/**
 * @swagger
 * /dashboard/evolution-comptes-courants:
 *   get:
 *     summary: Solde de fin de mois sur N mois, par compte courant
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: mois
 *         schema:
 *           type: integer
 *           default: 12
 *         description: Nombre de mois d'historique à renvoyer
 *     responses:
 *       200:
 *         description: Points d'évolution par compte courant
 */
router.get('/evolution-comptes-courants', verifierToken, [
  query('mois').optional().isInt({ min: 1, max: 60 }).withMessage('Le paramètre mois doit être un entier entre 1 et 60.'),
], gererErreursValidation, async (req, res, next) => {
  try {
    const nombreMois = parseInt(req.query.mois, 10) || 12;

    const resultat = await pool.query(
      `WITH mois_serie AS (
         SELECT generate_series(
           date_trunc('month', CURRENT_DATE) - ($2::int - 1) * INTERVAL '1 month',
           date_trunc('month', CURRENT_DATE),
           INTERVAL '1 month'
         )::date AS mois_debut
       ),
       comptes_courants AS (
         SELECT c.id, c.nom, c.solde_initial
         FROM comptes c
         JOIN compte_utilisateurs cu ON cu.compte_id = c.id
         WHERE cu.utilisateur_id = $1 AND c.type_compte = 'Compte courant' AND cu.est_archive = FALSE
       )
       SELECT
         cc.id AS compte_id, cc.nom,
         ms.mois_debut,
         cc.solde_initial + COALESCE(SUM(
           CASE WHEN t.type_transaction = 'revenu' THEN t.montant ELSE -t.montant END
         ) FILTER (WHERE t.date < (ms.mois_debut + INTERVAL '1 month')), 0) AS solde
       FROM comptes_courants cc
       CROSS JOIN mois_serie ms
       LEFT JOIN transactions t ON t.compte_id = cc.id AND t.est_simulee = FALSE
       GROUP BY cc.id, cc.nom, cc.solde_initial, ms.mois_debut
       ORDER BY cc.id, ms.mois_debut`,
      [req.utilisateur.id, nombreMois]
    );

    const parComptes = {};
    resultat.rows.forEach((ligne) => {
      if (!parComptes[ligne.compte_id]) {
        parComptes[ligne.compte_id] = { compte_id: ligne.compte_id, nom: ligne.nom, points: [] };
      }
      const [annee, moisNum] = ligne.mois_debut.split('-').map(Number);
      const dateAffichage = new Date(annee, moisNum - 1, 1);
      parComptes[ligne.compte_id].points.push({
        mois: dateAffichage.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
        solde: Number(ligne.solde),
      });
    });

    res.json(Object.values(parComptes));
  } catch (erreur) {
    next(erreur);
  }
});

// GET /dashboard/repartition?type=depense&periode=mois&compte_id=X (optionnel)
/**
 * @swagger
 * /dashboard/repartition:
 *   get:
 *     summary: Répartition des montants par catégorie parente (pour les camemberts)
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [depense, revenu]
 *       - in: query
 *         name: periode
 *         required: true
 *         schema:
 *           type: string
 *           enum: [mois, annee]
 *       - in: query
 *         name: compte_id
 *         schema:
 *           type: integer
 *         description: Optionnel, filtre sur un compte précis
 *     responses:
 *       200:
 *         description: Répartition par catégorie (Non classé exclu)
 *       400:
 *         description: Paramètres type/periode invalides
 */
router.get('/repartition', verifierToken, [
  query('type').isIn(['depense', 'revenu']).withMessage('Le paramètre type doit être "depense" ou "revenu".'),
  query('periode').isIn(['mois', 'annee']).withMessage('Le paramètre periode doit être "mois" ou "annee".'),
  query('compte_id').optional().isInt().withMessage('compte_id doit être un identifiant valide.'),
], gererErreursValidation, async (req, res, next) => {
  try {
    const { type, periode, compte_id } = req.query;

    const maintenant = new Date();
    let dateDebut;
    if (periode === 'mois') {
      dateDebut = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1).toISOString().slice(0, 10);
    } else {
      dateDebut = new Date(maintenant.getFullYear(), 0, 1).toISOString().slice(0, 10);
    }

    const params = [req.utilisateur.id, type, dateDebut];
    let filtreCompte = '';
    if (compte_id) {
      filtreCompte = 'AND t.compte_id = $4';
      params.push(compte_id);
    }

    const resultat = await pool.query(
      `SELECT COALESCE(parent.nom, c.nom) AS categorie, SUM(t.montant) AS total
       FROM transactions t
       JOIN categories c ON c.id = t.categorie_id
       LEFT JOIN categories parent ON parent.id = c.parent_id
       JOIN compte_utilisateurs cu ON cu.compte_id = t.compte_id
       WHERE cu.utilisateur_id = $1 AND t.type_transaction = $2
         AND t.est_simulee = FALSE AND t.date >= $3
         AND c.nom != 'Non classé'
         AND (parent.nom IS NULL OR parent.nom != 'Non classé')
         ${filtreCompte}
       GROUP BY COALESCE(parent.nom, c.nom)
       ORDER BY total DESC`,
      params
    );

    res.json(resultat.rows.map((r) => ({ categorie: r.categorie, total: Number(r.total) })));
  } catch (erreur) {
    next(erreur);
  }
});

// GET /dashboard/budgets-du-mois - suivi budgétaire consolidé, tous comptes confondus
/**
 * @swagger
 * /dashboard/budgets-du-mois:
 *   get:
 *     summary: Suivi budgétaire consolidé, tous comptes confondus, pour le mois en cours
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Détail budget/dépensé/reste par compte et catégorie
 */
router.get('/budgets-du-mois', verifierToken, async (req, res, next) => {
  try {
    const maintenant = new Date();
    const annee = maintenant.getFullYear();
    const moisNumero = maintenant.getMonth();

    const mois = `${annee}-${String(moisNumero + 1).padStart(2, '0')}-01`;
    const finMoisDate = new Date(annee, moisNumero + 1, 1);
    const finMois = `${finMoisDate.getFullYear()}-${String(finMoisDate.getMonth() + 1).padStart(2, '0')}-01`;

    const resultat = await pool.query(
      `SELECT
         bm.id, bm.compte_id, co.nom AS compte_nom, c.nom AS categorie_nom, bm.montant AS budget,
         COALESCE(SUM(t.montant), 0) AS depense_reelle
       FROM budget_mensuel bm
       JOIN categories c ON c.id = bm.categorie_id
       JOIN comptes co ON co.id = bm.compte_id
       JOIN compte_utilisateurs cu ON cu.compte_id = bm.compte_id
       LEFT JOIN LATERAL categorie_et_descendants(bm.categorie_id) descendants ON TRUE
       LEFT JOIN transactions t ON t.categorie_id = descendants.id
         AND t.compte_id = bm.compte_id
         AND t.type_transaction = 'depense'
         AND t.est_simulee = FALSE
         AND t.date >= $2 AND t.date < $3
       WHERE cu.utilisateur_id = $1 AND bm.mois = $2
       GROUP BY bm.id, co.nom, c.nom
       ORDER BY co.nom, c.nom`,
      [req.utilisateur.id, mois, finMois]
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

module.exports = router;