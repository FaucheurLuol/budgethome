import { API_URL } from './config';
import { getAuthHeader } from './token';

export async function listerBudgetsDefautApi(compteId) {
  const reponse = await fetch(`${API_URL}/budgets/defaut?compte_id=${compteId}`, {
    headers: { ...getAuthHeader() },
  });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de la récupération des budgets par défaut.');
  return donnees;
}

export async function creerBudgetDefautApi(budget) {
  const reponse = await fetch(`${API_URL}/budgets/defaut`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(budget),
  });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de la création du budget par défaut.');
  return donnees;
}

export async function supprimerBudgetDefautApi(id) {
  const reponse = await fetch(`${API_URL}/budgets/defaut/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeader() },
  });
  if (!reponse.ok) {
    const donnees = await reponse.json();
    throw new Error(donnees.erreur || 'Erreur lors de la suppression du budget par défaut.');
  }
}

export async function genererBudgetsMensuelsApi(compteId, mois) {
  const reponse = await fetch(`${API_URL}/budgets/mensuel/generer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ compte_id: compteId, mois }),
  });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de la génération des budgets mensuels.');
  return donnees;
}

export async function listerSuiviBudgetsApi(compteId, mois) {
  const reponse = await fetch(`${API_URL}/budgets/mensuel/suivi?compte_id=${compteId}&mois=${mois}`, {
    headers: { ...getAuthHeader() },
  });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de la récupération du suivi des budgets.');
  return donnees;
}

export async function modifierBudgetMensuelApi(id, montant) {
  const reponse = await fetch(`${API_URL}/budgets/mensuel/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ montant }),
  });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de la modification du budget mensuel.');
  return donnees;
}

export async function supprimerBudgetMensuelApi(id) {
  const reponse = await fetch(`${API_URL}/budgets/mensuel/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeader() },
  });
  if (!reponse.ok) {
    const donnees = await reponse.json();
    throw new Error(donnees.erreur || 'Erreur lors de la suppression du budget mensuel.');
  }
}