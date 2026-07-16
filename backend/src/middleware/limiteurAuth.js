const rateLimit = require('express-rate-limit');

const limiteurAuth = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 tentatives maximum par IP sur cette fenêtre
  message: { erreur: 'Trop de tentatives. Réessayez dans quelques minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = limiteurAuth;