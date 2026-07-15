import { API_URL } from './config';
import { getAuthHeader } from './token';

export async function listerSoldesApi() {
  const reponse = await fetch(`${API_URL}/dashboard/soldes`, { headers: { ...getAuthHeader() } });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de la récupération des soldes.');
  return donnees;
}

export async function listerEvolutionComptesCourantsApi(mois = 12) {
  const reponse = await fetch(`${API_URL}/dashboard/evolution-comptes-courants?mois=${mois}`, {
    headers: { ...getAuthHeader() },
  });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de la récupération de l\'évolution.');
  return donnees;
}

export async function listerRepartitionApi(type, periode, compteId = null) {
  const params = new URLSearchParams({ type, periode });
  if (compteId) params.append('compte_id', compteId);
  const reponse = await fetch(`${API_URL}/dashboard/repartition?${params.toString()}`, {
    headers: { ...getAuthHeader() },
  });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de la récupération de la répartition.');
  return donnees;
}

export async function listerBudgetsDuMoisApi() {
  const reponse = await fetch(`${API_URL}/dashboard/budgets-du-mois`, { headers: { ...getAuthHeader() } });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de la récupération des budgets.');
  return donnees;
}