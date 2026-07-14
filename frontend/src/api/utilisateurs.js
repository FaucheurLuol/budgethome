import { API_URL } from './config';
import { getAuthHeader } from './token';

export async function listerUtilisateursApi() {
  const reponse = await fetch(`${API_URL}/utilisateurs`, {
    headers: { ...getAuthHeader() },
  });

  const donnees = await reponse.json();

  if (!reponse.ok) {
    throw new Error(donnees.erreur || 'Erreur lors de la récupération des utilisateurs.');
  }

  return donnees;
}