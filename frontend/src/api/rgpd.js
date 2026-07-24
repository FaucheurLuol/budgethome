import { fetchAuthentifie } from './fetchAuthentifie';

export async function exporterDonneesApi() {
  const reponse = await fetchAuthentifie('/rgpd/export');
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de l\'export des données.');
  return donnees;
}

export async function supprimerCompteApi(motDePasse, confirmation) {
  const reponse = await fetchAuthentifie('/rgpd/supprimer-compte', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mot_de_passe: motDePasse, confirmation }),
  });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de la suppression du compte.');
  return donnees;
}