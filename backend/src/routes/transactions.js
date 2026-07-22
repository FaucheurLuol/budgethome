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

// GET /transactions?compte_id=X - liste les transactions d'un compte donné
/**
 * @swagger
 * /transactions:
 *   get:
 *     summary: Liste les transactions d'un compte, avec filtres optionnels
 *     tags: [Transactions]
 *     parameters:
 *       - in: query
 *         name: compte_id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: mois
 *         schema:
 *           type: string
 *           example: "2026-07"
 *       - in: query
 *         name: categorie_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: recherche
 *         schema:
 *           type: string
 *         description: Recherche texte dans la description
 *     responses:
 *       200:
 *         description: Liste des transactions (avec allocation d'épargne éventuelle)
 *       404:
 *         description: Compte introuvable
 */
router.get('/', verifierToken, async (req, res, next) => {
  try {
    const { compte_id, mois, categorie_id, recherche } = req.query;

    if (!compte_id) {
      return res.status(400).json({ erreur: 'Le paramètre compte_id est requis.' });
    }

    const acces = await verifierAccesCompte(compte_id, req.utilisateur.id);
    if (!acces) {
      return res.status(404).json({ erreur: 'Compte introuvable.' });
    }

    const conditions = ['t.compte_id = $1'];
    const params = [compte_id];

    if (mois) {
      const [annee, moisNum] = mois.split('-');
      const debutMois = `${annee}-${moisNum}-01`;
      const finMoisDate = new Date(Number(annee), Number(moisNum), 1);
      const finMois = `${finMoisDate.getFullYear()}-${String(finMoisDate.getMonth() + 1).padStart(2, '0')}-01`;
      params.push(debutMois, finMois);
      conditions.push(`t.date >= $${params.length - 1} AND t.date < $${params.length}`);
    }

    if (categorie_id) {
      params.push(categorie_id);
      conditions.push(`t.categorie_id = $${params.length}`);
    }

    if (recherche) {
      params.push(`%${recherche}%`);
      conditions.push(`t.description ILIKE $${params.length}`);
    }

    const resultat = await pool.query(
      `SELECT
        t.*,
        c.est_recurrente AS categorie_recurrente,
        a.objectif_id, o.nom AS objectif_nom, a.montant_fleche
      FROM transactions t
      JOIN categories c ON c.id = t.categorie_id
      LEFT JOIN allocations_epargne a ON a.transaction_id = t.id
      LEFT JOIN objectifs_epargne o ON o.id = a.objectif_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY t.date DESC, t.id DESC`,
      params
    );

    res.json(resultat.rows);
  } catch (erreur) {
    next(erreur);
  }
});

// POST /transactions - création
/**
 * @swagger
 * /transactions:
 *   post:
 *     summary: Crée une transaction classique
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [date, montant, moyen_paiement, categorie_id, compte_id, type_transaction]
 *             properties:
 *               date:
 *                 type: string
 *                 example: "2026-07-16"
 *               montant:
 *                 type: integer
 *                 description: En centimes, doit être > 0
 *               description:
 *                 type: string
 *                 nullable: true
 *               moyen_paiement:
 *                 type: string
 *                 enum: [CB, Virement, Especes, Prelevement, Cheque]
 *               categorie_id:
 *                 type: integer
 *               compte_id:
 *                 type: integer
 *               type_transaction:
 *                 type: string
 *                 enum: [depense, revenu]
 *               est_simulee:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Transaction créée
 *       400:
 *         description: Champs manquants ou montant invalide
 *       404:
 *         description: Compte introuvable
 */
router.post('/', verifierToken, async (req, res, next) => {
  try {
    const {
      date, montant, description, moyen_paiement,
      categorie_id, compte_id, type_transaction, est_recurrente, est_simulee
    } = req.body;

    if (!date || !montant || !moyen_paiement || !categorie_id || !compte_id || !type_transaction) {
      return res.status(400).json({ erreur: 'Champs obligatoires manquants.' });
    }

    const acces = await verifierAccesCompte(compte_id, req.utilisateur.id);
    if (!acces) {
      return res.status(404).json({ erreur: 'Compte introuvable.' });
    }

    if (montant <= 0) {
      return res.status(400).json({ erreur: 'Le montant doit être supérieur à zéro.' });
    }

    const resultat = await pool.query(
      `INSERT INTO transactions
       (date, montant, description, moyen_paiement, categorie_id, compte_id, type_transaction, est_recurrente, est_simulee)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [date, montant, description || null, moyen_paiement, categorie_id, compte_id, type_transaction, est_recurrente || false, est_simulee || false]
    );

    res.status(201).json(resultat.rows[0]);
  } catch (erreur) {
    next(erreur);
  }
});

// PUT /transactions/:id - modification
/**
 * @swagger
 * /transactions/{id}:
 *   put:
 *     summary: Modifie une transaction classique
 *     tags: [Transactions]
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
 *               date:
 *                 type: string
 *               montant:
 *                 type: integer
 *               description:
 *                 type: string
 *                 nullable: true
 *               moyen_paiement:
 *                 type: string
 *               categorie_id:
 *                 type: integer
 *               type_transaction:
 *                 type: string
 *               est_recurrente:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Transaction modifiée
 *       400:
 *         description: Montant invalide
 *       404:
 *         description: Transaction introuvable
 */
router.put('/:id', verifierToken, async (req, res, next) => {
  try {
    const {
      date, montant, description, moyen_paiement,
      categorie_id, type_transaction, est_recurrente
    } = req.body;

    if (montant !== undefined && montant <= 0) {
      return res.status(400).json({ erreur: 'Le montant doit être supérieur à zéro.' });
    }

    const resultatExistant = await pool.query(
      'SELECT compte_id FROM transactions WHERE id = $1',
      [req.params.id]
    );
    if (resultatExistant.rows.length === 0) {
      return res.status(404).json({ erreur: 'Transaction introuvable.' });
    }

    const acces = await verifierAccesCompte(resultatExistant.rows[0].compte_id, req.utilisateur.id);
    if (!acces) {
      return res.status(404).json({ erreur: 'Transaction introuvable.' });
    }

    const resultat = await pool.query(
      `UPDATE transactions
       SET date = $1, montant = $2, description = $3, moyen_paiement = $4,
           categorie_id = $5, type_transaction = $6, est_recurrente = $7
       WHERE id = $8
       RETURNING *`,
      [date, montant, description || null, moyen_paiement, categorie_id, type_transaction, est_recurrente || false, req.params.id]
    );

    res.json(resultat.rows[0]);
  } catch (erreur) {
    next(erreur);
  }
});

// DELETE /transactions/:id - suppression
/**
 * @swagger
 * /transactions/{id}:
 *   delete:
 *     summary: Supprime une transaction
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Supprimée
 *       404:
 *         description: Transaction introuvable
 */
router.delete('/:id', verifierToken, async (req, res, next) => {
  try {
    const resultatExistant = await pool.query(
      'SELECT compte_id FROM transactions WHERE id = $1',
      [req.params.id]
    );
    if (resultatExistant.rows.length === 0) {
      return res.status(404).json({ erreur: 'Transaction introuvable.' });
    }

    const acces = await verifierAccesCompte(resultatExistant.rows[0].compte_id, req.utilisateur.id);
    if (!acces) {
      return res.status(404).json({ erreur: 'Transaction introuvable.' });
    }

    await pool.query('DELETE FROM transactions WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (erreur) {
    next(erreur);
  }
});

// POST /transactions/retrait-epargne - retrait d'un compte d'épargne, flèchage obligatoire
/**
 * @swagger
 * /transactions/retrait-epargne:
 *   post:
 *     summary: Retrait d'un compte d'épargne, flèchage obligatoire vers un objectif
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [date, montant, moyen_paiement, categorie_id, compte_id, objectif_id, montant_fleche]
 *             properties:
 *               date:
 *                 type: string
 *               montant:
 *                 type: integer
 *               description:
 *                 type: string
 *                 nullable: true
 *               moyen_paiement:
 *                 type: string
 *               categorie_id:
 *                 type: integer
 *               compte_id:
 *                 type: integer
 *               objectif_id:
 *                 type: integer
 *               montant_fleche:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Retrait effectué et fléché
 *       400:
 *         description: Champs manquants, montant invalide, ou objectif requis
 *       404:
 *         description: Compte ou objectif introuvable
 */
router.post('/retrait-epargne', verifierToken, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const {
      date, montant, description, moyen_paiement,
      categorie_id, compte_id, objectif_id, montant_fleche
    } = req.body;

    if (!date || !montant || !moyen_paiement || !categorie_id || !compte_id || !objectif_id || !montant_fleche) {
      return res.status(400).json({ erreur: 'Tous les champs, y compris objectif_id, sont requis pour un retrait d\'épargne.' });
    }

    if (montant <= 0) {
      return res.status(400).json({ erreur: 'Le montant doit être supérieur à zéro.' });
    }

    const acces = await client.query(
      `SELECT c.type_compte
       FROM comptes c
       JOIN compte_utilisateurs cu ON cu.compte_id = c.id
       WHERE c.id = $1 AND cu.utilisateur_id = $2`,
      [compte_id, req.utilisateur.id]
    );
    if (acces.rows.length === 0) {
      return res.status(404).json({ erreur: 'Compte introuvable.' });
    }
    if (acces.rows[0].type_compte === 'Compte courant') {
      return res.status(400).json({ erreur: 'Impossible de flécher un retrait depuis un compte courant.' });
    }

    const foyerRes = await client.query('SELECT foyer_id FROM utilisateurs WHERE id = $1', [req.utilisateur.id]);
    const foyerId = foyerRes.rows[0].foyer_id;

    const verifObjectif = await client.query(
      'SELECT 1 FROM objectifs_epargne WHERE id = $1 AND (foyer_id = $2 OR (utilisateur_id = $3 AND foyer_id IS NULL))',
      [objectif_id, foyerId, req.utilisateur.id]
    );
    if (verifObjectif.rows.length === 0) {
      return res.status(404).json({ erreur: 'Objectif introuvable.' });
    }

    await client.query('BEGIN');

    const resultatTransaction = await client.query(
      `INSERT INTO transactions
       (date, montant, description, moyen_paiement, categorie_id, compte_id, type_transaction)
       VALUES ($1, $2, $3, $4, $5, $6, 'depense')
       RETURNING *`,
      [date, montant, description || null, moyen_paiement, categorie_id, compte_id]
    );
    const transaction = resultatTransaction.rows[0];

    const resultatAllocation = await client.query(
      'INSERT INTO allocations_epargne (transaction_id, objectif_id, montant_fleche) VALUES ($1, $2, $3) RETURNING *',
      [transaction.id, objectif_id, montant]
    );

    await client.query('COMMIT');
    res.status(201).json({ transaction, allocation: resultatAllocation.rows[0] });
  } catch (erreur) {
    await client.query('ROLLBACK');
    next(erreur);
  } finally {
    client.release();
  }
});

// POST /transactions/virement-epargne - dépense compte courant + dépôt automatique sur un livret
/**
 * @swagger
 * /transactions/virement-epargne:
 *   post:
 *     summary: Virement automatisé compte courant vers épargne (catégorie "Épargne" auto-gérée)
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [date, montant, compte_courant_id, compte_epargne_id]
 *             properties:
 *               date:
 *                 type: string
 *               montant:
 *                 type: integer
 *               description:
 *                 type: string
 *                 nullable: true
 *               compte_courant_id:
 *                 type: integer
 *               compte_epargne_id:
 *                 type: integer
 *               objectif_id:
 *                 type: integer
 *                 nullable: true
 *                 description: Optionnel pour un dépôt
 *               montant_fleche:
 *                 type: integer
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Virement effectué (dépense + dépôt, allocation optionnelle)
 *       400:
 *         description: Champs manquants ou montant invalide
 *       404:
 *         description: Compte ou objectif introuvable
 */
router.post('/virement-epargne', verifierToken, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const {
      date, montant, description, compte_courant_id,
      compte_epargne_id, objectif_id, montant_fleche
    } = req.body;

    if (!date || !montant || !compte_courant_id || !compte_epargne_id) {
      return res.status(400).json({ erreur: 'Champs obligatoires manquants.' });
    }

    if (montant <= 0) {
      return res.status(400).json({ erreur: 'Le montant doit être supérieur à zéro.' });
    }

    const accesCourant = await client.query(
      `SELECT c.type_compte FROM comptes c
       JOIN compte_utilisateurs cu ON cu.compte_id = c.id
       WHERE c.id = $1 AND cu.utilisateur_id = $2`,
      [compte_courant_id, req.utilisateur.id]
    );
    if (accesCourant.rows.length === 0) {
      return res.status(404).json({ erreur: 'Compte courant introuvable.' });
    }
    if (accesCourant.rows[0].type_compte !== 'Compte courant') {
      return res.status(400).json({ erreur: 'Le compte source doit être un compte courant.' });
    }

    const accesEpargne = await client.query(
      `SELECT c.type_compte FROM comptes c
       JOIN compte_utilisateurs cu ON cu.compte_id = c.id
       WHERE c.id = $1 AND cu.utilisateur_id = $2`,
      [compte_epargne_id, req.utilisateur.id]
    );
    if (accesEpargne.rows.length === 0) {
      return res.status(404).json({ erreur: 'Compte d\'épargne introuvable.' });
    }
    if (accesEpargne.rows[0].type_compte === 'Compte courant') {
      return res.status(400).json({ erreur: 'Le compte destination doit être un compte d\'épargne.' });
    }

    if (objectif_id) {
      const foyerRes = await client.query('SELECT foyer_id FROM utilisateurs WHERE id = $1', [req.utilisateur.id]);
      const foyerId = foyerRes.rows[0].foyer_id;

      const verifObjectif = await client.query(
        'SELECT 1 FROM objectifs_epargne WHERE id = $1 AND (foyer_id = $2 OR (utilisateur_id = $3 AND foyer_id IS NULL))',
        [objectif_id, foyerId, req.utilisateur.id]
      );
      if (verifObjectif.rows.length === 0) {
        return res.status(404).json({ erreur: 'Objectif introuvable.' });
      }
    }

    // Catégorie "Épargne" dédiée côté compte courant (dépense)
    const categorieEpargneCourant = await client.query(
      `SELECT id FROM categories
       WHERE utilisateur_id = $1 AND type_categorie = 'depense' AND nom = 'Épargne'
       LIMIT 1`,
      [req.utilisateur.id]
    );
    let categorieDepenseId;
    if (categorieEpargneCourant.rows.length > 0) {
      categorieDepenseId = categorieEpargneCourant.rows[0].id;
    } else {
      const nouvelleCategorieDepense = await client.query(
        `INSERT INTO categories (nom, utilisateur_id, type_categorie) VALUES ('Épargne', $1, 'depense') RETURNING id`,
        [req.utilisateur.id]
      );
      categorieDepenseId = nouvelleCategorieDepense.rows[0].id;
    }

    // Catégorie "Épargne" dédiée côté livret (revenu)
    const categorieEpargneLivret = await client.query(
      `SELECT id FROM categories
       WHERE utilisateur_id = $1 AND type_categorie = 'revenu' AND nom = 'Épargne'
       LIMIT 1`,
      [req.utilisateur.id]
    );
    let categorieRevenuId;
    if (categorieEpargneLivret.rows.length > 0) {
      categorieRevenuId = categorieEpargneLivret.rows[0].id;
    } else {
      const nouvelleCategorieRevenu = await client.query(
        `INSERT INTO categories (nom, utilisateur_id, type_categorie) VALUES ('Épargne', $1, 'revenu') RETURNING id`,
        [req.utilisateur.id]
      );
      categorieRevenuId = nouvelleCategorieRevenu.rows[0].id;
    }

    await client.query('BEGIN');

    const depense = await client.query(
      `INSERT INTO transactions (date, montant, description, moyen_paiement, categorie_id, compte_id, type_transaction)
       VALUES ($1, $2, $3, 'Virement', $4, $5, 'depense')
       RETURNING *`,
      [date, montant, description || 'Virement vers épargne', categorieDepenseId, compte_courant_id]
    );

    const depot = await client.query(
      `INSERT INTO transactions (date, montant, description, moyen_paiement, categorie_id, compte_id, type_transaction)
       VALUES ($1, $2, $3, 'Virement', $4, $5, 'revenu')
       RETURNING *`,
      [date, montant, description || 'Virement depuis compte courant', categorieRevenuId, compte_epargne_id]
    );

    let allocation = null;
    if (objectif_id && montant_fleche) {
      const resultatAllocation = await client.query(
        'INSERT INTO allocations_epargne (transaction_id, objectif_id, montant_fleche) VALUES ($1, $2, $3) RETURNING *',
        [depot.rows[0].id, objectif_id, montant_fleche]
      );
      allocation = resultatAllocation.rows[0];
    }

    await client.query('COMMIT');
    res.status(201).json({ depense: depense.rows[0], depot: depot.rows[0], allocation });
  } catch (erreur) {
    await client.query('ROLLBACK');
    next(erreur);
  } finally {
    client.release();
  }
});

// POST /transactions/virement-vers-courant - retrait d'un livret + dépôt automatique sur le compte courant
/**
 * @swagger
 * /transactions/virement-vers-courant:
 *   post:
 *     summary: Virement automatisé épargne vers compte courant ("Renflouement", flèchage obligatoire)
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [date, montant, compte_epargne_id, compte_courant_id, objectif_id]
 *             properties:
 *               date:
 *                 type: string
 *               montant:
 *                 type: integer
 *               description:
 *                 type: string
 *                 nullable: true
 *               compte_epargne_id:
 *                 type: integer
 *               compte_courant_id:
 *                 type: integer
 *               objectif_id:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Virement effectué (retrait + dépôt, allocation obligatoire)
 *       400:
 *         description: Champs manquants ou montant invalide
 *       404:
 *         description: Compte ou objectif introuvable
 */
router.post('/virement-vers-courant', verifierToken, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { date, montant, description, compte_epargne_id, compte_courant_id, objectif_id } = req.body;

    if (!date || !montant || !compte_epargne_id || !compte_courant_id || !objectif_id) {
      return res.status(400).json({ erreur: 'Tous les champs, y compris objectif_id, sont requis pour ce virement.' });
    }

    if (montant <= 0) {
      return res.status(400).json({ erreur: 'Le montant doit être supérieur à zéro.' });
    }

    const accesEpargne = await client.query(
      `SELECT c.type_compte FROM comptes c
       JOIN compte_utilisateurs cu ON cu.compte_id = c.id
       WHERE c.id = $1 AND cu.utilisateur_id = $2`,
      [compte_epargne_id, req.utilisateur.id]
    );
    if (accesEpargne.rows.length === 0) {
      return res.status(404).json({ erreur: 'Compte d\'épargne introuvable.' });
    }
    if (accesEpargne.rows[0].type_compte === 'Compte courant') {
      return res.status(400).json({ erreur: 'Le compte source doit être un compte d\'épargne.' });
    }

    const accesCourant = await client.query(
      `SELECT c.type_compte FROM comptes c
       JOIN compte_utilisateurs cu ON cu.compte_id = c.id
       WHERE c.id = $1 AND cu.utilisateur_id = $2`,
      [compte_courant_id, req.utilisateur.id]
    );
    if (accesCourant.rows.length === 0) {
      return res.status(404).json({ erreur: 'Compte courant introuvable.' });
    }
    if (accesCourant.rows[0].type_compte !== 'Compte courant') {
      return res.status(400).json({ erreur: 'Le compte destination doit être un compte courant.' });
    }

    const foyerRes = await client.query('SELECT foyer_id FROM utilisateurs WHERE id = $1', [req.utilisateur.id]);
    const foyerId = foyerRes.rows[0].foyer_id;

    const verifObjectif = await client.query(
      'SELECT 1 FROM objectifs_epargne WHERE id = $1 AND (foyer_id = $2 OR (utilisateur_id = $3 AND foyer_id IS NULL))',
      [objectif_id, foyerId, req.utilisateur.id]
    );
    if (verifObjectif.rows.length === 0) {
      return res.status(404).json({ erreur: 'Objectif introuvable.' });
    }

    // Catégorie "Renflouement" dédiée côté livret (dépense = retrait)
    const categorieRenflouementLivret = await client.query(
      `SELECT id FROM categories
      WHERE utilisateur_id = $1 AND type_categorie = 'depense' AND nom = 'Renflouement'
      LIMIT 1`,
      [req.utilisateur.id]
    );
    let categorieDepenseId;
    if (categorieRenflouementLivret.rows.length > 0) {
      categorieDepenseId = categorieRenflouementLivret.rows[0].id;
    } else {
      const nouvelleCategorieDepense = await client.query(
        `INSERT INTO categories (nom, utilisateur_id, type_categorie) VALUES ('Renflouement', $1, 'depense') RETURNING id`,
        [req.utilisateur.id]
      );
      categorieDepenseId = nouvelleCategorieDepense.rows[0].id;
    }

    // Catégorie "Renflouement" dédiée côté courant (revenu = arrivée d'argent)
    const categorieRenflouementCourant = await client.query(
      `SELECT id FROM categories
      WHERE utilisateur_id = $1 AND type_categorie = 'revenu' AND nom = 'Renflouement'
      LIMIT 1`,
      [req.utilisateur.id]
    );
    let categorieRevenuId;
    if (categorieRenflouementCourant.rows.length > 0) {
      categorieRevenuId = categorieRenflouementCourant.rows[0].id;
    } else {
      const nouvelleCategorieRevenu = await client.query(
        `INSERT INTO categories (nom, utilisateur_id, type_categorie) VALUES ('Renflouement', $1, 'revenu') RETURNING id`,
        [req.utilisateur.id]
      );
      categorieRevenuId = nouvelleCategorieRevenu.rows[0].id;
    }

    await client.query('BEGIN');

    const retrait = await client.query(
      `INSERT INTO transactions (date, montant, description, moyen_paiement, categorie_id, compte_id, type_transaction)
       VALUES ($1, $2, $3, 'Virement', $4, $5, 'depense')
       RETURNING *`,
      [date, montant, description || 'Virement vers compte courant', categorieDepenseId, compte_epargne_id]
    );

    const depot = await client.query(
      `INSERT INTO transactions (date, montant, description, moyen_paiement, categorie_id, compte_id, type_transaction)
       VALUES ($1, $2, $3, 'Virement', $4, $5, 'revenu')
       RETURNING *`,
      [date, montant, description || 'Virement depuis épargne', categorieRevenuId, compte_courant_id]
    );

    const resultatAllocation = await client.query(
      'INSERT INTO allocations_epargne (transaction_id, objectif_id, montant_fleche) VALUES ($1, $2, $3) RETURNING *',
      [retrait.rows[0].id, objectif_id, montant]
    );

    await client.query('COMMIT');
    res.status(201).json({ retrait: retrait.rows[0], depot: depot.rows[0], allocation: resultatAllocation.rows[0] });
  } catch (erreur) {
    await client.query('ROLLBACK');
    next(erreur);
  } finally {
    client.release();
  }
});

/**
 * @swagger
 * /transactions/virement-epargne-vers-epargne:
 *   post:
 *     summary: Virement automatisé entre deux comptes d'épargne (sans flèchage, ne modifie pas la progression des objectifs)
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [date, montant, compte_source_id, compte_dest_id]
 *             properties:
 *               date:
 *                 type: string
 *               montant:
 *                 type: integer
 *               description:
 *                 type: string
 *                 nullable: true
 *               compte_source_id:
 *                 type: integer
 *               compte_dest_id:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Transfert effectué (retrait + dépôt)
 *       400:
 *         description: Comptes identiques, champs manquants, ou l'un des deux n'est pas un compte d'épargne
 *       404:
 *         description: Compte source ou destination introuvable
 */
router.post('/virement-epargne-vers-epargne', verifierToken, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { date, montant, description, compte_source_id, compte_dest_id } = req.body;

    if (!date || !montant || !compte_source_id || !compte_dest_id) {
      return res.status(400).json({ erreur: 'Champs obligatoires manquants.' });
    }

    if (compte_source_id === compte_dest_id) {
      return res.status(400).json({ erreur: 'Les comptes source et destination doivent être différents.' });
    }

    const verifCompte = async (compteId) => {
      const resultat = await client.query(
        `SELECT c.type_compte FROM comptes c
         JOIN compte_utilisateurs cu ON cu.compte_id = c.id
         WHERE c.id = $1 AND cu.utilisateur_id = $2`,
        [compteId, req.utilisateur.id]
      );
      return resultat.rows[0];
    };

    const source = await verifCompte(compte_source_id);
    const dest = await verifCompte(compte_dest_id);

    if (!source) return res.status(404).json({ erreur: 'Compte source introuvable.' });
    if (!dest) return res.status(404).json({ erreur: 'Compte destination introuvable.' });
    if (source.type_compte === 'Compte courant' || dest.type_compte === 'Compte courant') {
      return res.status(400).json({ erreur: 'Les deux comptes doivent être des comptes d\'épargne.' });
    }

    async function trouverOuCreerCategorie(typeCategorie) {
      const existante = await client.query(
        `SELECT id FROM categories WHERE nom = 'Transfert épargne' AND type_categorie = $1 AND utilisateur_id = $2`,
        [typeCategorie, req.utilisateur.id]
      );
      if (existante.rows.length > 0) return existante.rows[0].id;
      const creee = await client.query(
        `INSERT INTO categories (nom, utilisateur_id, type_categorie) VALUES ('Transfert épargne', $1, $2) RETURNING id`,
        [req.utilisateur.id, typeCategorie]
      );
      return creee.rows[0].id;
    }

    const categorieDepenseId = await trouverOuCreerCategorie('depense');
    const categorieRevenuId = await trouverOuCreerCategorie('revenu');

    await client.query('BEGIN');

    const retrait = await client.query(
      `INSERT INTO transactions (date, montant, description, moyen_paiement, categorie_id, compte_id, type_transaction)
       VALUES ($1, $2, $3, 'Virement', $4, $5, 'depense') RETURNING *`,
      [date, montant, description || 'Transfert vers autre épargne', categorieDepenseId, compte_source_id]
    );

    const depot = await client.query(
      `INSERT INTO transactions (date, montant, description, moyen_paiement, categorie_id, compte_id, type_transaction)
       VALUES ($1, $2, $3, 'Virement', $4, $5, 'revenu') RETURNING *`,
      [date, montant, description || 'Transfert depuis autre épargne', categorieRevenuId, compte_dest_id]
    );

    await client.query('COMMIT');
    res.status(201).json({ retrait: retrait.rows[0], depot: depot.rows[0] });
  } catch (erreur) {
    await client.query('ROLLBACK');
    next(erreur);
  } finally {
    client.release();
  }
});

// PATCH /transactions/:id/valider-simulation - passe une transaction simulée en réelle
/**
 * @swagger
 * /transactions/{id}/valider-simulation:
 *   patch:
 *     summary: Transforme une transaction simulée en réelle
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Transaction validée (est_simulee passé à false)
 *       400:
 *         description: Déjà réelle
 *       404:
 *         description: Transaction introuvable
 */
router.patch('/:id/valider-simulation', verifierToken, async (req, res, next) => {
  try {
    const resultatExistant = await pool.query(
      'SELECT compte_id, est_simulee FROM transactions WHERE id = $1',
      [req.params.id]
    );
    if (resultatExistant.rows.length === 0) {
      return res.status(404).json({ erreur: 'Transaction introuvable.' });
    }

    const acces = await verifierAccesCompte(resultatExistant.rows[0].compte_id, req.utilisateur.id);
    if (!acces) {
      return res.status(404).json({ erreur: 'Transaction introuvable.' });
    }

    if (!resultatExistant.rows[0].est_simulee) {
      return res.status(400).json({ erreur: 'Cette transaction est déjà réelle.' });
    }

    const resultat = await pool.query(
      'UPDATE transactions SET est_simulee = FALSE WHERE id = $1 RETURNING *',
      [req.params.id]
    );

    res.json(resultat.rows[0]);
  } catch (erreur) {
    next(erreur);
  }
});

module.exports = router;