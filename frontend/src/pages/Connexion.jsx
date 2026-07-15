import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { connexionApi } from '../api/auth';
import { useAuth } from '../context/useAuth';
import '../style/auth.css';

function Connexion() {
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const { connexion } = useAuth();
  const navigate = useNavigate();

  async function gererSoumission(e) {
    e.preventDefault();
    setErreur('');

    try {
      const donnees = await connexionApi(email, motDePasse);
      connexion(donnees.token, donnees.utilisateur);
      navigate('/dashboard');
    } catch (err) {
      setErreur(err.message);
    }
  }

  return (
    <div className="page-auth">
      <h1>Connexion</h1>
      <p>Retrouvez votre espace BudgetHome.</p>

      {erreur && (
        <div className="form-message error">
          <p>{erreur}</p>
        </div>
      )}

      <form onSubmit={gererSoumission}>
        <label htmlFor="email">Email :</label>
        <input
          className="input-field"
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label htmlFor="mot_de_passe">Mot de passe :</label>
        <input
          className="input-field"
          id="mot_de_passe"
          type="password"
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          required
        />

        <button className="btn" type="submit">Se connecter</button>
      </form>

      <p>Pas encore de compte ? <Link to="/inscription">S'inscrire</Link></p>
    </div>
  );
}

export default Connexion;