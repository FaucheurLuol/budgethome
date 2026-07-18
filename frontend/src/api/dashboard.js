import { fetchAuthentifie } from './fetchAuthentifie';

export async function listerSoldesApi() {
  const reponse = await fetchAuthentifie('/dashboard/soldes');
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de la récupération des soldes.');
  return donnees;
}

export async function listerEvolutionComptesCourantsApi(mois = 12) {
  const reponse = await fetchAuthentifie(`/dashboard/evolution-comptes-courants?mois=${mois}`);
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de la récupération de l\'évolution.');
  return donnees;
}

export async function listerRepartitionApi(type, periode, compteId = null) {
  const params = new URLSearchParams({ type, periode });
  if (compteId) params.append('compte_id', compteId);
  const reponse = await fetchAuthentifie(`/dashboard/repartition?${params.toString()}`);
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de la récupération de la répartition.');
  return donnees;
}

export async function listerBudgetsDuMoisApi() {
  const reponse = await fetchAuthentifie('/dashboard/budgets-du-mois');
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de la récupération des budgets.');
  return donnees;
}