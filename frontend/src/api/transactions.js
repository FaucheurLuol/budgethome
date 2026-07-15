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