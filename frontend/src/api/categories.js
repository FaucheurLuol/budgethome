import { API_URL } from './config';
import { getAuthHeader } from './token';

export async function listerCategoriesApi() {
  const reponse = await fetch(`${API_URL}/categories`, {
    headers: { ...getAuthHeader() },
  });

  const donnees = await reponse.json();

  if (!reponse.ok) {
    throw new Error(donnees.erreur || 'Erreur lors de la récupération des catégories.');
  }

  return donnees;
}

export async function creerCategorieApi(categorie) {
  const reponse = await fetch(`${API_URL}/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(categorie),
  });

  const donnees = await reponse.json();

  if (!reponse.ok) {
    throw new Error(donnees.erreur || 'Erreur lors de la création de la catégorie.');
  }

  return donnees;
}

export async function supprimerCategorieApi(id) {
  const reponse = await fetch(`${API_URL}/categories/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeader() },
  });

  if (!reponse.ok) {
    const donnees = await reponse.json();
    throw new Error(donnees.erreur || 'Erreur lors de la suppression de la catégorie.');
  }
}