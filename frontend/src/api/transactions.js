import { API_URL } from './config';
import { getAuthHeader } from './token';

export async function listerTransactionsApi(compteId) {
  const reponse = await fetch(`${API_URL}/transactions?compte_id=${compteId}`, {
    headers: { ...getAuthHeader() },
  });

  const donnees = await reponse.json();

  if (!reponse.ok) {
    throw new Error(donnees.erreur || 'Erreur lors de la récupération des transactions.');
  }

  return donnees;
}

export async function creerTransactionApi(transaction) {
  const reponse = await fetch(`${API_URL}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(transaction),
  });

  const donnees = await reponse.json();

  if (!reponse.ok) {
    throw new Error(donnees.erreur || 'Erreur lors de la création de la transaction.');
  }

  return donnees;
}

export async function supprimerTransactionApi(id) {
  const reponse = await fetch(`${API_URL}/transactions/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeader() },
  });

  if (!reponse.ok) {
    const donnees = await reponse.json();
    throw new Error(donnees.erreur || 'Erreur lors de la suppression de la transaction.');
  }
}

export async function creerRetraitEpargneApi(retrait) {
  const reponse = await fetch(`${API_URL}/transactions/retrait-epargne`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(retrait),
  });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors du retrait d\'épargne.');
  return donnees;
}

export async function creerVirementEpargneApi(virement) {
  const reponse = await fetch(`${API_URL}/transactions/virement-epargne`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(virement),
  });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors du virement vers l\'épargne.');
  return donnees;
}

export async function creerVirementVersCourantApi(virement) {
  const reponse = await fetch(`${API_URL}/transactions/virement-vers-courant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(virement),
  });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors du virement vers le compte courant.');
  return donnees;
}

export async function validerSimulationApi(id) {
  const reponse = await fetch(`${API_URL}/transactions/${id}/valider-simulation`, {
    method: 'PATCH',
    headers: { ...getAuthHeader() },
  });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de la validation de la transaction.');
  return donnees;
}