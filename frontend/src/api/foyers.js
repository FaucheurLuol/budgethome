import { fetchAuthentifie } from './fetchAuthentifie';

export async function obtenirMonFoyerApi() {
  const reponse = await fetchAuthentifie('/foyers/moi');
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de la récupération du foyer.');
  return donnees;
}

export async function creerFoyerApi() {
  const reponse = await fetchAuthentifie('/foyers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de la création du foyer.');
  return donnees;
}

export async function rejoindreFoyerApi(code) {
  const reponse = await fetchAuthentifie('/foyers/rejoindre', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de la tentative de rejoindre le foyer.');
  return donnees;
}

export async function quitterFoyerApi() {
  const reponse = await fetchAuthentifie('/foyers/quitter', { method: 'POST' });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de la sortie du foyer.');
  return donnees;
}