import { fetchAuthentifie } from './fetchAuthentifie';

export async function listerUtilisateursApi() {
  const reponse = await fetchAuthentifie('/utilisateurs');
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de la récupération des utilisateurs.');
  return donnees;
}