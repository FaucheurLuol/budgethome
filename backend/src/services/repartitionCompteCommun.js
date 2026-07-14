function calculerRepartition(revenus, depenses) {
  if (!Array.isArray(revenus) || revenus.length < 2) {
    const erreur = new Error('Au moins deux revenus sont nécessaires pour calculer une répartition.');
    erreur.statut = 400;
    throw erreur;
  }

  if (!Array.isArray(depenses) || depenses.length === 0) {
    const erreur = new Error('Au moins une dépense est nécessaire pour calculer une répartition.');
    erreur.statut = 400;
    throw erreur;
  }

  const revenuTotal = revenus.reduce((somme, r) => somme + r.montant, 0);
  const depensesTotales = depenses.reduce((somme, d) => somme + d.montant, 0);

  if (revenuTotal <= 0) {
    const erreur = new Error('Le revenu total doit être supérieur à zéro.');
    erreur.statut = 400;
    throw erreur;
  }

  const repartition = revenus.map((r) => ({
    nom: r.nom,
    revenu: r.montant,
    part_a_verser: Math.round((r.montant / revenuTotal) * depensesTotales)
  }));

  return { revenu_total: revenuTotal, depenses_totales: depensesTotales, repartition };
}

module.exports = { calculerRepartition };