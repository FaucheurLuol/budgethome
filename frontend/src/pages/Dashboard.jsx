import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  listerSoldesApi, listerEvolutionComptesCourantsApi, listerRepartitionApi, listerBudgetsDuMoisApi,
} from '../api/dashboard';
import { listerObjectifsApi } from '../api/objectifs';
import '../style/app.css';
import '../style/dashboard.css';

const COULEURS = ['#C9A227', '#6B8F87', '#8fbf8f', '#d98b7a', '#9CA69F', '#7a9bd9'];

function Dashboard() {
  const [soldes, setSoldes] = useState([]);
  const [evolution, setEvolution] = useState([]);
  const [revenusMois, setRevenusMois] = useState([]);
  const [depensesMois, setDepensesMois] = useState([]);
  const [revenusAnnee, setRevenusAnnee] = useState([]);
  const [depensesAnnee, setDepensesAnnee] = useState([]);
  const [objectifs, setObjectifs] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [compteFiltre, setCompteFiltre] = useState('');

  async function chargerCamemberts(compteId) {
    try {
      const [donneesRevenusMois, donneesDepensesMois, donneesRevenusAnnee, donneesDepensesAnnee] = await Promise.all([
        listerRepartitionApi('revenu', 'mois', compteId || null),
        listerRepartitionApi('depense', 'mois', compteId || null),
        listerRepartitionApi('revenu', 'annee', compteId || null),
        listerRepartitionApi('depense', 'annee', compteId || null),
      ]);
      setRevenusMois(donneesRevenusMois);
      setDepensesMois(donneesDepensesMois);
      setRevenusAnnee(donneesRevenusAnnee);
      setDepensesAnnee(donneesDepensesAnnee);
    } catch (err) {
      setErreur(err.message);
    }
  }


  useEffect(() => {
  if (chargement) return;
  // eslint-disable-next-line react-hooks/set-state-in-effect -- rechargement des camemberts déclenché par le changement de filtre compte
  chargerCamemberts(compteFiltre);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [compteFiltre]);

  useEffect(() => {
    async function chargerTout() {
      try {
        const [
          donneesSoldes, donneesEvolution, donneesRevenusMois, donneesDepensesMois,
          donneesRevenusAnnee, donneesDepensesAnnee, donneesObjectifs, donneesBudgets,
        ] = await Promise.all([
          listerSoldesApi(),
          listerEvolutionComptesCourantsApi(12),
          listerRepartitionApi('revenu', 'mois'),
          listerRepartitionApi('depense', 'mois'),
          listerRepartitionApi('revenu', 'annee'),
          listerRepartitionApi('depense', 'annee'),
          listerObjectifsApi(),
          listerBudgetsDuMoisApi(),
        ]);
        setSoldes(donneesSoldes);
        setEvolution(donneesEvolution);
        setRevenusMois(donneesRevenusMois);
        setDepensesMois(donneesDepensesMois);
        setRevenusAnnee(donneesRevenusAnnee);
        setDepensesAnnee(donneesDepensesAnnee);
        setObjectifs(donneesObjectifs);
        setBudgets(donneesBudgets);
      } catch (err) {
        setErreur(err.message);
      } finally {
        setChargement(false);
      }
    }
    chargerTout();
  }, []);

  function renduCamembert(donnees, titre) {
    const total = donnees.reduce((s, d) => s + d.total, 0);
    return (
      <div className="carte-camembert">
        <h3>{titre}</h3>
        {donnees.length === 0 ? (
          <p className="texte-vide">Aucune donnée</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={donnees}
                dataKey="total"
                nameKey="categorie"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
              >
                {donnees.map((entree, index) => (
                  <Cell key={entree.categorie} fill={COULEURS[index % COULEURS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(valeur) => `${(valeur / 100).toFixed(2)} €`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
        <p className="total-camembert">Total : {(total / 100).toFixed(2)} €</p>
      </div>
    );
  }

  if (chargement) return <p>Chargement...</p>;

  return (
    <div className="page-tableur">
      <h1>Dashboard</h1>
      <p className="page-sous-titre" style={{ textAlign: 'center' }}>Vue d'ensemble de votre situation financière.</p>

      {erreur && <p className="message-erreur">{erreur}</p>}

      <div className="dashboard-cartes-soldes">
        {soldes.map((c) => (
          <div key={c.id} className="carte-solde">
            <span>{c.nom}</span>
            <strong>{(c.solde_actuel / 100).toFixed(2)} €</strong>
          </div>
        ))}
      </div>

      <h2 className="dashboard-h2">Évolution des comptes courants</h2>
      <div className="dashboard-evolutions">
        {evolution.map((e) => (
          <div key={e.compte_id} className="carte-evolution">
            <h3>{e.nom}</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={e.points.map((p) => ({ ...p, soldeEuros: p.solde / 100 }))}>
                <XAxis dataKey="mois" stroke="var(--color-text-muted)" fontSize={12} />
                <YAxis stroke="var(--color-text-muted)" fontSize={12} />
                <Tooltip formatter={(valeur) => `${valeur.toFixed(2)} €`} />
                <Line type="monotone" dataKey="soldeEuros" stroke="#C9A227" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>

      <h2 className="dashboard-h2">Répartition par catégorie</h2>
      <div className="toolbar-camemberts">
        <select value={compteFiltre} onChange={(e) => setCompteFiltre(e.target.value)}>
          <option value="">Tous les comptes</option>
          {soldes.map((c) => (
            <option key={c.id} value={c.id}>{c.nom}</option>
          ))}
        </select>
      </div>
      <div className="dashboard-camemberts">
        {renduCamembert(revenusMois, 'Revenus — ce mois')}
        {renduCamembert(depensesMois, 'Dépenses — ce mois')}
        {renduCamembert(revenusAnnee, 'Revenus — cette année')}
        {renduCamembert(depensesAnnee, 'Dépenses — cette année')}
      </div>

      <h2 className="dashboard-h2">Objectifs d'épargne</h2>
      <ul className="dashboard-liste-objectifs">
        {objectifs.map((obj) => {
          const montantActuel = Number(obj.montant_actuel);
          const pourcentage = Math.min(100, Math.max(0, (montantActuel / obj.montant_cible) * 100));
          return (
            <li key={obj.id}>
              <span>{obj.nom}</span>
              <div className="objectif-barre-fond">
                <div className="objectif-barre-remplie" style={{ width: `${pourcentage}%` }} />
              </div>
              <span>{(montantActuel / 100).toFixed(0)} € / {(obj.montant_cible / 100).toFixed(0)} €</span>
            </li>
          );
        })}
      </ul>

      <h2 className="dashboard-h2">Budgets du mois</h2>
      <table className="table-generique">
        <thead>
          <tr>
            <th>Compte</th>
            <th>Catégorie</th>
            <th>Budget</th>
            <th>Dépensé</th>
            <th>Reste</th>
          </tr>
        </thead>
        <tbody>
          {budgets.map((b) => (
            <tr key={b.id}>
              <td>{b.compte_nom}</td>
              <td>{b.categorie_nom}</td>
              <td>{(b.budget / 100).toFixed(2)} €</td>
              <td>{(b.depense_reelle / 100).toFixed(2)} €</td>
              <td className={b.reste < 0 ? 'montant-depense' : 'montant-revenu'}>
                {(b.reste / 100).toFixed(2)} €
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Dashboard;