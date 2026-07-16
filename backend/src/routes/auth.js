const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();

// Inscription
router.post('/inscription', async (req, res, next) => {
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
      'INSERT INTO utilisateurs (nom, email, mot_de_passe) VALUES ($1, $2, $3) RETURNING id, nom, email',
      [nom, email, hash]
    );

    const utilisateur = resultat.rows[0];

    const token = jwt.sign(
      { id: utilisateur.id, nom: utilisateur.nom },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ token, utilisateur });
  } catch (erreur) {
    next(erreur);
  }
});

// Connexion
router.post('/connexion', async (req, res, next) => {
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

    res.json({ token, utilisateur: { id: utilisateur.id, nom: utilisateur.nom, email: utilisateur.email } });
  } catch (erreur) {
    next(erreur);
  }
});

module.exports = router;