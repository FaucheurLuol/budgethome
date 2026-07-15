import { API_URL } from './config';
import { getAuthHeader } from './token';

export async function listerModelesApi(compteId) {
  const reponse = await fetch(`${API_URL}/modeles?compte_id=${compteId}`, {
    headers: { ...getAuthHeader() },
  });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de la récupération des modèles.');
  return donnees;
}

export async function creerModeleApi(modele) {
  const reponse = await fetch(`${API_URL}/modeles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(modele),
  });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de la création du modèle.');
  return donnees;
}

export async function supprimerModeleApi(id) {
  const reponse = await fetch(`${API_URL}/modeles/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeader() },
  });
  if (!reponse.ok) {
    const donnees = await reponse.json();
    throw new Error(donnees.erreur || 'Erreur lors de la suppression du modèle.');
  }
}