import { useState, useEffect, useMemo, useCallback } from 'react';
import { listerComptesApi } from '../api/comptes';
import { listerCategoriesApi } from '../api/categories';
import { listerObjectifsApi, creerAllocationApi } from '../api/objectifs';
import {
  listerTransactionsApi, creerTransactionApi, supprimerTransactionApi,
  creerRetraitEpargneApi, creerVirementEpargneApi,
} from '../api/transactions';
import { aplatirPourSelect } from '../api/organiserCategories';
import '../style/tableur.css';

const MOYENS_PAIEMENT = ['CB', 'Virement', 'Especes', 'Prelevement', 'Cheque'];

function ligneVide() {
  return {
    date: new Date().toISOString().slice(0, 10),
    montant: '',
    description: '',
    moyen_paiement: 'CB',
    categorie_id: '',
    type_transaction: 'depense',
    objectif_id: '',
    montant_fleche: '',
    est_virement_epargne: false,
    compte_epargne_id: '',
  };
}

function Transactions() {
  const [comptes, setComptes] = useState([]);
  const [compteSelectionne, setCompteSelectionne] = useState('');
  const [categories, setCategories] = useState([]);
  const [objectifs, setObjectifs] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [nouvelleLigne, setNouvelleLigne] = useState(ligneVide());

  useEffect(() => {
    async function chargerInit() {
      try {
        const [donneesComptes, donneesCategories, donneesObjectifs] = await Promise.all([
          listerComptesApi(),
          listerCategoriesApi(),
          listerObjectifsApi(),
        ]);
        setComptes(donneesComptes);
        setCategories(donneesCategories);
        setObjectifs(donneesObjectifs);
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

  async function rechargerCategories() {
    try {
      const donnees = await listerCategoriesApi();
      setCategories(donnees);
    } catch (err) {
      setErreur(err.message);
    }
  }

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch déclenché par le changement de compte sélectionné
    chargerTransactions();
  }, [compteSelectionne, chargerTransactions]);

  const compte = comptes.find((c) => c.id === Number(compteSelectionne));
  const estCompteEpargne = compte && compte.type_compte !== 'Compte courant';
  const comptesEpargneDisponibles = comptes.filter(
  (c) => c.type_compte !== 'Compte courant' && c.id !== Number(compteSelectionne)
);

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
      const montantCentimes = Math.round(parseFloat(nouvelleLigne.montant) * 100);

      if (nouvelleLigne.est_virement_epargne) {
        if (!nouvelleLigne.compte_epargne_id) {
          setErreur('Sélectionnez le livret de destination.');
          return;
        }

        await creerVirementEpargneApi({
          date: nouvelleLigne.date,
          montant: montantCentimes,
          description: nouvelleLigne.description || null,
          compte_courant_id: Number(compteSelectionne),
          compte_epargne_id: Number(nouvelleLigne.compte_epargne_id),
          objectif_id: nouvelleLigne.objectif_id ? Number(nouvelleLigne.objectif_id) : null,
          montant_fleche: nouvelleLigne.objectif_id ? montantCentimes : null,
        });
      } else {
        const estRetraitEpargne = estCompteEpargne && nouvelleLigne.type_transaction === 'depense';

        if (estRetraitEpargne) {
          if (!nouvelleLigne.objectif_id || !nouvelleLigne.montant_fleche) {
            setErreur('Un retrait depuis un compte d\'épargne doit obligatoirement être fléché vers un objectif.');
            return;
          }

          await creerRetraitEpargneApi({
            date: nouvelleLigne.date,
            montant: montantCentimes,
            description: nouvelleLigne.description || null,
            moyen_paiement: 'Virement',
            categorie_id: Number(nouvelleLigne.categorie_id),
            compte_id: Number(compteSelectionne),
            objectif_id: Number(nouvelleLigne.objectif_id),
            montant_fleche: Math.round(parseFloat(nouvelleLigne.montant_fleche) * 100),
          });
        } else {
          const nouvelleTransaction = await creerTransactionApi({
            date: nouvelleLigne.date,
            montant: montantCentimes,
            description: nouvelleLigne.description || null,
            moyen_paiement: estCompteEpargne ? 'Virement' : nouvelleLigne.moyen_paiement,
            categorie_id: Number(nouvelleLigne.categorie_id),
            compte_id: Number(compteSelectionne),
            type_transaction: nouvelleLigne.type_transaction,
          });

          if (estCompteEpargne && nouvelleLigne.type_transaction === 'revenu' && nouvelleLigne.objectif_id && nouvelleLigne.montant_fleche) {
            await creerAllocationApi(
              Number(nouvelleLigne.objectif_id),
              nouvelleTransaction.id,
              Math.round(parseFloat(nouvelleLigne.montant_fleche) * 100)
            );
          }
        }
      }

      await rechargerCategories();
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
      ...(champ === 'type_transaction' ? { categorie_id: '', objectif_id: '', montant_fleche: '' } : {}),
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
              <th style={{ width: '10%' }}>Date</th>
              <th style={{ width: '9%' }}>Type</th>
              <th style={{ width: '16%' }}>Catégorie</th>
              <th style={{ width: '20%' }}>Description</th>
              {!estCompteEpargne && <th style={{ width: '10%' }}>Moyen</th>}
              {estCompteEpargne && <th style={{ width: '16%' }}>Objectif</th>}
              <th style={{ width: '11%' }}>Montant</th>
              <th style={{ width: '11%' }}>Solde</th>
              <th style={{ width: '5%' }}></th>
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
              {!nouvelleLigne.est_virement_epargne && (
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
              )}
              {nouvelleLigne.est_virement_epargne && <td>Épargne (auto)</td>}
              <td>
                <input
                  type="text"
                  value={nouvelleLigne.description}
                  onChange={(e) => majNouvelleLigne('description', e.target.value)}
                />
              </td>

              {!estCompteEpargne && (
                <td>
                  {nouvelleLigne.type_transaction === 'depense' && (
                    <label className="checkbox-virement">
                      <input
                        type="checkbox"
                        checked={nouvelleLigne.est_virement_epargne}
                        onChange={(e) => majNouvelleLigne('est_virement_epargne', e.target.checked)}
                      />
                      Vers l'épargne
                    </label>
                  )}

                  {nouvelleLigne.est_virement_epargne ? (
                    <>
                      <select
                        value={nouvelleLigne.compte_epargne_id}
                        onChange={(e) => majNouvelleLigne('compte_epargne_id', e.target.value)}
                      >
                        <option value="">Quel livret...</option>
                        {comptesEpargneDisponibles.map((c) => (
                          <option key={c.id} value={c.id}>{c.nom}</option>
                        ))}
                      </select>
                      <select
                        value={nouvelleLigne.objectif_id}
                        onChange={(e) => majNouvelleLigne('objectif_id', e.target.value)}
                      >
                        <option value="">Objectif (optionnel)...</option>
                        {objectifs.map((obj) => (
                          <option key={obj.id} value={obj.id}>{obj.nom}</option>
                        ))}
                      </select>
                    </>
                  ) : (
                    <select
                      value={nouvelleLigne.moyen_paiement}
                      onChange={(e) => majNouvelleLigne('moyen_paiement', e.target.value)}
                    >
                      {MOYENS_PAIEMENT.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  )}
                </td>
              )}

              {estCompteEpargne && (
                <td>
                  <select
                    value={nouvelleLigne.objectif_id}
                    onChange={(e) => majNouvelleLigne('objectif_id', e.target.value)}
                  >
                    <option value="">
                      {nouvelleLigne.type_transaction === 'depense' ? 'Obligatoire...' : 'Optionnel...'}
                    </option>
                    {objectifs.map((obj) => (
                      <option key={obj.id} value={obj.id}>{obj.nom}</option>
                    ))}
                  </select>
                  {nouvelleLigne.objectif_id && (
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Montant fléché (€)"
                      value={nouvelleLigne.montant_fleche}
                      onChange={(e) => majNouvelleLigne('montant_fleche', e.target.value)}
                    />
                  )}
                </td>
              )}

              <td>
                <input
                  type="number"
                  step="0.01"
                  value={nouvelleLigne.montant}
                  onChange={(e) => majNouvelleLigne('montant', e.target.value)}
                />
              </td>
              <td colSpan={2}>
                <button className="btn-ajouter-ligne" onClick={gererAjout}>Ajouter</button>
              </td>
            </tr>

            {transactionsAvecSolde.map((t) => (
              <tr key={t.id}>
                <td>{t.date}</td>
                <td>{t.type_transaction === 'revenu' ? 'Revenu' : 'Dépense'}</td>
                <td>{categories.find((c) => c.id === t.categorie_id)?.nom || '—'}</td>
                <td className="description-cell">{t.description || '—'}</td>
                {!estCompteEpargne && <td>{t.moyen_paiement}</td>}
                {estCompteEpargne && <td>{t.objectif_nom || '—'}</td>}
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