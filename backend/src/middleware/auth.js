const jwt = require('jsonwebtoken');

function verifierToken(req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ erreur: 'Token manquant.' });
  }

  try {
    const decode = jwt.verify(token, process.env.JWT_SECRET);
    req.utilisateur = decode;
    next();
  } catch (erreur) {
    return res.status(401).json({ erreur: 'Token invalide ou expiré.' });
  }
}

module.exports = verifierToken;