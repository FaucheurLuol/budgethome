import { fetchAuthentifie } from './fetchAuthentifie';

export async function listerComptesApi() {
  const reponse = await fetchAuthentifie('/comptes');
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de la récupération des comptes.');
  return donnees;
}

export async function listerComptesArchivesApi() {
  const reponse = await fetchAuthentifie('/comptes/archives');
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de la récupération des comptes archivés.');
  return donnees;
}

export async function creerCompteApi(compte) {
  const reponse = await fetchAuthentifie('/comptes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(compte),
  });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de la création du compte.');
  return donnees;
}

export async function archiverCompteApi(id) {
  const reponse = await fetchAuthentifie(`/comptes/${id}/archiver`, { method: 'PATCH' });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de l\'archivage du compte.');
  return donnees;
}

export async function desarchiverCompteApi(id) {
  const reponse = await fetchAuthentifie(`/comptes/${id}/desarchiver`, { method: 'PATCH' });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors du désarchivage.');
  return donnees;
}

export async function basculerFavoriApi(id) {
  const reponse = await fetchAuthentifie(`/comptes/${id}/favori`, { method: 'PATCH' });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de la mise à jour du favori.');
  return donnees;
}

export async function quitterCompteApi(id) {
  const reponse = await fetchAuthentifie(`/comptes/${id}/quitter`, { method: 'POST' });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de la sortie du compte.');
  return donnees;
}

export async function inviterUtilisateurApi(compteId, utilisateurId) {
  const reponse = await fetchAuthentifie(`/comptes/${compteId}/inviter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ utilisateur_id: utilisateurId }),
  });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de l\'invitation.');
  return donnees;
}

export async function supprimerCompteApi(id) {
  const reponse = await fetchAuthentifie(`/comptes/${id}`, { method: 'DELETE' });
  if (!reponse.ok) {
    const donnees = await reponse.json();
    throw new Error(donnees.erreur || 'Erreur lors de la suppression du compte.');
  }
}

export async function supprimerCompteDefinitifApi(id) {
  const reponse = await fetchAuthentifie(`/comptes/${id}/definitif`, { method: 'DELETE' });
  if (!reponse.ok) {
    const donnees = await reponse.json();
    throw new Error(donnees.erreur || 'Erreur lors de la suppression définitive du compte.');
  }
}