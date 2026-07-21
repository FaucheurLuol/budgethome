const express = require('express');
const pool = require('../db');
const verifierToken = require('../middleware/auth');

const router = express.Router();

// GET /comptes - liste les comptes visibles par l'utilisateur connecté (non archivés par lui)
/**
 * @swagger
 * /comptes:
 *   get:
 *     summary: Liste les comptes actifs de l'utilisateur (favoris en premier)
 *     tags: [Comptes]
 *     responses:
 *       200:
 *         description: Liste des comptes
 */
router.get('/', verifierToken, async (req, res, next) => {
  try {
    const resultat = await pool.query(
      `SELECT c.*,
         (SELECT COUNT(*) FROM compte_utilisateurs cu2 WHERE cu2.compte_id = c.id) AS nb_proprietaires
       FROM comptes c
       JOIN compte_utilisateurs cu ON c.id = cu.compte_id
       WHERE cu.utilisateur_id = $1 AND cu.est_archive = FALSE
       ORDER BY c.est_favori DESC, c.nom`,
      [req.utilisateur.id]
    );
    res.json(resultat.rows.map((r) => ({ ...r, nb_proprietaires: Number(r.nb_proprietaires) })));
  } catch (erreur) {
    next(erreur);
  }
});

// GET /comptes/archives - recupère le nombre de propriétaire des comptes archivés
/**
 * @swagger
 * /comptes/archives:
 *   get:
 *     summary: Liste les comptes archivés par l'utilisateur
 *     tags: [Comptes]
 *     responses:
 *       200:
 *         description: Liste des comptes archivés
 */
router.get('/archives', verifierToken, async (req, res, next) => {
  try {
    const resultat = await pool.query(
      `SELECT c.*,
         (SELECT COUNT(*) FROM compte_utilisateurs cu2 WHERE cu2.compte_id = c.id) AS nb_proprietaires
       FROM comptes c
       JOIN compte_utilisateurs cu ON c.id = cu.compte_id
       WHERE cu.utilisateur_id = $1 AND cu.est_archive = TRUE
       ORDER BY c.nom`,
      [req.utilisateur.id]
    );
    res.json(resultat.rows.map((r) => ({ ...r, nb_proprietaires: Number(r.nb_proprietaires) })));
  } catch (erreur) {
    next(erreur);
  }
});

// GET /comptes/:id - détail d'un compte (si l'utilisateur y a accès)
/**
 * @swagger
 * /comptes/{id}:
 *   get:
 *     summary: Détail d'un compte
 *     tags: [Comptes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Détail du compte
 *       404:
 *         description: Compte introuvable
 */
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

// POST /comptes/:id/quitter - je quitte ce compte partagé (il devient perso pour l'autre)
/**
 * @swagger
 * /comptes/{id}/quitter:
 *   post:
 *     summary: Quitte un compte partagé (reste perso pour l'autre propriétaire)
 *     tags: [Comptes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Compte quitté
 *       400:
 *         description: Seul propriétaire, utiliser la suppression définitive
 *       404:
 *         description: Compte introuvable
 */
router.post('/:id/quitter', verifierToken, async (req, res, next) => {
  try {
    const proprietaires = await pool.query(
      'SELECT COUNT(*) AS total FROM compte_utilisateurs WHERE compte_id = $1',
      [req.params.id]
    );
    if (Number(proprietaires.rows[0].total) <= 1) {
      return res.status(400).json({ erreur: 'Vous êtes le seul propriétaire : utilisez la suppression définitive plutôt que quitter.' });
    }

    const resultat = await pool.query(
      'DELETE FROM compte_utilisateurs WHERE compte_id = $1 AND utilisateur_id = $2 RETURNING *',
      [req.params.id, req.utilisateur.id]
    );
    if (resultat.rows.length === 0) {
      return res.status(404).json({ erreur: 'Compte introuvable.' });
    }

    res.json({ message: 'Vous avez quitté ce compte.' });
  } catch (erreur) {
    next(erreur);
  }
});

// POST /comptes/:id/inviter - ajoute un utilisateur (de mon foyer) à un compte que je possède déjà
/**
 * @swagger
 * /comptes/{id}/inviter:
 *   post:
 *     summary: Ajoute un membre du foyer à un compte courant (le rend partagé)
 *     tags: [Comptes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [utilisateur_id]
 *             properties:
 *               utilisateur_id:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Utilisateur ajouté au compte
 *       400:
 *         description: Déjà propriétaire, ou pas un compte courant, ou hors du foyer
 *       404:
 *         description: Compte introuvable
 */
router.post('/:id/inviter', verifierToken, async (req, res, next) => {
  try {
    const { utilisateur_id } = req.body;

    if (!utilisateur_id) {
      return res.status(400).json({ erreur: 'utilisateur_id est requis.' });
    }

    const acces = await pool.query(
      'SELECT 1 FROM compte_utilisateurs WHERE compte_id = $1 AND utilisateur_id = $2',
      [req.params.id, req.utilisateur.id]
    );
    if (acces.rows.length === 0) {
      return res.status(404).json({ erreur: 'Compte introuvable.' });
    }

    const infoCompte = await pool.query('SELECT type_compte FROM comptes WHERE id = $1', [req.params.id]);
    if (infoCompte.rows[0].type_compte !== 'Compte courant') {
      return res.status(400).json({ erreur: 'Seul un compte courant peut être partagé par invitation.' });
    }

    const dejaProprietaire = await pool.query(
      'SELECT 1 FROM compte_utilisateurs WHERE compte_id = $1 AND utilisateur_id = $2',
      [req.params.id, utilisateur_id]
    );
    if (dejaProprietaire.rows.length > 0) {
      return res.status(400).json({ erreur: 'Cette personne a déjà accès à ce compte.' });
    }

    // Vérifie que la personne à inviter fait bien partie de mon foyer
    const moi = await pool.query('SELECT foyer_id FROM utilisateurs WHERE id = $1', [req.utilisateur.id]);
    const cible = await pool.query('SELECT foyer_id FROM utilisateurs WHERE id = $1', [utilisateur_id]);

    if (!moi.rows[0].foyer_id || moi.rows[0].foyer_id !== cible.rows[0]?.foyer_id) {
      return res.status(403).json({ erreur: 'Vous ne pouvez inviter que des membres de votre foyer.' });
    }

    const resultat = await pool.query(
      'INSERT INTO compte_utilisateurs (compte_id, utilisateur_id, est_archive) VALUES ($1, $2, FALSE) RETURNING *',
      [req.params.id, utilisateur_id]
    );

    res.status(201).json(resultat.rows[0]);
  } catch (erreur) {
    next(erreur);
  }
});

// POST /comptes - création d'un compte perso ou partagé
/**
 * @swagger
 * /comptes:
 *   post:
 *     summary: Crée un compte (personnel ou partagé)
 *     tags: [Comptes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nom, type_compte, solde_initial]
 *             properties:
 *               nom:
 *                 type: string
 *               type_compte:
 *                 type: string
 *                 enum: [Compte courant, Livret A, PEL, LDD, Action, Crypto]
 *               solde_initial:
 *                 type: integer
 *                 description: Montant en centimes
 *               partage:
 *                 type: boolean
 *               utilisateurs_associes:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       201:
 *         description: Compte créé
 */
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
/**
 * @swagger
 * /comptes/{id}:
 *   put:
 *     summary: Modifie un compte (nom, type)
 *     tags: [Comptes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nom:
 *                 type: string
 *               type_compte:
 *                 type: string
 *     responses:
 *       200:
 *         description: Compte modifié
 *       404:
 *         description: Compte introuvable
 */
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

// PATCH /comptes/:id/archiver
/**
 * @swagger
 * /comptes/{id}/archiver:
 *   patch:
 *     summary: Archive le compte pour l'utilisateur courant uniquement
 *     tags: [Comptes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Compte archivé
 *       404:
 *         description: Compte introuvable
 */
router.patch('/:id/archiver', verifierToken, async (req, res, next) => {
  try {
    const resultat = await pool.query(
      'UPDATE compte_utilisateurs SET est_archive = TRUE WHERE compte_id = $1 AND utilisateur_id = $2 RETURNING *',
      [req.params.id, req.utilisateur.id]
    );
    if (resultat.rows.length === 0) {
      return res.status(404).json({ erreur: 'Compte introuvable.' });
    }
    res.json({ message: 'Compte archivé.' });
  } catch (erreur) {
    next(erreur);
  }
});

// PATCH /comptes/:id/desarchiver
/**
 * @swagger
 * /comptes/{id}/desarchiver:
 *   patch:
 *     summary: Désarchive le compte pour l'utilisateur courant
 *     tags: [Comptes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Compte désarchivé
 *       404:
 *         description: Compte introuvable
 */
router.patch('/:id/desarchiver', verifierToken, async (req, res, next) => {
  try {
    const resultat = await pool.query(
      'UPDATE compte_utilisateurs SET est_archive = FALSE WHERE compte_id = $1 AND utilisateur_id = $2 RETURNING *',
      [req.params.id, req.utilisateur.id]
    );
    if (resultat.rows.length === 0) {
      return res.status(404).json({ erreur: 'Compte introuvable.' });
    }
    const compte = await pool.query('SELECT * FROM comptes WHERE id = $1', [req.params.id]);
    res.json(compte.rows[0]);
  } catch (erreur) {
    next(erreur);
  }
});

// PATCH /comptes/:id/favori - bascule le statut favori d'un compte
/**
 * @swagger
 * /comptes/{id}/favori:
 *   patch:
 *     summary: Bascule le statut favori d'un compte
 *     tags: [Comptes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Statut favori mis à jour
 *       404:
 *         description: Compte introuvable
 */
router.patch('/:id/favori', verifierToken, async (req, res, next) => {
  try {
    const verifAcces = await pool.query(
      'SELECT 1 FROM compte_utilisateurs WHERE compte_id = $1 AND utilisateur_id = $2',
      [req.params.id, req.utilisateur.id]
    );
    if (verifAcces.rows.length === 0) {
      return res.status(404).json({ erreur: 'Compte introuvable.' });
    }

    const resultat = await pool.query(
      'UPDATE comptes SET est_favori = NOT est_favori WHERE id = $1 RETURNING *',
      [req.params.id]
    );

    res.json(resultat.rows[0]);
  } catch (erreur) {
    next(erreur);
  }
});

// DELETE /comptes/:id - suppression définitive (uniquement si aucune transaction liée)
/**
 * @swagger
 * /comptes/{id}:
 *   delete:
 *     summary: Supprime un compte (refusée si transactions existantes)
 *     tags: [Comptes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Supprimé
 *       404:
 *         description: Compte introuvable
 *       409:
 *         description: Des transactions existent encore
 */
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

// DELETE /comptes/:id/definitif - suppression définitive
/**
 * @swagger
 * /comptes/{id}/definitif:
 *   delete:
 *     summary: Supprime définitivement un compte (transactions, budgets, modèles associés)
 *     tags: [Comptes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Supprimé définitivement
 *       400:
 *         description: Compte partagé, doit être quitté au préalable
 *       404:
 *         description: Compte introuvable
 */
router.delete('/:id/definitif', verifierToken, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const verifAcces = await client.query(
      'SELECT 1 FROM compte_utilisateurs WHERE compte_id = $1 AND utilisateur_id = $2',
      [req.params.id, req.utilisateur.id]
    );
    if (verifAcces.rows.length === 0) {
      return res.status(404).json({ erreur: 'Compte introuvable.' });
    }

    const proprietaires = await client.query(
      'SELECT COUNT(*) AS total FROM compte_utilisateurs WHERE compte_id = $1',
      [req.params.id]
    );
    if (Number(proprietaires.rows[0].total) > 1) {
      return res.status(400).json({ erreur: 'Ce compte est partagé. Quittez-le d\'abord, ou attendez que l\'autre personne le quitte, avant de le supprimer définitivement.' });
    }

    await client.query('BEGIN');

    // Les allocations d'épargne liées aux transactions de ce compte disparaissent
    // automatiquement grâce à ON DELETE CASCADE sur allocations_epargne.transaction_id
    await client.query('DELETE FROM transactions WHERE compte_id = $1', [req.params.id]);
    await client.query('DELETE FROM budget_mensuel WHERE compte_id = $1', [req.params.id]);
    await client.query('DELETE FROM budget_defaut WHERE compte_id = $1', [req.params.id]);
    await client.query('DELETE FROM modeles_transactions WHERE compte_id = $1', [req.params.id]);
    await client.query('DELETE FROM compte_utilisateurs WHERE compte_id = $1', [req.params.id]);
    await client.query('DELETE FROM comptes WHERE id = $1', [req.params.id]);

    await client.query('COMMIT');
    res.status(204).send();
  } catch (erreur) {
    await client.query('ROLLBACK');
    next(erreur);
  } finally {
    client.release();
  }
});

module.exports = router;