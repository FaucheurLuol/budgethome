import { useState, useEffect } from 'react';
import { AuthContext } from './authContext';
import { definirGestionnaireDeconnexion } from '../api/fetchAuthentifie';

function appliquerTheme(theme) {
  document.body.setAttribute('data-theme', theme === 'clair' ? 'clair' : 'sombre');
}

export function AuthProvider({ children }) {
  const [utilisateur, setUtilisateur] = useState(() => {
    const utilisateurStocke = localStorage.getItem('utilisateur');
    const u = utilisateurStocke ? JSON.parse(utilisateurStocke) : null;
    if (u) appliquerTheme(u.theme);
    return u;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));

  function connexion(nouveauToken, nouvelUtilisateur) {
    localStorage.setItem('token', nouveauToken);
    localStorage.setItem('utilisateur', JSON.stringify(nouvelUtilisateur));
    setToken(nouveauToken);
    setUtilisateur(nouvelUtilisateur);
    appliquerTheme(nouvelUtilisateur.theme);
  }

  function deconnexion() {
    localStorage.removeItem('token');
    localStorage.removeItem('utilisateur');
    setToken(null);
    setUtilisateur(null);
  }

  function changerThemeLocal(theme) {
    const utilisateurMisAJour = { ...utilisateur, theme };
    localStorage.setItem('utilisateur', JSON.stringify(utilisateurMisAJour));
    setUtilisateur(utilisateurMisAJour);
    appliquerTheme(theme);
  }

  useEffect(() => {
    definirGestionnaireDeconnexion(deconnexion);
  }, []);

  return (
    <AuthContext.Provider value={{ utilisateur, token, connexion, deconnexion, changerThemeLocal }}>
      {children}
    </AuthContext.Provider>
  );
}