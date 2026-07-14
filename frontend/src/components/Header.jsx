import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

function Header() {
  const { utilisateur, deconnexion } = useAuth();
  const navigate = useNavigate();

  function gererDeconnexion() {
    deconnexion();
    navigate('/connexion');
  }

  return (
    <header>
      <span>BudgetHome</span>
      {utilisateur && (
        <div>
          <span>{utilisateur.nom}</span>
          <button onClick={gererDeconnexion}>Se déconnecter</button>
        </div>
      )}
    </header>
  );
}

export default Header;