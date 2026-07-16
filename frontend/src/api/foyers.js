import { API_URL } from './config';
import { getAuthHeader } from './token';

export async function obtenirMonFoyerApi() {
  const reponse = await fetch(`${API_URL}/foyers/moi`, {
    headers: { ...getAuthHeader() },
  });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de la récupération du foyer.');
  return donnees;
}

export async function creerFoyerApi() {
  const reponse = await fetch(`${API_URL}/foyers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
  });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de la création du foyer.');
  return donnees;
}

export async function rejoindreFoyerApi(code) {
  const reponse = await fetch(`${API_URL}/foyers/rejoindre`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ code }),
  });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de la tentative de rejoindre le foyer.');
  return donnees;
}

export async function quitterFoyerApi() {
  const reponse = await fetch(`${API_URL}/foyers/quitter`, {
    method: 'POST',
    headers: { ...getAuthHeader() },
  });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de la sortie du foyer.');
  return donnees;
}