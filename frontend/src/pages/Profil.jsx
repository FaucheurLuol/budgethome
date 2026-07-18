import { useState, useEffect } from 'react';
import { useAuth } from '../context/useAuth';
import { obtenirMonFoyerApi, creerFoyerApi, rejoindreFoyerApi, quitterFoyerApi } from '../api/foyers';
import { changerMotDePasseApi } from '../api/auth';
import '../style/app.css';

function Profil() {
  const { utilisateur } = useAuth();
  const [foyer, setFoyer] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [message, setMessage] = useState('');
  const [codeSaisi, setCodeSaisi] = useState('');
  const [ancienMotDePasse, setAncienMotDePasse] = useState('');
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState('');
  const [confirmationMotDePasse, setConfirmationMotDePasse] = useState('');

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
    </div>
  );
}

export default Profil;