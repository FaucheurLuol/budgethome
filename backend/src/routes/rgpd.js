const express = require('express');
const pool = require('../db');
const verifierToken = require('../middleware/auth');
const bcrypt = require('bcrypt');
const { body } = require('express-validator');
const gererErreursValidation = require('../middleware/validation');

const router = express.Router();

/**
 * @swagger
 * /rgpd/export:
 *   get:
 *     summary: Exporte toutes les données personnelles de l'utilisateur (droit d'accès RGPD)
 *     tags: [RGPD]
 *     responses:
 *       200:
 *         description: Export JSON complet des données personnelles
 */
router.get('/export', verifierToken, async (req, res, next) => {
  try {
    const utilisateurId = req.utilisateur.id;

    const utilisateur = await pool.query(
      'SELECT id, nom, email, theme, foyer_id FROM utilisateurs WHERE id = $1',
      [utilisateurId]
    );

    const comptes = await pool.query(
      `SELECT c.* FROM comptes c
       JOIN compte_utilisateurs cu ON cu.compte_id = c.id
       WHERE cu.utilisateur_id = $1`,
      [utilisateurId]
    );

    const compteIds = comptes.rows.map((c) => c.id);

    const transactions = compteIds.length > 0
      ? await pool.query('SELECT * FROM transactions WHERE compte_id = ANY($1)', [compteIds])
      : { rows: [] };

    const categories = await pool.query('SELECT * FROM categories WHERE utilisateur_id = $1', [utilisateurId]);

    const objectifs = await pool.query('SELECT * FROM objectifs_epargne WHERE utilisateur_id = $1', [utilisateurId]);

    const objectifIds = objectifs.rows.map((o) => o.id);
    const allocations = objectifIds.length > 0
      ? await pool.query('SELECT * FROM allocations_epargne WHERE objectif_id = ANY($1)', [objectifIds])
      : { rows: [] };

    const budgetsDefaut = compteIds.length > 0
      ? await pool.query('SELECT * FROM budget_defaut WHERE compte_id = ANY($1)', [compteIds])
      : { rows: [] };

    const budgetsMensuels = compteIds.length > 0
      ? await pool.query('SELECT * FROM budget_mensuel WHERE compte_id = ANY($1)', [compteIds])
      : { rows: [] };

    const modeles = compteIds.length > 0
      ? await pool.query('SELECT * FROM modeles_transactions WHERE compte_id = ANY($1)', [compteIds])
      : { rows: [] };

    const repartitions = await pool.query(
      'SELECT * FROM repartitions_communes WHERE utilisateur_id = $1',
      [utilisateurId]
    );

    res.json({
      exporte_le: new Date().toISOString(),
      utilisateur: utilisateur.rows[0],
      comptes: comptes.rows,
      transactions: transactions.rows,
      categories: categories.rows,
      objectifs_epargne: objectifs.rows,
      allocations_epargne: allocations.rows,
      budgets_defaut: budgetsDefaut.rows,
      budgets_mensuels: budgetsMensuels.rows,
      modeles_transactions: modeles.rows,
      repartitions_communes: repartitions.rows,
    });
  } catch (erreur) {
    next(erreur);
  }
});

/**
 * @swagger
 * /rgpd/supprimer-compte:
 *   delete:
 *     summary: Supprime définitivement le compte utilisateur et toutes ses données personnelles (droit à l'effacement RGPD)
 *     tags: [RGPD]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [mot_de_passe, confirmation]
 *             properties:
 *               mot_de_passe:
 *                 type: string
 *               confirmation:
 *                 type: string
 *                 description: Doit valoir exactement "SUPPRIMER"
 *     responses:
 *       200:
 *         description: Compte supprimé
 *       400:
 *         description: Confirmation textuelle incorrecte
 *       401:
 *         description: Mot de passe incorrect
 *       409:
 *         description: Des comptes partagés ou communs empêchent la suppression, à quitter d'abord
 */
router.delete('/supprimer-compte', verifierToken, [
  body('mot_de_passe').notEmpty().withMessage('Le mot de passe est requis.'),
  body('confirmation').equals('SUPPRIMER').withMessage('Vous devez saisir exactement "SUPPRIMER" pour confirmer.'),
], gererErreursValidation, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { mot_de_passe } = req.body;
    const utilisateurId = req.utilisateur.id;

    const utilisateur = await client.query('SELECT mot_de_passe FROM utilisateurs WHERE id = $1', [utilisateurId]);
    const motDePasseValide = await bcrypt.compare(mot_de_passe, utilisateur.rows[0].mot_de_passe);
    if (!motDePasseValide) {
      return res.status(401).json({ erreur: 'Mot de passe incorrect.' });
    }

    // Blocage si l'utilisateur possède encore des comptes partagés ou communs
    const comptesPartages = await client.query(
      `SELECT c.nom FROM comptes c
       JOIN compte_utilisateurs cu ON cu.compte_id = c.id
       WHERE cu.utilisateur_id = $1
         AND (SELECT COUNT(*) FROM compte_utilisateurs cu2 WHERE cu2.compte_id = c.id) > 1`,
      [utilisateurId]
    );
    if (comptesPartages.rows.length > 0) {
      const noms = comptesPartages.rows.map((c) => c.nom).join(', ');
      return res.status(409).json({
        erreur: `Quittez d'abord vos comptes partagés avant de supprimer votre compte : ${noms}.`,
      });
    }

    const objectifsCommuns = await client.query(
      'SELECT nom FROM objectifs_epargne WHERE utilisateur_id = $1 AND foyer_id IS NOT NULL',
      [utilisateurId]
    );
    if (objectifsCommuns.rows.length > 0) {
      const noms = objectifsCommuns.rows.map((o) => o.nom).join(', ');
      return res.status(409).json({
        erreur: `Supprimez ou rendez individuels vos objectifs communs avant de supprimer votre compte : ${noms}.`,
      });
    }

    await client.query('BEGIN');

    // Comptes perso uniquement à ce stade (les partagés/communs ont été bloqués ci-dessus)
    const mesComptesPerso = await client.query(
      `SELECT c.id FROM comptes c
       JOIN compte_utilisateurs cu ON cu.compte_id = c.id
       WHERE cu.utilisateur_id = $1`,
      [utilisateurId]
    );
    const idsComptes = mesComptesPerso.rows.map((c) => c.id);

    if (idsComptes.length > 0) {
      await client.query('DELETE FROM allocations_epargne WHERE transaction_id IN (SELECT id FROM transactions WHERE compte_id = ANY($1))', [idsComptes]);
      await client.query('DELETE FROM transactions WHERE compte_id = ANY($1)', [idsComptes]);
      await client.query('DELETE FROM budget_mensuel WHERE compte_id = ANY($1)', [idsComptes]);
      await client.query('DELETE FROM budget_defaut WHERE compte_id = ANY($1)', [idsComptes]);
      await client.query('DELETE FROM modeles_transactions WHERE compte_id = ANY($1)', [idsComptes]);
      await client.query('DELETE FROM compte_utilisateurs WHERE compte_id = ANY($1)', [idsComptes]);
      await client.query('DELETE FROM comptes WHERE id = ANY($1)', [idsComptes]);
    }

    await client.query('DELETE FROM allocations_epargne WHERE objectif_id IN (SELECT id FROM objectifs_epargne WHERE utilisateur_id = $1)', [utilisateurId]);
    await client.query('DELETE FROM objectifs_epargne WHERE utilisateur_id = $1', [utilisateurId]);
    await client.query('DELETE FROM categories WHERE utilisateur_id = $1', [utilisateurId]);
    await client.query('DELETE FROM repartitions_communes WHERE utilisateur_id = $1', [utilisateurId]);
    await client.query('DELETE FROM utilisateurs WHERE id = $1', [utilisateurId]);

    await client.query('COMMIT');

    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    res.json({ message: 'Votre compte et toutes vos données ont été supprimés.' });
  } catch (erreur) {
    await client.query('ROLLBACK');
    next(erreur);
  } finally {
    client.release();
  }
});

module.exports = router;