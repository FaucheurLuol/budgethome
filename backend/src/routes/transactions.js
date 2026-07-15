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
router.get('/', verifierToken, async (req, res, next) => {
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
      `SELECT
         t.*,
         a.objectif_id, o.nom AS objectif_nom, a.montant_fleche
       FROM transactions t
       LEFT JOIN allocations_epargne a ON a.transaction_id = t.id
       LEFT JOIN objectifs_epargne o ON o.id = a.objectif_id
       WHERE t.compte_id = $1
       ORDER BY t.date DESC, t.id DESC`,
      [compte_id]
    );

    res.json(resultat.rows);
  } catch (erreur) {
    next(erreur);
  }
});

// POST /transactions - création
router.post('/', verifierToken, async (req, res, next) => {
  try {
    const {
      date, montant, description, moyen_paiement,
      categorie_id, compte_id, type_transaction, est_recurrente
    } = req.body;

    if (!date || !montant || !moyen_paiement || !categorie_id || !compte_id || !type_transaction) {
      return res.status(400).json({ erreur: 'Champs obligatoires manquants.' });
    }

    const acces = await verifierAccesCompte(compte_id, req.utilisateur.id);
    if (!acces) {
      return res.status(404).json({ erreur: 'Compte introuvable.' });
    }

    const resultat = await pool.query(
      `INSERT INTO transactions
       (date, montant, description, moyen_paiement, categorie_id, compte_id, type_transaction, est_recurrente)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [date, montant, description || null, moyen_paiement, categorie_id, compte_id, type_transaction, est_recurrente || false]
    );

    res.status(201).json(resultat.rows[0]);
  } catch (erreur) {
    next(erreur);
  }
});

// PUT /transactions/:id - modification
router.put('/:id', verifierToken, async (req, res, next) => {
  try {
    const {
      date, montant, description, moyen_paiement,
      categorie_id, type_transaction, est_recurrente
    } = req.body;

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

    const verifObjectif = await client.query(
      'SELECT 1 FROM objectifs_epargne WHERE id = $1 AND utilisateur_id = $2',
      [objectif_id, req.utilisateur.id]
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
      const verifObjectif = await client.query(
        'SELECT 1 FROM objectifs_epargne WHERE id = $1 AND utilisateur_id = $2',
        [objectif_id, req.utilisateur.id]
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
router.post('/virement-vers-courant', verifierToken, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { date, montant, description, compte_epargne_id, compte_courant_id, objectif_id } = req.body;

    if (!date || !montant || !compte_epargne_id || !compte_courant_id || !objectif_id) {
      return res.status(400).json({ erreur: 'Tous les champs, y compris objectif_id, sont requis pour ce virement.' });
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

    const verifObjectif = await client.query(
      'SELECT 1 FROM objectifs_epargne WHERE id = $1 AND utilisateur_id = $2',
      [objectif_id, req.utilisateur.id]
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

module.exports = router;