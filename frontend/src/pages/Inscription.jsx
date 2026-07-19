import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { inscriptionApi } from '../api/auth';
import { useAuth } from '../context/useAuth';
import '../style/auth.css';

function Inscription() {
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [confirmationMotDePasse, setConfirmationMotDePasse] = useState('');
  const [message, setMessage] = useState({ texte: '', type: '' });
  const [chargement, setChargement] = useState(false);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const nomRegex = /^[a-zA-ZÀ-ÿ\s'-]{2,50}$/;
  const motDePasseRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+={}[\]|\\:;"'<>,.?/~`])[A-Za-z\d!@#$%^&*()_\-+={}[\]|\\:;"'<>,.?/~`]{14,}$/;

  const { connexion } = useAuth();
  const navigate = useNavigate();

  const afficherErreur = (texte) => setMessage({ texte, type: 'error' });

  async function gererSoumission(e) {
    e.preventDefault();
    setMessage({ texte: '', type: '' });

    if (!nom || !email || !motDePasse || !confirmationMotDePasse) {
      afficherErreur('Veuillez remplir tous les champs.');
      return;
    }

    if (!nomRegex.test(nom)) {
      afficherErreur('Le nom doit contenir entre 2 et 50 caractères alphabétiques, espaces, apostrophes ou tirets.');
      return;
    }

    if (!emailRegex.test(email)) {
      afficherErreur('Veuillez entrer une adresse email valide.');
      return;
    }

    if (!motDePasseRegex.test(motDePasse)) {
      afficherErreur('Le mot de passe doit contenir au moins 14 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial.');
      return;
    }

    if (motDePasse !== confirmationMotDePasse) {
      afficherErreur('Les mots de passe ne correspondent pas.');
      return;
    }

    setChargement(true);

    try {
      const donnees = await inscriptionApi(nom, email, motDePasse);
      connexion(donnees.utilisateur);
      navigate('/dashboard');
    } catch (err) {
      afficherErreur(err.message);
    } finally {
      setChargement(false);
    }
  }

  return (
    <div className="page-auth">
      <h1>Inscription</h1>
      <p>Créez votre compte pour accéder à BudgetHome.</p>

      {message.texte && (
        <div className={`form-message ${message.type}`}>
          <p>{message.texte}</p>
        </div>
      )}

      <form onSubmit={gererSoumission}>
        <label htmlFor="nom">Nom :</label>
        <input
          className="input-field"
          type="text"
          id="nom"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
        />

        <label htmlFor="email">Email :</label>
        <input
          className="input-field"
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label htmlFor="mot_de_passe">Mot de passe :</label>
        <input
          className="input-field"
          type="password"
          id="mot_de_passe"
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
        />

        <label htmlFor="confirmation_mot_de_passe">Confirmer le mot de passe :</label>
        <input
          className="input-field"
          type="password"
          id="confirmation_mot_de_passe"
          value={confirmationMotDePasse}
          onChange={(e) => setConfirmationMotDePasse(e.target.value)}
        />

        <button className="btn" type="submit" disabled={chargement}>S'inscrire</button>
      </form>

      <p>Déjà un compte ? <Link to="/connexion">Se connecter</Link></p>
    </div>
  );
}

export default Inscription;