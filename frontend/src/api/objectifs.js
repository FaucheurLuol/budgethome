import { fetchAuthentifie } from './fetchAuthentifie';

export async function listerObjectifsApi() {
  const reponse = await fetchAuthentifie('/objectifs');
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de la récupération des objectifs.');
  return donnees;
}

export async function creerObjectifApi(objectif) {
  const reponse = await fetchAuthentifie('/objectifs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(objectif),
  });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de la création de l\'objectif.');
  return donnees;
}

export async function supprimerObjectifApi(id) {
  const reponse = await fetchAuthentifie(`/objectifs/${id}`, { method: 'DELETE' });
  if (!reponse.ok) {
    const donnees = await reponse.json();
    throw new Error(donnees.erreur || 'Erreur lors de la suppression de l\'objectif.');
  }
}

export async function creerAllocationApi(objectifId, transactionId, montantFleche) {
  const reponse = await fetchAuthentifie(`/objectifs/${objectifId}/allocations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transaction_id: transactionId, montant_fleche: montantFleche }),
  });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors du flèchage vers l\'objectif.');
  return donnees;
}

export async function listerObjectifsArchivesApi() {
  const reponse = await fetchAuthentifie('/objectifs/archives');
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de la récupération des objectifs archivés.');
  return donnees;
}

export async function archiverObjectifApi(id) {
  const reponse = await fetchAuthentifie(`/objectifs/${id}/archiver`, { method: 'PATCH' });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de l\'archivage.');
  return donnees;
}

export async function desarchiverObjectifApi(id) {
  const reponse = await fetchAuthentifie(`/objectifs/${id}/desarchiver`, { method: 'PATCH' });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors du désarchivage.');
  return donnees;
}

export async function supprimerObjectifDefinitifApi(id) {
  const reponse = await fetchAuthentifie(`/objectifs/${id}/definitif`, { method: 'DELETE' });
  if (!reponse.ok) {
    const donnees = await reponse.json();
    throw new Error(donnees.erreur || 'Erreur lors de la suppression définitive.');
  }
}