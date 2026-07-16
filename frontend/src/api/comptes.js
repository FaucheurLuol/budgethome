import { API_URL } from './config';
import { getAuthHeader } from './token';

export async function listerComptesApi() {
  const reponse = await fetch(`${API_URL}/comptes`, {
    headers: { ...getAuthHeader() },
  });

  const donnees = await reponse.json();

  if (!reponse.ok) {
    throw new Error(donnees.erreur || 'Erreur lors de la récupération des comptes.');
  }

  return donnees;
}

export async function creerCompteApi(compte) {
  const reponse = await fetch(`${API_URL}/comptes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(compte),
  });

  const donnees = await reponse.json();

  if (!reponse.ok) {
    throw new Error(donnees.erreur || 'Erreur lors de la création du compte.');
  }

  return donnees;
}

export async function archiverCompteApi(id) {
  const reponse = await fetch(`${API_URL}/comptes/${id}/archiver`, {
    method: 'PATCH',
    headers: { ...getAuthHeader() },
  });

  const donnees = await reponse.json();

  if (!reponse.ok) {
    throw new Error(donnees.erreur || 'Erreur lors de l\'archivage du compte.');
  }

  return donnees;
}

export async function listerComptesArchivesApi() {
  const reponse = await fetch(`${API_URL}/comptes/archives`, {
    headers: { ...getAuthHeader() },
  });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de la récupération des comptes archivés.');
  return donnees;
}

export async function desarchiverCompteApi(id) {
  const reponse = await fetch(`${API_URL}/comptes/${id}/desarchiver`, {
    method: 'PATCH',
    headers: { ...getAuthHeader() },
  });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors du désarchivage.');
  return donnees;
}

export async function supprimerCompteDefinitifApi(id) {
  const reponse = await fetch(`${API_URL}/comptes/${id}/definitif`, {
    method: 'DELETE',
    headers: { ...getAuthHeader() },
  });
  if (!reponse.ok) {
    const donnees = await reponse.json();
    throw new Error(donnees.erreur || 'Erreur lors de la suppression définitive du compte.');
  }
}

export async function basculerFavoriApi(id) {
  const reponse = await fetch(`${API_URL}/comptes/${id}/favori`, {
    method: 'PATCH',
    headers: { ...getAuthHeader() },
  });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de la mise à jour du favori.');
  return donnees;
}

export async function quitterCompteApi(id) {
  const reponse = await fetch(`${API_URL}/comptes/${id}/quitter`, {
    method: 'POST',
    headers: { ...getAuthHeader() },
  });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de la sortie du compte.');
  return donnees;
}