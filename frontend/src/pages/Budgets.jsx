import { useState, useEffect, useCallback } from 'react';
import { listerComptesApi } from '../api/comptes';
import { listerCategoriesApi } from '../api/categories';
import {
  listerBudgetsDefautApi, creerBudgetDefautApi, supprimerBudgetDefautApi,
  genererBudgetsMensuelsApi, listerSuiviBudgetsApi, modifierBudgetMensuelApi, supprimerBudgetMensuelApi,
} from '../api/budgets';
import { aplatirPourSelect } from '../api/organiserCategories';

function moisActuelISO() {
  const maintenant = new Date();
  return `${maintenant.getFullYear()}-${String(maintenant.getMonth() + 1).padStart(2, '0')}-01`;
}

function Budgets() {
  const [comptes, setComptes] = useState([]);
  const [compteSelectionne, setCompteSelectionne] = useState('');
  const [categories, setCategories] = useState([]);
  const [budgetsDefaut, setBudgetsDefaut] = useState([]);
  const [suivi, setSuivi] = useState([]);
  const [mois, setMois] = useState(moisActuelISO());
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  const [nouvelleCategorieId, setNouvelleCategorieId] = useState('');
  const [nouveauMontant, setNouveauMontant] = useState('');

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
    try {
      const [donneesDefaut, donneesSuivi] = await Promise.all([
        listerBudgetsDefautApi(compteSelectionne),
        listerSuiviBudgetsApi(compteSelectionne, mois),
      ]);
      setBudgetsDefaut(donneesDefaut);
      setSuivi(donneesSuivi);
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
    <div>
      <h1>Budgets</h1>

      {erreur && <p className="message-erreur">{erreur}</p>}

      <div className="tableur-toolbar">
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

      <h2>Suivi du mois</h2>
      <table className="tableur">
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
              <td>
                <button onClick={() => gererModificationMensuel(ligne.id, ligne.budget)}>Modifier</button>
                <button onClick={() => gererSuppressionMensuel(ligne.id)}>Supprimer</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Budgets par défaut</h2>
      <ul>
        {budgetsDefaut.map((b) => {
          const categorie = categories.find((c) => c.id === b.categorie_id);
          return (
            <li key={b.id}>
              {categorie?.nom || '—'} — {(b.montant_par_defaut / 100).toFixed(2)} €
              <button onClick={() => gererSuppressionDefaut(b.id)}>Supprimer</button>
            </li>
          );
        })}
      </ul>

      <h3>Ajouter un budget par défaut</h3>
      <form onSubmit={gererAjoutDefaut}>
        <select value={nouvelleCategorieId} onChange={(e) => setNouvelleCategorieId(e.target.value)}>
          <option value="">Choisir une catégorie...</option>
          {categoriesDepense.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.nomAffiche}</option>
          ))}
        </select>
        <input
          type="number"
          step="0.01"
          placeholder="Montant (€)"
          value={nouveauMontant}
          onChange={(e) => setNouveauMontant(e.target.value)}
        />
        <button className="btn-primary" type="submit">Ajouter</button>
      </form>
    </div>
  );
}

export default Budgets;