import { fetchAuthentifie } from './fetchAuthentifie';

export async function listerModelesApi(compteId) {
  const reponse = await fetchAuthentifie(`/modeles?compte_id=${compteId}`);
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de la récupération des modèles.');
  return donnees;
}

export async function creerModeleApi(modele) {
  const reponse = await fetchAuthentifie('/modeles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(modele),
  });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de la création du modèle.');
  return donnees;
}

export async function supprimerModeleApi(id) {
  const reponse = await fetchAuthentifie(`/modeles/${id}`, { method: 'DELETE' });
  if (!reponse.ok) {
    const donnees = await reponse.json();
    throw new Error(donnees.erreur || 'Erreur lors de la suppression du modèle.');
  }
}

export async function creerOuRemplacerModeleCompteCommunApi(compteId, montant) {
  const reponse = await fetchAuthentifie('/modeles/virement-compte-commun', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ compte_id: compteId, montant }),
  });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de la création du modèle.');
  return donnees;
}