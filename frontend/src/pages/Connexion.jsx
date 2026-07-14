import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { connexionApi } from '../api/auth';
import { useAuth } from '../context/useAuth';

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
    <div>
      <h1>Connexion</h1>

      {erreur && <p className="message-erreur">{erreur}</p>}

      <form onSubmit={gererSoumission}>
        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="mot_de_passe">Mot de passe</label>
          <input
            id="mot_de_passe"
            type="password"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            required
          />
        </div>

        <button type="submit">Se connecter</button>
      </form>

      <p>Pas encore de compte ? <Link to="/inscription">S'inscrire</Link></p>
    </div>
  );
}

export default Connexion;