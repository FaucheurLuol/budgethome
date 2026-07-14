import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

function RouteProtegee({ children }) {
  const { token } = useAuth();

  if (!token) {
    return <Navigate to="/connexion" replace />;
  }

  return children;
}

export default RouteProtegee;