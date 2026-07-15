import { API_URL } from './config';
import { getAuthHeader } from './token';

export async function listerObjectifsApi() {
  const reponse = await fetch(`${API_URL}/objectifs`, {
    headers: { ...getAuthHeader() },
  });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de la récupération des objectifs.');
  return donnees;
}

export async function creerObjectifApi(objectif) {
  const reponse = await fetch(`${API_URL}/objectifs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(objectif),
  });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de la création de l\'objectif.');
  return donnees;
}

export async function supprimerObjectifApi(id) {
  const reponse = await fetch(`${API_URL}/objectifs/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeader() },
  });
  if (!reponse.ok) {
    const donnees = await reponse.json();
    throw new Error(donnees.erreur || 'Erreur lors de la suppression de l\'objectif.');
  }
}

export async function creerAllocationApi(objectifId, transactionId, montantFleche) {
  const reponse = await fetch(`${API_URL}/objectifs/${objectifId}/allocations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ transaction_id: transactionId, montant_fleche: montantFleche }),
  });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors du flèchage vers l\'objectif.');
  return donnees;
}