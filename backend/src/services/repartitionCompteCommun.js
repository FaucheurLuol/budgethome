function calculerRepartition(revenus, depenses) {
  if (!Array.isArray(revenus) || revenus.length === 0) {
    const erreur = new Error('Au moins un revenu est nécessaire pour calculer une répartition.');
    erreur.statut = 400;
    throw erreur;
  }

  if (!Array.isArray(depenses) || depenses.length === 0) {
    const erreur = new Error('Au moins une dépense est nécessaire pour calculer une répartition.');
    erreur.statut = 400;
    throw erreur;
  }

  // Regroupement des revenus par personne (plusieurs sources possibles : salaire, CAF, prime...)
  const revenusParPersonne = {};
  revenus.forEach((r) => {
    if (!revenusParPersonne[r.personne]) {
      revenusParPersonne[r.personne] = 0;
    }
    revenusParPersonne[r.personne] += r.montant;
  });

  const personnes = Object.keys(revenusParPersonne);
  if (personnes.length < 2) {
    const erreur = new Error('Au moins deux personnes distinctes sont nécessaires pour calculer une répartition.');
    erreur.statut = 400;
    throw erreur;
  }

  const revenuTotal = Object.values(revenusParPersonne).reduce((somme, montant) => somme + montant, 0);
  const depensesTotales = depenses.reduce((somme, d) => somme + d.montant, 0);

  if (revenuTotal <= 0) {
    const erreur = new Error('Le revenu total doit être supérieur à zéro.');
    erreur.statut = 400;
    throw erreur;
  }

  const repartition = personnes.map((personne) => ({
    nom: personne,
    revenu: revenusParPersonne[personne],
    part_a_verser: Math.round((revenusParPersonne[personne] / revenuTotal) * depensesTotales),
  }));

  return { revenu_total: revenuTotal, depenses_totales: depensesTotales, repartition };
}

module.exports = { calculerRepartition };