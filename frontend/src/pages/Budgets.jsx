import { useState, useEffect, useCallback } from 'react';
import { listerComptesApi } from '../api/comptes';
import { listerCategoriesApi } from '../api/categories';
import {
  listerBudgetsDefautApi, creerBudgetDefautApi, supprimerBudgetDefautApi,
  genererBudgetsMensuelsApi, listerSuiviBudgetsApi, modifierBudgetMensuelApi,
  supprimerBudgetMensuelApi, obtenirSoldeRestantApi,
} from '../api/budgets';
import { aplatirPourSelect } from '../api/organiserCategories';
import '../style/app.css';

function moisActuelISO() {
  const maintenant = new Date();
  return `${maintenant.getFullYear()}-${String(maintenant.getMonth() + 1).padStart(2, '0')}-01`;
}

function Budgets() {
  const [comptes, setComptes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [budgetsDefaut, setBudgetsDefaut] = useState([]);
  const [suivi, setSuivi] = useState([]);
  const [mois, setMois] = useState(moisActuelISO());
  const [compteSelectionne, setCompteSelectionne] = useState('');
  const [erreur, setErreur] = useState('');
  const [nouvelleCategorieId, setNouvelleCategorieId] = useState('');
  const [nouveauMontant, setNouveauMontant] = useState('');
  const [chargement, setChargement] = useState(true);
  const [soldeRestant, setSoldeRestant] = useState(null);

  useEffect(() => {
    async function chargerInit() {
      try {
        const [donneesComptes, donneesCategories] = await Promise.all([
          listerComptesApi(),
          listerCategoriesApi(),
        ]);
        setComptes(donneesComptes);
        setCategories(donneesCategories);
        if (donneesComptes.length > 0) {
          setCompteSelectionne(String(donneesComptes[0].id));
        }
      } catch (err) {
        setErreur(err.message);
      } finally {
        setChargement(false);
      }
    }
    chargerInit();
  }, []);

  const chargerBudgets = useCallback(async () => {
    if (!compteSelectionne) return;
    setErreur('');
    try {
      const [donneesDefaut, donneesSuivi] = await Promise.all([
        listerBudgetsDefautApi(compteSelectionne),
        listerSuiviBudgetsApi(compteSelectionne, mois),
      ]);
      setBudgetsDefaut(donneesDefaut);
      setSuivi(donneesSuivi);

      try {
        const donneesSoldeRestant = await obtenirSoldeRestantApi(compteSelectionne, mois);
        setSoldeRestant(donneesSoldeRestant);
      } catch {
        setSoldeRestant(null);
      }
    } catch (err) {
      setErreur(err.message);
    }
  }, [compteSelectionne, mois]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch déclenché par le changement de compte ou de mois sélectionné, pattern de chargement de données classique
    chargerBudgets();
  }, [chargerBudgets]);

  const categoriesDepense = aplatirPourSelect(categories.filter((c) => c.type_categorie === 'depense'));

  async function gererAjoutDefaut(e) {
    e.preventDefault();
    setErreur('');
    try {
      if (!nouvelleCategorieId || !nouveauMontant) {
        setErreur('Catégorie et montant sont requis.');
        return;
      }
      await creerBudgetDefautApi({
        compte_id: Number(compteSelectionne),
        categorie_id: Number(nouvelleCategorieId),
        montant_par_defaut: Math.round(parseFloat(nouveauMontant) * 100),
      });
      setNouvelleCategorieId('');
      setNouveauMontant('');
      chargerBudgets();
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function gererSuppressionDefaut(id) {
    try {
      await supprimerBudgetDefautApi(id);
      chargerBudgets();
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function gererGeneration() {
    try {
      await genererBudgetsMensuelsApi(compteSelectionne, mois);
      chargerBudgets();
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function gererModificationMensuel(id, montantActuel) {
    const nouveauMontantEuros = prompt('Nouveau montant (€) :', (montantActuel / 100).toFixed(2));
    if (nouveauMontantEuros === null) return;
    try {
      await modifierBudgetMensuelApi(id, Math.round(parseFloat(nouveauMontantEuros) * 100));
      chargerBudgets();
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function gererSuppressionMensuel(id) {
    try {
      await supprimerBudgetMensuelApi(id);
      chargerBudgets();
    } catch (err) {
      setErreur(err.message);
    }
  }

  if (chargement) return <p>Chargement...</p>;

  return (
    <div className="page-app">
      <h1>Budgets</h1>
      <p className="page-sous-titre">Suivez vos budgets par catégorie et anticipez les dépassements.</p>

      {erreur && <p className="message-erreur">{erreur}</p>}

      <div className="toolbar-generique">
        <select value={compteSelectionne} onChange={(e) => setCompteSelectionne(e.target.value)}>
          {comptes.map((c) => (
            <option key={c.id} value={c.id}>{c.nom}</option>
          ))}
        </select>

        <input type="month" value={mois.slice(0, 7)} onChange={(e) => setMois(`${e.target.value}-01`)} />

        <button className="btn-primary" onClick={gererGeneration}>
          Générer les budgets du mois
        </button>
      </div>

      {soldeRestant && soldeRestant.solde_restant !== null && (
        <div className="carte-solde-principale">
          <div className="solde-bloc">
            <span className="solde-label">Solde restant à budgétiser</span>
            <strong className="solde-valeur">{(soldeRestant.solde_restant / 100).toFixed(2)} €</strong>
          </div>
        </div>
      )}
      {soldeRestant && soldeRestant.solde_restant === null && (
        <p className="page-sous-titre" style={{ textAlign: 'center' }}>
          Aucune répartition active — activez-en une sur la page Répartition pour voir votre solde restant.
        </p>
      )}

      <h2>Suivi du mois</h2>
      <table className="table-generique">
        <thead>
          <tr>
            <th>Catégorie</th>
            <th>Budget</th>
            <th>Dépensé</th>
            <th>Reste</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {suivi.map((ligne) => (
            <tr key={ligne.id}>
              <td>{ligne.categorie_nom}</td>
              <td>{(ligne.budget / 100).toFixed(2)} €</td>
              <td>{(ligne.depense_reelle / 100).toFixed(2)} €</td>
              <td className={ligne.reste < 0 ? 'montant-depense' : 'montant-revenu'}>
                {(ligne.reste / 100).toFixed(2)} €
              </td>
              <td className="actions-cell">
                <button className="bouton-discret" onClick={() => gererModificationMensuel(ligne.id, ligne.budget)}>Modifier</button>
                <button className="bouton-discret" onClick={() => gererSuppressionMensuel(ligne.id)}>Supprimer</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Budgets par défaut</h2>
      <ul className="liste-simple">
        {budgetsDefaut.map((b) => {
          const categorie = categories.find((c) => c.id === b.categorie_id);
          return (
            <li key={b.id}>
              <span>{categorie?.nom || '—'} — {(b.montant_par_defaut / 100).toFixed(2)} €</span>
              <button className="bouton-discret" onClick={() => gererSuppressionDefaut(b.id)}>Supprimer</button>
            </li>
          );
        })}
      </ul>

      <h3>Ajouter un budget par défaut</h3>
      <form className="formulaire-carte" onSubmit={gererAjoutDefaut}>
        <label htmlFor="categorie_defaut">Catégorie :</label>
        <select id="categorie_defaut" value={nouvelleCategorieId} onChange={(e) => setNouvelleCategorieId(e.target.value)}>
          <option value="">Choisir une catégorie...</option>
          {categoriesDepense.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.nomAffiche}</option>
          ))}
        </select>

        <label htmlFor="montant_defaut">Montant (€) :</label>
        <input
          id="montant_defaut"
          type="number"
          step="0.01"
          min="0.01"
          value={nouveauMontant}
          onChange={(e) => setNouveauMontant(e.target.value)}
        />

        <button className="btn-primary" type="submit">Ajouter</button>
      </form>
    </div>
  );
}

export default Budgets;