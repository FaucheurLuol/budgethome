import { fetchAuthentifie } from './fetchAuthentifie';

export async function listerCategoriesApi() {
  const reponse = await fetchAuthentifie('/categories');
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de la récupération des catégories.');
  return donnees;
}

export async function creerCategorieApi(categorie) {
  const reponse = await fetchAuthentifie('/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(categorie),
  });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de la création de la catégorie.');
  return donnees;
}

export async function supprimerCategorieApi(id) {
  const reponse = await fetchAuthentifie(`/categories/${id}`, { method: 'DELETE' });
  if (!reponse.ok) {
    const donnees = await reponse.json();
    throw new Error(donnees.erreur || 'Erreur lors de la suppression de la catégorie.');
  }
}

export async function garantirCategorieEpargneApi() {
  const reponse = await fetchAuthentifie('/categories/epargne-defaut', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de la vérification de la catégorie Épargne.');
  return donnees;
}

export async function modifierCategorieApi(id, categorie) {
  const reponse = await fetchAuthentifie(`/categories/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(categorie),
  });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur lors de la modification de la catégorie.');
  return donnees;
}