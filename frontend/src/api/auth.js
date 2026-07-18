import { API_URL } from './config';
import { fetchAuthentifie } from './fetchAuthentifie';

export async function inscriptionApi(nom, email, mot_de_passe) {
  const reponse = await fetch(`${API_URL}/auth/inscription`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nom, email, mot_de_passe }),
  });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de l\'inscription.');
  return donnees;
}

export async function connexionApi(email, mot_de_passe) {
  const reponse = await fetch(`${API_URL}/auth/connexion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, mot_de_passe }),
  });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de la connexion.');
  return donnees;
}

export async function changerMotDePasseApi(ancienMotDePasse, nouveauMotDePasse) {
  const reponse = await fetchAuthentifie('/auth/mot-de-passe', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ancien_mot_de_passe: ancienMotDePasse, nouveau_mot_de_passe: nouveauMotDePasse }),
  });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors du changement de mot de passe.');
  return donnees;
}