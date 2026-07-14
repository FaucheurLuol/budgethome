function gestionErreurs(err, req, res, next) {
  console.error(err.stack);

  const statut = err.statut || 500;
  const message = err.message || 'Erreur interne du serveur';

  res.status(statut).json({ erreur: message });
}

module.exports = gestionErreurs;