import { API_URL } from './config';
import { getAuthHeader } from './token';

export async function calculerRepartitionApi(revenus, depenses, mois) {
  const reponse = await fetch(`${API_URL}/repartition`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ revenus, depenses, mois }),
  });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors du calcul de la répartition.');
  return donnees;
}

export async function listerHistoriqueRepartitionApi() {
  const reponse = await fetch(`${API_URL}/repartition/historique`, {
    headers: { ...getAuthHeader() },
  });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de la récupération de l\'historique.');
  return donnees;
}

export async function activerRepartitionApi(id) {
  const reponse = await fetch(`${API_URL}/repartition/${id}/activer`, {
    method: 'PATCH',
    headers: { ...getAuthHeader() },
  });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de l\'activation.');
  return donnees;
}