import { useState, useEffect, useMemo, useCallback } from 'react';
import { listerComptesApi } from '../api/comptes';
import { listerCategoriesApi } from '../api/categories';
import { aplatirPourSelect } from '../api/organiserCategories';
import { listerTransactionsApi, creerTransactionApi, supprimerTransactionApi } from '../api/transactions';
import '../style/tableur.css';

const MOYENS_PAIEMENT = ['CB', 'Virement', 'Especes', 'Prelevement', 'Cheque'];
const TYPES_REVENU = ['salaire', 'prime', 'caf', 'remboursement', 'epargne'];

function ligneVide() {
  return {
    date: new Date().toISOString().slice(0, 10),
    montant: '',
    description: '',
    moyen_paiement: 'CB',
    categorie_id: '',
    type_transaction: 'depense',
    type_revenu: '',
  };
}

function Transactions() {
  const [comptes, setComptes] = useState([]);
  const [compteSelectionne, setCompteSelectionne] = useState('');
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [nouvelleLigne, setNouvelleLigne] = useState(ligneVide());

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

  const chargerTransactions = useCallback(async () => {
    try {
        const donnees = await listerTransactionsApi(compteSelectionne);
        setTransactions(donnees);
    } catch (err) {
        setErreur(err.message);
    }
  }, [compteSelectionne]);

  useEffect(() => {
    if (!compteSelectionne) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch déclenché par le changement de compte sélectionné, pattern de chargement de données classique
    chargerTransactions();
  }, [compteSelectionne, chargerTransactions]);

  const compte = comptes.find((c) => c.id === Number(compteSelectionne));

  // Solde progressif : on trie du plus ancien au plus récent pour calculer le cumul,
  // puis on ré-affiche du plus récent au plus ancien (convention tableur classique).
  const transactionsAvecSolde = useMemo(() => {
    const triAsc = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date) || a.id - b.id);
    const soldeDepart = compte ? compte.solde_initial : 0;

    const avecSolde = triAsc.reduce((accumulateur, t) => {
      const soldePrecedent = accumulateur.length > 0
        ? accumulateur[accumulateur.length - 1].soldeApres
        : soldeDepart;
      const soldeApres = soldePrecedent + (t.type_transaction === 'revenu' ? t.montant : -t.montant);
      return [...accumulateur, { ...t, soldeApres }];
  }, []);

  return avecSolde.reverse();
}, [transactions, compte]);

  const soldeActuel = transactionsAvecSolde.length > 0
    ? transactionsAvecSolde[0].soldeApres
    : (compte ? compte.solde_initial : 0);

  const categoriesFiltrees = aplatirPourSelect(
    categories.filter((c) => c.type_categorie === nouvelleLigne.type_transaction)
  );

  async function gererAjout() {
    setErreur('');
    try {
      if (!nouvelleLigne.montant || !nouvelleLigne.categorie_id) {
        setErreur('Montant et catégorie sont requis.');
        return;
      }

      await creerTransactionApi({
        date: nouvelleLigne.date,
        montant: Math.round(parseFloat(nouvelleLigne.montant) * 100),
        description: nouvelleLigne.description || null,
        moyen_paiement: nouvelleLigne.moyen_paiement,
        categorie_id: Number(nouvelleLigne.categorie_id),
        compte_id: Number(compteSelectionne),
        type_transaction: nouvelleLigne.type_transaction,
        type_revenu: nouvelleLigne.type_transaction === 'revenu' ? nouvelleLigne.type_revenu : null,
      });

      setNouvelleLigne(ligneVide());
      chargerTransactions();
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function gererSuppression(id) {
    try {
      await supprimerTransactionApi(id);
      chargerTransactions();
    } catch (err) {
      setErreur(err.message);
    }
  }

  function majNouvelleLigne(champ, valeur) {
    setNouvelleLigne((precedent) => ({
      ...precedent,
      [champ]: valeur,
      ...(champ === 'type_transaction' ? { categorie_id: '', type_revenu: '' } : {}),
    }));
  }

  if (chargement) return <p>Chargement...</p>;

  return (
    <div>
      <h1>Transactions</h1>

      {erreur && <p className="message-erreur">{erreur}</p>}

      <div className="tableur-toolbar">
        <select
          className="tableur-select-compte"
          value={compteSelectionne}
          onChange={(e) => setCompteSelectionne(e.target.value)}
        >
          {comptes.map((c) => (
            <option key={c.id} value={c.id}>{c.nom}</option>
          ))}
        </select>

        <div className="tableur-solde">
          Solde : <span>{(soldeActuel / 100).toFixed(2)} €</span>
        </div>
      </div>

      <div className="tableur-wrapper">
        <table className="tableur">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Catégorie</th>
              <th>Description</th>
              <th>Moyen</th>
              <th>Montant</th>
              <th>Solde</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr className="ligne-ajout">
              <td>
                <input
                  type="date"
                  value={nouvelleLigne.date}
                  onChange={(e) => majNouvelleLigne('date', e.target.value)}
                />
              </td>
              <td>
                <select
                  value={nouvelleLigne.type_transaction}
                  onChange={(e) => majNouvelleLigne('type_transaction', e.target.value)}
                >
                  <option value="depense">Dépense</option>
                  <option value="revenu">Revenu</option>
                </select>
              </td>
              <td>
                <select
                  value={nouvelleLigne.categorie_id}
                  onChange={(e) => majNouvelleLigne('categorie_id', e.target.value)}
                >
                  <option value="">Choisir...</option>
                  {categoriesFiltrees.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.nomAffiche}</option>
                  ))}
                </select>
              </td>
              <td>
                <input
                  type="text"
                  value={nouvelleLigne.description}
                  onChange={(e) => majNouvelleLigne('description', e.target.value)}
                />
              </td>
              <td>
                <select
                  value={nouvelleLigne.moyen_paiement}
                  onChange={(e) => majNouvelleLigne('moyen_paiement', e.target.value)}
                >
                  {MOYENS_PAIEMENT.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </td>
              <td>
                <input
                  type="number"
                  step="0.01"
                  value={nouvelleLigne.montant}
                  onChange={(e) => majNouvelleLigne('montant', e.target.value)}
                />
              </td>
              <td colSpan={2}>
                {nouvelleLigne.type_transaction === 'revenu' && (
                  <select
                    value={nouvelleLigne.type_revenu}
                    onChange={(e) => majNouvelleLigne('type_revenu', e.target.value)}
                  >
                    <option value="">Type de revenu...</option>
                    {TYPES_REVENU.map((tr) => (
                      <option key={tr} value={tr}>{tr}</option>
                    ))}
                  </select>
                )}
                <button className="btn-ajouter-ligne" onClick={gererAjout}>Ajouter</button>
              </td>
            </tr>

            {transactionsAvecSolde.map((t) => (
              <tr key={t.id}>
                <td>{t.date}</td>
                <td>{t.type_transaction === 'revenu' ? 'Revenu' : 'Dépense'}</td>
                <td>{categories.find((c) => c.id === t.categorie_id)?.nom || '—'}</td>
                <td>{t.description || '—'}</td>
                <td>{t.moyen_paiement}</td>
                <td className={t.type_transaction === 'revenu' ? 'montant-revenu' : 'montant-depense'}>
                  {t.type_transaction === 'revenu' ? '+' : '-'}{(t.montant / 100).toFixed(2)} €
                </td>
                <td className="solde-cell">{(t.soldeApres / 100).toFixed(2)} €</td>
                <td>
                  <button className="btn-supprimer-ligne" onClick={() => gererSuppression(t.id)}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Transactions;