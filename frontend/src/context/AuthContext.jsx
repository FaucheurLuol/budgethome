import { useState, useEffect } from 'react';
import { AuthContext } from './authContext';
import { definirGestionnaireDeconnexion } from '../api/fetchAuthentifie';
import { obtenirMoiApi, deconnexionApi } from '../api/auth';

function appliquerTheme(theme) {
  document.body.setAttribute('data-theme', theme === 'clair' ? 'clair' : 'sombre');
}

export function AuthProvider({ children }) {
  const [utilisateur, setUtilisateur] = useState(null);
  const [chargementInitial, setChargementInitial] = useState(true);

  useEffect(() => {
    async function verifierSession() {
      try {
        const donnees = await obtenirMoiApi();
        setUtilisateur(donnees);
        appliquerTheme(donnees.theme);
      } catch {
        setUtilisateur(null);
      } finally {
        setChargementInitial(false);
      }
    }
    verifierSession();
  }, []);

  function connexion(nouvelUtilisateur) {
    setUtilisateur(nouvelUtilisateur);
    appliquerTheme(nouvelUtilisateur.theme);
  }

  async function deconnexion() {
    try {
      await deconnexionApi();
    } catch {
      // on déconnecte localement même si l'appel réseau échoue
    }
    setUtilisateur(null);
  }

  function changerThemeLocal(theme) {
    setUtilisateur((precedent) => ({ ...precedent, theme }));
    appliquerTheme(theme);
  }

  useEffect(() => {
    definirGestionnaireDeconnexion(() => setUtilisateur(null));
  }, []);

  return (
    <AuthContext.Provider value={{ utilisateur, chargementInitial, connexion, deconnexion, changerThemeLocal }}>
      {children}
    </AuthContext.Provider>
  );
}