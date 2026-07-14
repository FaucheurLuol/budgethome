import { Routes, Route } from 'react-router-dom';
import RouteProtegee from './components/RouteProtegee';
import Accueil from './pages/Accueil';
import Connexion from './pages/Connexion';
import Inscription from './pages/Inscription';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Accueil />} />
      <Route path="/connexion" element={<Connexion />} />
      <Route path="/inscription" element={<Inscription />} />
      <Route
        path="/dashboard"
        element={
          <RouteProtegee>
            <Dashboard />
          </RouteProtegee>
        }
      />
    </Routes>
  );
}

export default App;