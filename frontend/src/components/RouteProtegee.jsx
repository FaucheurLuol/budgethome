import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

function RouteProtegee({ children }) {
  const { utilisateur, chargementInitial } = useAuth();

  if (chargementInitial) {
    return <p>Chargement...</p>;
  }

  if (!utilisateur) {
    return <Navigate to="/connexion" replace />;
  }

  return children;
}

export default RouteProtegee;