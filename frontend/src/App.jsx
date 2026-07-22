import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import RouteProtegee from './components/RouteProtegee';
import Accueil from './pages/Accueil';
import Connexion from './pages/Connexion';
import Inscription from './pages/Inscription';
import Dashboard from './pages/Dashboard';
import Comptes from './pages/Comptes';
import Categories from './pages/Categories';
import Transactions from './pages/Transactions';
import Budgets from './pages/Budgets';
import Objectifs from './pages/Objectifs';
import Modeles from './pages/Modeles';
import Repartition from './pages/Repartition';
import Archives from './pages/ComptesArchives';
import Profil from './pages/Profil';

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
        <Route
          path="/categories"
          element={
            <RouteProtegee>
              <Categories />
            </RouteProtegee>
          }
        />
        <Route
          path="/transactions"
          element={
            <RouteProtegee>
              <Transactions />
            </RouteProtegee>
          }
        />
        <Route
          path="/budgets"
          element={
            <RouteProtegee>
              <Budgets />
            </RouteProtegee>
          }
        />
        <Route
          path="/objectifs"
          element={
            <RouteProtegee>
              <Objectifs />
            </RouteProtegee>
          }
        />
        <Route
          path="/modeles"
          element={
            <RouteProtegee>
              <Modeles />
            </RouteProtegee>
          }
        />
        <Route
          path="/repartition"
          element={
            <RouteProtegee>
              <Repartition />
            </RouteProtegee>
          }
        />
        <Route
          path="/archives"
          element={
            <RouteProtegee>
              <Archives />
            </RouteProtegee>
          }
        />
        <Route
          path="/profil"
          element={
            <RouteProtegee>
              <Profil />
            </RouteProtegee>
          }
        />
      </Route>
    </Routes>
  );
}

export default App;