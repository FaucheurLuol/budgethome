import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import '../style/landing.css';

function Header() {
  const { utilisateur, deconnexion } = useAuth();
  const navigate = useNavigate();

  function gererDeconnexion() {
    deconnexion();
    navigate('/connexion');
  }

  if (!utilisateur) {
    return (
      <header>
        <nav className="landing-nav">
          <Link to="/" className="nav-logo">Budget<span>Home</span></Link>
          <ul className="nav-liens">
            <li><Link to="/inscription">Inscription</Link></li>
            <li><Link to="/connexion">Connexion</Link></li>
          </ul>
        </nav>
      </header>
    );
  }

  return (
    <header>
      <nav className="landing-nav">
        <Link to="/dashboard" className="nav-logo">Budget<span>Home</span></Link>
        <div className="nav-liens">
          <span>{utilisateur.nom}</span>
          <button onClick={gererDeconnexion}>Se déconnecter</button>
        </div>
      </nav>
    </header>
  );
}

export default Header;