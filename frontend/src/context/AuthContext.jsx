import { useState, useEffect } from 'react';
import { AuthContext } from './authContext';
import { definirGestionnaireDeconnexion } from '../api/fetchAuthentifie';

export function AuthProvider({ children }) {
  const [utilisateur, setUtilisateur] = useState(() => {
    const utilisateurStocke = localStorage.getItem('utilisateur');
    return utilisateurStocke ? JSON.parse(utilisateurStocke) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));

  function connexion(nouveauToken, nouvelUtilisateur) {
    localStorage.setItem('token', nouveauToken);
    localStorage.setItem('utilisateur', JSON.stringify(nouvelUtilisateur));
    setToken(nouveauToken);
    setUtilisateur(nouvelUtilisateur);
  }

  function deconnexion() {
    localStorage.removeItem('token');
    localStorage.removeItem('utilisateur');
    setToken(null);
    setUtilisateur(null);
  }

  useEffect(() => {
    definirGestionnaireDeconnexion(deconnexion);
  }, []);

  return (
    <AuthContext.Provider value={{ utilisateur, token, connexion, deconnexion }}>
      {children}
    </AuthContext.Provider>
  );
}