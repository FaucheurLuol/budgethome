const { validationResult } = require('express-validator');

function gererErreursValidation(req, res, next) {
  const erreurs = validationResult(req);
  if (!erreurs.isEmpty()) {
    return res.status(400).json({ erreur: erreurs.array()[0].msg });
  }
  next();
}

module.exports = gererErreursValidation;