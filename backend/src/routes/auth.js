const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const limiteurAuth = require('../middleware/limiteurAuth');
const verifierToken = require('../middleware/auth');

const router = express.Router();

function poserCookieToken(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

// Inscription
router.post('/inscription', limiteurAuth, async (req, res, next) => {
  try {
    const { nom, email, mot_de_passe } = req.body;

    if (!nom || !email || !mot_de_passe) {
      return res.status(400).json({ erreur: 'Nom, email et mot de passe sont requis.' });
    }

    const nomRegex = /^[a-zA-ZÀ-ÿ\s'-]{2,50}$/;
    if (!nomRegex.test(nom)) {
      return res.status(400).json({ erreur: 'Le nom doit contenir entre 2 et 50 caractères alphabétiques, espaces, apostrophes ou tirets.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ erreur: 'Adresse email invalide.' });
    }

    const motDePasseRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+={}[\]|\\:;"'<>,.?/~`])[A-Za-z\d!@#$%^&*()_\-+={}[\]|\\:;"'<>,.?/~`]{14,}$/;
    if (!motDePasseRegex.test(mot_de_passe)) {
      return res.status(400).json({ erreur: 'Le mot de passe doit contenir au moins 14 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial.' });
    }

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
router.post('/connexion', limiteurAuth, async (req, res, next) => {
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

// Modification du mot de passe
router.put('/mot-de-passe', verifierToken, async (req, res, next) => {
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

router.post('/deconnexion', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });
  res.json({ message: 'Déconnecté.' });
});

module.exports = router;