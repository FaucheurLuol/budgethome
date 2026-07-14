function gestionErreurs(err, req, res, next) {
  console.error(err.stack);

  if (err.code === '23505') {
    return res.status(409).json({ erreur: 'Cette donnée existe déjà.' });
  }

  if (err.code === '23503' || err.code === '23001') {
    return res.status(409).json({ erreur: 'Impossible de supprimer : des données liées existent encore.' });
  }

  if (err.code === '23514') {
    return res.status(400).json({ erreur: 'Les données envoyées ne respectent pas les règles métier (ex: type de revenu incohérent).' });
  }

  if (err.code === 'P0001') {
    return res.status(400).json({ erreur: err.message });
  }

  const statut = err.statut || 500;
  const message = err.message || 'Erreur interne du serveur';

  res.status(statut).json({ erreur: message });
}

module.exports = gestionErreurs;