import { fetchAuthentifie } from './fetchAuthentifie';

export async function listerTransactionsApi(compteId, filtres = {}) {
  const params = new URLSearchParams({ compte_id: compteId });
  if (filtres.mois) params.append('mois', filtres.mois);
  if (filtres.categorie_id) params.append('categorie_id', filtres.categorie_id);
  if (filtres.recherche) params.append('recherche', filtres.recherche);

  const reponse = await fetchAuthentifie(`/transactions?${params.toString()}`);
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de la récupération des transactions.');
  return donnees;
}

export async function creerTransactionApi(transaction) {
  const reponse = await fetchAuthentifie('/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(transaction),
  });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de la création de la transaction.');
  return donnees;
}

export async function supprimerTransactionApi(id) {
  const reponse = await fetchAuthentifie(`/transactions/${id}`, { method: 'DELETE' });
  if (!reponse.ok) {
    const donnees = await reponse.json();
    throw new Error(donnees.erreur || 'Erreur lors de la suppression de la transaction.');
  }
}

export async function creerRetraitEpargneApi(retrait) {
  const reponse = await fetchAuthentifie('/transactions/retrait-epargne', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(retrait),
  });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors du retrait d\'épargne.');
  return donnees;
}

export async function creerVirementEpargneApi(virement) {
  const reponse = await fetchAuthentifie('/transactions/virement-epargne', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(virement),
  });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors du virement vers l\'épargne.');
  return donnees;
}

export async function creerVirementVersCourantApi(virement) {
  const reponse = await fetchAuthentifie('/transactions/virement-vers-courant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(virement),
  });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors du virement vers le compte courant.');
  return donnees;
}

export async function validerSimulationApi(id) {
  const reponse = await fetchAuthentifie(`/transactions/${id}/valider-simulation`, { method: 'PATCH' });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de la validation de la transaction.');
  return donnees;
}

export async function modifierTransactionApi(id, transaction) {
  const reponse = await fetchAuthentifie(`/transactions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(transaction),
  });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de la modification de la transaction.');
  return donnees;
}

export async function creerVirementEpargneVersEpargneApi(virement) {
  const reponse = await fetchAuthentifie('/transactions/virement-epargne-vers-epargne', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(virement),
  });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors du transfert entre comptes d\'épargne.');
  return donnees;
}