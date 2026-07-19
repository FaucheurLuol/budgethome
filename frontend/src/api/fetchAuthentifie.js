import { API_URL } from './config';

let gestionnaireDeconnexion = null;

export function definirGestionnaireDeconnexion(fonction) {
  gestionnaireDeconnexion = fonction;
}

export async function fetchAuthentifie(chemin, options = {}) {
  const reponse = await fetch(`${API_URL}${chemin}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...options.headers,
    },
  });

  if (reponse.status === 401 && gestionnaireDeconnexion) {
    gestionnaireDeconnexion();
  }

  return reponse;
}