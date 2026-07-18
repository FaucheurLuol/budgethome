import { fetchAuthentifie } from './fetchAuthentifie';

export async function calculerRepartitionApi(revenus, depenses, mois) {
  const reponse = await fetchAuthentifie('/repartition', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ revenus, depenses, mois }),
  });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors du calcul de la répartition.');
  return donnees;
}

export async function listerHistoriqueRepartitionApi() {
  const reponse = await fetchAuthentifie('/repartition/historique');
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de la récupération de l\'historique.');
  return donnees;
}

export async function activerRepartitionApi(id) {
  const reponse = await fetchAuthentifie(`/repartition/${id}/activer`, { method: 'PATCH' });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de l\'activation.');
  return donnees;
}

export async function supprimerRepartitionApi(id) {
  const reponse = await fetchAuthentifie(`/repartition/${id}`, { method: 'DELETE' });
  if (!reponse.ok) {
    const donnees = await reponse.json();
    throw new Error(donnees.erreur || 'Erreur lors de la suppression de la répartition.');
  }
}