import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import RouteProtegee from './components/RouteProtegee';
import Accueil from './pages/Accueil';
import Connexion from './pages/Connexion';
import Inscription from './pages/Inscription';
import Dashboard from './pages/Dashboard';
import Comptes from './pages/Comptes';

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
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
        <Route
          path="/comptes"
          element={
            <RouteProtegee>
              <Comptes />
            </RouteProtegee>
          }
        />
      </Route>
    </Routes>
  );
}

export default App;