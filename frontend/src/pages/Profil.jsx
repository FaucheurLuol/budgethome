import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { exporterDonneesApi, supprimerCompteApi } from '../api/rgpd';
import { useAuth } from '../context/useAuth';
import { obtenirMonFoyerApi, creerFoyerApi, rejoindreFoyerApi, quitterFoyerApi } from '../api/foyers';
import { changerMotDePasseApi } from '../api/auth';
import '../style/app.css';

function Profil() {
  const navigate = useNavigate();
  const { utilisateur } = useAuth();
  const [foyer, setFoyer] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [afficherSuppression, setAfficherSuppression] = useState(false);
  const [erreur, setErreur] = useState('');
  const [message, setMessage] = useState('');
  const [codeSaisi, setCodeSaisi] = useState('');
  const [ancienMotDePasse, setAncienMotDePasse] = useState('');
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState('');
  const [confirmationMotDePasse, setConfirmationMotDePasse] = useState('');
  const [motDePasseSuppression, setMotDePasseSuppression] = useState('');
  const [confirmationSuppression, setConfirmationSuppression] = useState('');

  useEffect(() => {
    chargerFoyer();
  }, []);

  async function chargerFoyer() {
    try {
      const donnees = await obtenirMonFoyerApi();
      setFoyer(donnees);
    } catch (err) {
      setErreur(err.message);
    } finally {
      setChargement(false);
    }
  }

  async function gererCreationFoyer() {
    setErreur('');
    setMessage('');
    try {
      const donnees = await creerFoyerApi();
      setFoyer(donnees);
      setMessage('Foyer créé avec succès.');
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function gererRejoindre(e) {
    e.preventDefault();
    setErreur('');
    setMessage('');
    try {
      await rejoindreFoyerApi(codeSaisi);
      setMessage('Foyer rejoint avec succès.');
      chargerFoyer();
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function gererQuitterFoyer() {
    const confirmation = window.confirm('Quitter votre foyer ? Vos comptes déjà partagés resteront inchangés, mais vous ne verrez plus les autres membres dans vos sélecteurs de partage.');
    if (!confirmation) return;

    setErreur('');
    setMessage('');
    try {
        await quitterFoyerApi();
        setFoyer(null);
        setMessage('Vous avez quitté le foyer.');
    } catch (err) {
        setErreur(err.message);
    }
  }

  async function gererChangementMotDePasse(e) {
    e.preventDefault();
    setErreur('');
    setMessage('');

    if (nouveauMotDePasse !== confirmationMotDePasse) {
      setErreur('Les nouveaux mots de passe ne correspondent pas.');
      return;
    }

    try {
      await changerMotDePasseApi(ancienMotDePasse, nouveauMotDePasse);
      setMessage('Mot de passe modifié avec succès.');
      setAncienMotDePasse('');
      setNouveauMotDePasse('');
      setConfirmationMotDePasse('');
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function gererExportDonnees() {
    try {
      const donnees = await exporterDonneesApi();
      const blob = new Blob([JSON.stringify(donnees, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const lien = document.createElement('a');
      lien.href = url;
      lien.download = `budgethome-export-${new Date().toISOString().slice(0, 10)}.json`;
      lien.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function gererSuppressionCompte(e) {
    e.preventDefault();
    setErreur('');

    if (confirmationSuppression !== 'SUPPRIMER') {
      setErreur('Vous devez saisir exactement "SUPPRIMER" pour confirmer.');
      return;
    }

    try {
      await supprimerCompteApi(motDePasseSuppression, confirmationSuppression);
      navigate('/');
    } catch (err) {
      setErreur(err.message);
    }
  }

  if (chargement) return <p>Chargement...</p>;

  return (
    <div className="page-app">
      <h1>Profil</h1>
      <p className="page-sous-titre">{utilisateur?.nom}</p>

      {erreur && <p className="message-erreur">{erreur}</p>}
      {message && <p style={{ textAlign: 'center', color: 'var(--color-accent)' }}>{message}</p>}

      <section className="section-profil">
        <h2>Mon foyer</h2>
        {foyer ? (
          <div className="formulaire-carte" style={{ textAlign: 'center' }}>
            <p>Vous faites partie d'un foyer.</p>
            <p>Code d'invitation à partager :</p>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--color-accent)', letterSpacing: '0.1em' }}>
              {foyer.code_invitation}
            </p>
            <p className="page-sous-titre">Donnez ce code à la personne que vous voulez inviter dans votre foyer.</p>
            <button className="bouton-discret" onClick={gererQuitterFoyer}>Quitter le foyer</button>
          </div>
        ) : (
          <div className="formulaire-carte">
            <p style={{ textAlign: 'center', marginBottom: '20px' }}>
              Vous n'appartenez à aucun foyer. Créez-en un, ou rejoignez celui de votre conjoint(e) avec son code.
            </p>
            <button className="btn-primary" onClick={gererCreationFoyer}>Créer mon foyer</button>
            <form onSubmit={gererRejoindre} style={{ marginTop: '24px' }}>
              <label htmlFor="code">Code d'invitation :</label>
              <input
                id="code"
                type="text"
                value={codeSaisi}
                onChange={(e) => setCodeSaisi(e.target.value)}
                placeholder="Ex: A1B2C3D4E5F6"
              />
              <button className="btn-primary" type="submit">Rejoindre ce foyer</button>
            </form>
          </div>
        )}
      </section>

      <section className="section-profil">
        <h2>Changer mon mot de passe</h2>
        <form className="formulaire-carte" onSubmit={gererChangementMotDePasse}>
          <label htmlFor="ancien">Mot de passe actuel :</label>
          <input
            id="ancien"
            type="password"
            value={ancienMotDePasse}
            onChange={(e) => setAncienMotDePasse(e.target.value)}
            required
          />

          <label htmlFor="nouveau">Nouveau mot de passe :</label>
          <input
            id="nouveau"
            type="password"
            value={nouveauMotDePasse}
            onChange={(e) => setNouveauMotDePasse(e.target.value)}
            required
          />

          <label htmlFor="confirmation">Confirmer le nouveau mot de passe :</label>
          <input
            id="confirmation"
            type="password"
            value={confirmationMotDePasse}
            onChange={(e) => setConfirmationMotDePasse(e.target.value)}
            required
          />

          <button className="btn-primary" type="submit">Modifier le mot de passe</button>
        </form>
      </section>
      <section className="section-profil">
        <h2>Mes données (RGPD)</h2>
        <div className="formulaire-carte" style={{ textAlign: 'center' }}>
          <p className="page-sous-titre">
            Conformément au RGPD, vous pouvez exporter toutes vos données personnelles ou supprimer définitivement votre compte à tout moment.
          </p>

          <button className="btn-primary" onClick={gererExportDonnees}>
            Exporter mes données
          </button>

          {!afficherSuppression ? (
            <button
              className="bouton-discret"
              style={{ marginTop: '20px', borderColor: '#d98b7a', color: '#d98b7a' }}
              onClick={() => setAfficherSuppression(true)}
            >
              Supprimer mon compte
            </button>
          ) : (
            <form onSubmit={gererSuppressionCompte} style={{ marginTop: '20px', textAlign: 'left' }}>
              <p className="message-erreur">
                Cette action est irréversible. Toutes vos données personnelles seront définitivement supprimées.
              </p>

              <label htmlFor="mdp_suppression">Confirmez avec votre mot de passe :</label>
              <input
                id="mdp_suppression"
                type="password"
                value={motDePasseSuppression}
                onChange={(e) => setMotDePasseSuppression(e.target.value)}
                required
              />

              <label htmlFor="confirmation_suppression">Saisissez "SUPPRIMER" pour confirmer :</label>
              <input
                id="confirmation_suppression"
                type="text"
                value={confirmationSuppression}
                onChange={(e) => setConfirmationSuppression(e.target.value)}
                required
              />

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button type="submit" className="btn-primary" style={{ backgroundColor: '#d98b7a' }}>
                  Confirmer la suppression définitive
                </button>
                <button type="button" className="bouton-discret" onClick={() => setAfficherSuppression(false)}>
                  Annuler
                </button>
              </div>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}

export default Profil;