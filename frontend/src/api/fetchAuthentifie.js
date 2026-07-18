import { API_URL } from './config';
import { getAuthHeader } from './token';

let gestionnaireDeconnexion = null;

export function definirGestionnaireDeconnexion(fonction) {
  gestionnaireDeconnexion = fonction;
}

export async function fetchAuthentifie(chemin, options = {}) {
  const reponse = await fetch(`${API_URL}${chemin}`, {
    ...options,
    headers: {
      ...options.headers,
      ...getAuthHeader(),
    },
  });

  if (reponse.status === 401 && gestionnaireDeconnexion) {
    gestionnaireDeconnexion();
  }

  return reponse;
}