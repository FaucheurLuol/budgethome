import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import '../style/sidebar.css';

function Sidebar({ ouverte, fermer }) {
  const { utilisateur, deconnexion } = useAuth();

  return (
    <aside className={`sidebar ${ouverte ? 'sidebar-ouverte' : ''}`}>
      <div className="sidebar-logo">Budget<span>Home</span></div>

      <nav className="sidebar-nav">
        <NavLink to="/dashboard" onClick={fermer} className="sidebar-lien">
          Dashboard
        </NavLink>
        <NavLink to="/comptes" onClick={fermer} className="sidebar-lien">
          Comptes
        </NavLink>
        <NavLink to="/categories" onClick={fermer} className="sidebar-lien">
          Catégories
        </NavLink>
        <NavLink to="/transactions" onClick={fermer} className="sidebar-lien">
          Transactions
        </NavLink>
        {/* futurs liens : Comptes, Transactions, Budgets, Objectifs, Simulation */}
      </nav>

      <div className="sidebar-utilisateur">
        <span>{utilisateur?.nom}</span>
        <button onClick={deconnexion} className="sidebar-deconnexion">
          Déconnexion
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;