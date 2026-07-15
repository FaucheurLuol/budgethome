import { Link } from 'react-router-dom';
import '../style/landing.css';

function Header() {
  return (
    <header className="site-header">
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

export default Header;