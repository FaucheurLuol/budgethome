import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { changerThemeApi } from '../api/auth';
import '../style/sidebar.css';

function Sidebar({ ouverte, fermer }) {
  const { utilisateur, deconnexion, changerThemeLocal } = useAuth();

  async function gererChangementTheme() {
    const nouveauTheme = utilisateur.theme === 'clair' ? 'sombre' : 'clair';
    changerThemeLocal(nouveauTheme);
    try {
      await changerThemeApi(nouveauTheme);
    } catch {
      // en cas d'échec réseau, le thème reste appliqué localement ; pas bloquant
    }
  }

  return (
    <aside className={`sidebar ${ouverte ? 'sidebar-ouverte' : ''}`}>
      <div className="sidebar-logo">Budget<span>Home</span></div>

      <nav className="sidebar-nav">
        <NavLink to="/dashboard" onClick={fermer} className="sidebar-lien">
          Dashboard
        </NavLink>
        <NavLink to="/transactions" onClick={fermer} className="sidebar-lien">
          Transactions
        </NavLink>
        <NavLink to="/budgets" onClick={fermer} className="sidebar-lien">
          Budgets
        </NavLink>
        <NavLink to="/objectifs" onClick={fermer} className="sidebar-lien">
          Objectifs
        </NavLink>
        <NavLink to="/categories" onClick={fermer} className="sidebar-lien">
          Catégories
        </NavLink>
        <NavLink to="/modeles" onClick={fermer} className="sidebar-lien">
          Modèles
        </NavLink>
        <NavLink to="/repartition" onClick={fermer} className="sidebar-lien">
          Répartition
        </NavLink>
        <NavLink to="/comptes" onClick={fermer} className="sidebar-lien">
          Comptes
        </NavLink>
        <NavLink to="/comptes-archives" onClick={fermer} className="sidebar-lien">
          Archives
        </NavLink>
      </nav>

      <button className="bouton-theme" onClick={gererChangementTheme}>
        {utilisateur?.theme === 'clair' ? '🌙 Mode sombre' : '☀️ Mode clair'}
      </button>

      <div className="sidebar-utilisateur">
        <NavLink to="/profil" onClick={fermer} className="sidebar-lien">
          <span>{utilisateur?.nom}</span>
        </NavLink>
        <button onClick={deconnexion} className="sidebar-deconnexion">
          Déconnexion
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;