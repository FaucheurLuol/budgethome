const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const limiteurAuth = require('../middleware/limiteurAuth');
const verifierToken = require('../middleware/auth');
const { body, param } = require('express-validator');
const gererErreursValidation = require('../middleware/validation');

const router = express.Router();

function poserCookieToken(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

const validationInscription = [
  body('nom')
    .trim()
    .matches(/^[a-zA-ZÀ-ÿ\s'-]{2,50}$/)
    .withMessage('Le nom doit contenir entre 2 et 50 caractères alphabétiques, espaces, apostrophes ou tirets.'),
  body('email')
    .isEmail()
    .withMessage('Adresse email invalide.'),
  body('mot_de_passe')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+={}[\]|\\:;"'<>,.?/~`])[A-Za-z\d!@#$%^&*()_\-+={}[\]|\\:;"'<>,.?/~`]{14,}$/)
    .withMessage('Le mot de passe doit contenir au moins 14 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial.'),
];

const validationConnexion = [
  body('email').isEmail().withMessage('Adresse email invalide.'),
  body('mot_de_passe').notEmpty().withMessage('Le mot de passe est requis.'),
];

const validationChangementMotDePasse = [
  body('ancien_mot_de_passe').notEmpty().withMessage('L\'ancien mot de passe est requis.'),
  body('nouveau_mot_de_passe')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+={}[\]|\\:;"'<>,.?/~`])[A-Za-z\d!@#$%^&*()_\-+={}[\]|\\:;"'<>,.?/~`]{14,}$/)
    .withMessage('Le nouveau mot de passe doit contenir au moins 14 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial.'),
];

// Inscription
/**
 * @swagger
 * /auth/inscription:
 *   post:
 *     summary: Créer un compte utilisateur
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nom, email, mot_de_passe]
 *             properties:
 *               nom:
 *                 type: string
 *               email:
 *                 type: string
 *               mot_de_passe:
 *                 type: string
 *                 description: Minimum 14 caractères, majuscule, minuscule, chiffre, caractère spécial
 *     responses:
 *       201:
 *         description: Compte créé, cookie de session posé
 *       400:
 *         description: Validation échouée (nom, email ou mot de passe invalide)
 */
router.post('/inscription', limiteurAuth, validationInscription, gererErreursValidation, async (req, res, next) => {
  try {
    const { nom, email, mot_de_passe } = req.body;

    const hash = await bcrypt.hash(mot_de_passe, 10);

    const resultat = await pool.query(
      'INSERT INTO utilisateurs (nom, email, mot_de_passe) VALUES ($1, $2, $3) RETURNING id, nom, email, theme',
      [nom, email, hash]
    );

    const utilisateur = resultat.rows[0];

    const token = jwt.sign(
      { id: utilisateur.id, nom: utilisateur.nom },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    poserCookieToken(res, token);
    res.status(201).json({ utilisateur });
  } catch (erreur) {
    next(erreur);
  }
});

// Connexion
/**
 * @swagger
 * /auth/connexion:
 *   post:
 *     summary: Authentifier un utilisateur
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, mot_de_passe]
 *             properties:
 *               email:
 *                 type: string
 *               mot_de_passe:
 *                 type: string
 *     responses:
 *       200:
 *         description: Connexion réussie, cookie de session posé
 *       401:
 *         description: Email ou mot de passe incorrect
 */
router.post('/connexion', limiteurAuth, validationConnexion, gererErreursValidation, async (req, res, next) => {
  try {
    const { email, mot_de_passe } = req.body;

    if (!email || !mot_de_passe) {
      return res.status(400).json({ erreur: 'Email et mot de passe sont requis.' });
    }

    const resultat = await pool.query(
      'SELECT * FROM utilisateurs WHERE email = $1',
      [email]
    );

    const utilisateur = resultat.rows[0];
    if (!utilisateur) {
      return res.status(401).json({ erreur: 'Email ou mot de passe incorrect.' });
    }

    const motDePasseValide = await bcrypt.compare(mot_de_passe, utilisateur.mot_de_passe);
    if (!motDePasseValide) {
      return res.status(401).json({ erreur: 'Email ou mot de passe incorrect.' });
    }

    const token = jwt.sign(
      { id: utilisateur.id, nom: utilisateur.nom },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    poserCookieToken(res, token);
    res.json({ token, utilisateur: { id: utilisateur.id, nom: utilisateur.nom, email: utilisateur.email, theme: utilisateur.theme } });
  } catch (erreur) {
    next(erreur);
  }
});

/**
 * @swagger
 * /auth/moi:
 *   get:
 *     summary: Récupérer les infos de l'utilisateur connecté (vérifie la session)
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Utilisateur trouvé
 *       401:
 *         description: Non authentifié
 */
router.get('/moi', verifierToken, async (req, res, next) => {
  try {
    const resultat = await pool.query('SELECT id, nom, email, theme FROM utilisateurs WHERE id = $1', [req.utilisateur.id]);
    if (resultat.rows.length === 0) {
      return res.status(404).json({ erreur: 'Utilisateur introuvable.' });
    }
    res.json(resultat.rows[0]);
  } catch (erreur) {
    next(erreur);
  }
});

/**
 * @swagger
 * /auth/deconnexion:
 *   post:
 *     summary: Déconnexion (efface le cookie de session)
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Déconnecté
 */
router.post('/deconnexion', (req, res) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.json({ message: 'Déconnecté.' });
});

// Modification du mot de passe
/**
 * @swagger
 * /auth/mot-de-passe:
 *   put:
 *     summary: Changer son mot de passe
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ancien_mot_de_passe, nouveau_mot_de_passe]
 *             properties:
 *               ancien_mot_de_passe:
 *                 type: string
 *               nouveau_mot_de_passe:
 *                 type: string
 *     responses:
 *       200:
 *         description: Mot de passe modifié
 *       401:
 *         description: Ancien mot de passe incorrect
 */
router.put('/mot-de-passe', verifierToken, validationChangementMotDePasse, gererErreursValidation, async (req, res, next) => {
  try {
    const { ancien_mot_de_passe, nouveau_mot_de_passe } = req.body;

    if (!ancien_mot_de_passe || !nouveau_mot_de_passe) {
      return res.status(400).json({ erreur: 'Ancien et nouveau mot de passe sont requis.' });
    }

    const motDePasseRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+={}[\]|\\:;"'<>,.?/~`])[A-Za-z\d!@#$%^&*()_\-+={}[\]|\\:;"'<>,.?/~`]{14,}$/;
    if (!motDePasseRegex.test(nouveau_mot_de_passe)) {
      return res.status(400).json({ erreur: 'Le nouveau mot de passe doit contenir au moins 14 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial.' });
    }

    const resultat = await pool.query('SELECT mot_de_passe FROM utilisateurs WHERE id = $1', [req.utilisateur.id]);
    const motDePasseValide = await bcrypt.compare(ancien_mot_de_passe, resultat.rows[0].mot_de_passe);

    if (!motDePasseValide) {
      return res.status(401).json({ erreur: 'Ancien mot de passe incorrect.' });
    }

    const nouveauHash = await bcrypt.hash(nouveau_mot_de_passe, 10);
    await pool.query('UPDATE utilisateurs SET mot_de_passe = $1 WHERE id = $2', [nouveauHash, req.utilisateur.id]);

    res.json({ message: 'Mot de passe modifié avec succès.' });
  } catch (erreur) {
    next(erreur);
  }
});

/**
 * @swagger
 * /auth/theme:
 *   put:
 *     summary: Changer le thème (clair/sombre)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [theme]
 *             properties:
 *               theme:
 *                 type: string
 *                 enum: [clair, sombre]
 *     responses:
 *       200:
 *         description: Thème mis à jour
 */
router.put('/theme', verifierToken, async (req, res, next) => {
  try {
    const { theme } = req.body;

    if (!['sombre', 'clair'].includes(theme)) {
      return res.status(400).json({ erreur: 'Thème invalide.' });
    }

    await pool.query('UPDATE utilisateurs SET theme = $1 WHERE id = $2', [theme, req.utilisateur.id]);
    res.json({ theme });
  } catch (erreur) {
    next(erreur);
  }
});

module.exports = router;