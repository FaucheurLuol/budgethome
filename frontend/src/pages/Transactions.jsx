import { useState, useEffect, useMemo, useCallback } from 'react';
import { listerComptesApi } from '../api/comptes';
import { listerCategoriesApi, garantirCategorieEpargneApi } from '../api/categories';
import { listerObjectifsApi, creerAllocationApi } from '../api/objectifs';
import {
  listerTransactionsApi, creerTransactionApi, supprimerTransactionApi,
  creerRetraitEpargneApi, creerVirementEpargneApi, creerVirementVersCourantApi,
  validerSimulationApi, modifierTransactionApi, creerVirementEpargneVersEpargneApi
} from '../api/transactions';
import { aplatirPourSelect } from '../api/organiserCategories';
import { listerModelesApi } from '../api/modeles';
import '../style/app.css';
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
    est_virement_vers_courant: false,
    compte_courant_destination_id: '',
    est_transfert_epargne: false,
    compte_epargne_dest_id: '',
    est_simulee: false,
  };
}

function Transactions() {
  const [comptes, setComptes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [objectifs, setObjectifs] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [modeles, setModeles] = useState([]);
  const [toutesTransactions, setToutesTransactions] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [compteSelectionne, setCompteSelectionne] = useState('');
  const [filtreMois, setFiltreMois] = useState('');
  const [filtreCategorie, setFiltreCategorie] = useState('');
  const [recherche, setRecherche] = useState('');
  const [nouvelleLigne, setNouvelleLigne] = useState(ligneVide());
  const [transactionEnEdition, setTransactionEnEdition] = useState(null);
  const [editionValeurs, setEditionValeurs] = useState({});

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

  const chargerToutesTransactions = useCallback(async () => {
    try {
      const donnees = await listerTransactionsApi(compteSelectionne);
      setToutesTransactions(donnees);
    } catch (err) {
      setErreur(err.message);
    }
  }, [compteSelectionne]);

  const chargerTransactionsFiltrees = useCallback(async () => {
    try {
      const donnees = await listerTransactionsApi(compteSelectionne, {
        mois: filtreMois || undefined,
        categorie_id: filtreCategorie || undefined,
        recherche: recherche || undefined,
      });
      setTransactions(donnees);
    } catch (err) {
      setErreur(err.message);
    }
  }, [compteSelectionne, filtreMois, filtreCategorie, recherche]);

  useEffect(() => {
    if (!compteSelectionne) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch déclenché par le changement de compte sélectionné
    chargerToutesTransactions();
    chargerTransactionsFiltrees();
  }, [compteSelectionne, chargerToutesTransactions, chargerTransactionsFiltrees]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- réinitialisation du formulaire à chaque changement de compte pour éviter les effets de bord entre comptes
    setNouvelleLigne(ligneVide());
  }, [compteSelectionne]);

  useEffect(() => {
    if (!compteSelectionne) return;
    async function chargerModeles() {
      try {
        const donnees = await listerModelesApi(compteSelectionne);
        setModeles(donnees);
      } catch (err) {
        setErreur(err.message);
      }
    }
    chargerModeles();
  }, [compteSelectionne]);

  const compte = comptes.find((c) => c.id === Number(compteSelectionne));
  const estCompteEpargne = compte && compte.type_compte !== 'Compte courant';
  const comptesEpargneDisponibles = comptes.filter((c) => c.type_compte !== 'Compte courant' && c.id !== Number(compteSelectionne));
  const comptesCourantsDisponibles = comptes.filter((c) => c.type_compte === 'Compte courant');

  const toutesAvecSolde = useMemo(() => {
    const triAsc = [...toutesTransactions].sort((a, b) => new Date(a.date) - new Date(b.date) || a.id - b.id);
    const soldeDepart = compte ? compte.solde_initial : 0;

    return triAsc.reduce((accumulateur, t) => {
      const precedent = accumulateur.length > 0 ? accumulateur[accumulateur.length - 1] : null;
      const soldeReelPrecedent = precedent ? precedent.soldeReel : soldeDepart;
      const soldeProjetePrecedent = precedent ? precedent.soldeProjete : soldeDepart;
      const mouvement = t.type_transaction === 'revenu' ? t.montant : -t.montant;

      const soldeReel = t.est_simulee ? soldeReelPrecedent : soldeReelPrecedent + mouvement;
      const soldeProjete = soldeProjetePrecedent + mouvement;

      return [...accumulateur, { ...t, soldeReel, soldeProjete }];
    }, []);
  }, [toutesTransactions, compte]);

  const transactionsAvecSolde = useMemo(() => {
    const idsFiltres = new Set(transactions.map((t) => t.id));
    const avecSoldeFiltre = toutesAvecSolde.filter((t) => idsFiltres.has(t.id));

    const simulees = avecSoldeFiltre.filter((t) => t.est_simulee).reverse();
    const reelles = avecSoldeFiltre.filter((t) => !t.est_simulee).reverse();
    return [...simulees, ...reelles];
  }, [toutesAvecSolde, transactions]);

  const soldeReelActuel = toutesAvecSolde.length > 0
    ? toutesAvecSolde[toutesAvecSolde.length - 1].soldeReel
    : (compte ? compte.solde_initial : 0);

  const soldeProjeteActuel = toutesAvecSolde.length > 0
    ? toutesAvecSolde[toutesAvecSolde.length - 1].soldeProjete
    : (compte ? compte.solde_initial : 0);

  const categoriesFiltrees = aplatirPourSelect(
    categories.filter((c) => c.type_categorie === nouvelleLigne.type_transaction)
  );

  async function gererAjout() {
    setErreur('');
    try {
      const montantCentimes = Math.round(parseFloat(nouvelleLigne.montant) * 100);

      if (nouvelleLigne.est_transfert_epargne) {
        if (!nouvelleLigne.compte_epargne_dest_id) {
          setErreur('Sélectionnez le compte d\'épargne de destination.');
          return;
        }
        await creerVirementEpargneVersEpargneApi({
          date: nouvelleLigne.date,
          montant: montantCentimes,
          description: nouvelleLigne.description || null,
          compte_source_id: Number(compteSelectionne),
          compte_dest_id: Number(nouvelleLigne.compte_epargne_dest_id),
        });
        setNouvelleLigne(ligneVide());
        chargerToutesTransactions();
        chargerTransactionsFiltrees();
        return;
      }

      if (!nouvelleLigne.montant || (!nouvelleLigne.categorie_id && !nouvelleLigne.est_virement_epargne && !nouvelleLigne.est_virement_vers_courant)) {
        setErreur('Montant et catégorie sont requis.');
        return;
      }

      if (nouvelleLigne.est_simulee) {
        if (!nouvelleLigne.categorie_id && !nouvelleLigne.est_virement_epargne) {
          setErreur('Une catégorie est requise pour simuler une transaction.');
          return;
        }

        let categorieAUtiliser = nouvelleLigne.categorie_id ? Number(nouvelleLigne.categorie_id) : null;

        if (nouvelleLigne.est_virement_epargne && !categorieAUtiliser) {
          const { depense } = await garantirCategorieEpargneApi();
          categorieAUtiliser = depense.id;
          await rechargerCategories();
        }

        await creerTransactionApi({
          date: nouvelleLigne.date,
          montant: montantCentimes,
          description: nouvelleLigne.description || null,
          moyen_paiement: 'Virement',
          categorie_id: categorieAUtiliser,
          compte_id: Number(compteSelectionne),
          type_transaction: nouvelleLigne.type_transaction,
          est_simulee: true,
        });

        setNouvelleLigne(ligneVide());
        chargerToutesTransactions();
        chargerTransactionsFiltrees();
        return;
      }

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
        const estDepenseEpargne = estCompteEpargne && nouvelleLigne.type_transaction === 'depense';

        if (estDepenseEpargne) {
          if (!nouvelleLigne.est_virement_vers_courant) {
            setErreur('Une dépense depuis un compte d\'épargne doit être dirigée vers le compte courant ou un autre livret.');
            return;
          }

          if (!nouvelleLigne.objectif_id) {
            setErreur('Un retrait vers le compte courant doit obligatoirement être fléché vers un objectif.');
            return;
          }

          if (!nouvelleLigne.compte_courant_destination_id) {
            setErreur('Sélectionnez le compte courant de destination.');
            return;
          }

          await creerVirementVersCourantApi({
            date: nouvelleLigne.date,
            montant: montantCentimes,
            description: nouvelleLigne.description || null,
            compte_epargne_id: Number(compteSelectionne),
            compte_courant_id: Number(nouvelleLigne.compte_courant_destination_id),
            objectif_id: Number(nouvelleLigne.objectif_id),
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
      chargerToutesTransactions();
      chargerTransactionsFiltrees();
    } catch (err) {
      setErreur(err.message);
    }
  }

    function gererToucheEntree(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        gererAjout();
      }
    }

  async function gererSuppression(id) {
    try {
      await supprimerTransactionApi(id);
      chargerToutesTransactions();
      chargerTransactionsFiltrees();
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function gererValidationSimulation(id) {
    try {
      await validerSimulationApi(id);
      chargerToutesTransactions();
      chargerTransactionsFiltrees();
    } catch (err) {
      setErreur(err.message);
    }
  }

  function majNouvelleLigne(champ, valeur) {
    setNouvelleLigne((precedent) => {
      const misAJour = {
        ...precedent,
        [champ]: valeur,
        ...(champ === 'type_transaction' ? {
          categorie_id: '',
          objectif_id: '',
          montant_fleche: '',
          est_virement_epargne: false,
          est_virement_vers_courant: false,
          compte_epargne_id: '',
          compte_courant_destination_id: '',
          est_transfert_epargne: false,
          compte_epargne_dest_id: '',
        } : {}),
      };

      if (champ === 'est_virement_vers_courant' && valeur) {
        misAJour.est_transfert_epargne = false;
        misAJour.compte_epargne_dest_id = '';
      }
      if (champ === 'est_transfert_epargne' && valeur) {
        misAJour.est_virement_vers_courant = false;
        misAJour.compte_courant_destination_id = '';
        misAJour.objectif_id = '';
        misAJour.montant_fleche = '';
      }

      return misAJour;
    });
  }

  function appliquerModele(modele) {
    if (modele.est_virement_epargne) {
      setNouvelleLigne((precedent) => ({
        ...precedent,
        description: modele.nom,
        type_transaction: 'depense',
        montant: modele.montant ? (modele.montant / 100).toFixed(2) : precedent.montant,
        est_virement_epargne: true,
        compte_epargne_id: String(modele.compte_epargne_id),
        objectif_id: modele.objectif_id ? String(modele.objectif_id) : '',
        est_virement_vers_courant: false,
        est_simulee: false,
        categorie_id: '',
      }));
      return;
    }

    setNouvelleLigne((precedent) => ({
      ...precedent,
      categorie_id: String(modele.categorie_id),
      type_transaction: modele.type_transaction,
      montant: modele.montant ? (modele.montant / 100).toFixed(2) : precedent.montant,
      description: modele.nom,
      moyen_paiement: modele.moyen_paiement || precedent.moyen_paiement,
      est_virement_epargne: false,
      est_virement_vers_courant: false,
      est_simulee: false,
    }));
  }

  function gererDebutEditionTransaction(t) {
    setTransactionEnEdition(t.id);
    setEditionValeurs({
      date: t.date,
      description: t.description || '',
      montant: (t.montant / 100).toFixed(2),
      moyen_paiement: t.moyen_paiement,
      categorie_id: String(t.categorie_id),
    });
  }

  function gererAnnulerEditionTransaction() {
    setTransactionEnEdition(null);
    setEditionValeurs({});
  }

  async function gererEnregistrerEditionTransaction(t) {
    try {
      if (!editionValeurs.montant || parseFloat(editionValeurs.montant) <= 0) {
        setErreur('Le montant doit être supérieur à zéro.');
        return;
      }
      await modifierTransactionApi(t.id, {
        date: editionValeurs.date,
        description: editionValeurs.description || null,
        montant: Math.round(parseFloat(editionValeurs.montant) * 100),
        moyen_paiement: editionValeurs.moyen_paiement,
        categorie_id: Number(editionValeurs.categorie_id),
        type_transaction: t.type_transaction,
        est_recurrente: t.est_recurrente || false,
      });
      gererAnnulerEditionTransaction();
      chargerToutesTransactions();
      chargerTransactionsFiltrees();
    } catch (err) {
      setErreur(err.message);
    }
  }

  if (chargement) return <p>Chargement...</p>;

  return (
    <div className="page-tableur">
      <h1>Transactions</h1>

      {erreur && <p className="message-erreur">{erreur}</p>}

      <div className="carte-solde-principale">
        <div className="solde-bloc">
          <span className="solde-label">Solde réel</span>
          <strong className={`solde-valeur ${soldeReelActuel < 0 ? 'montant-negatif' : ''}`}>
            {(soldeReelActuel / 100).toFixed(2)} €
          </strong>
        </div>
        {soldeProjeteActuel !== soldeReelActuel && (
          <div className="solde-bloc solde-projete">
            <span className="solde-label">Solde projeté</span>
            <strong className={`solde-valeur ${soldeProjeteActuel < 0 ? 'montant-negatif' : ''}`}>
              {(soldeProjeteActuel / 100).toFixed(2)} €
            </strong>
          </div>
        )}
      </div>

      <div className="ligne-actions-secondaires">
        <select
          className="tableur-select-compte"
          value={compteSelectionne}
          onChange={(e) => setCompteSelectionne(e.target.value)}
        >
          {comptes.map((c) => (
            <option key={c.id} value={c.id}>{c.nom}</option>
          ))}
        </select>

        {modeles.length > 0 && (
          <div className="rangee-modeles">
            {modeles.map((m) => (
              <button
                key={m.id}
                className={`btn-modele ${m.utilise_ce_mois ? 'btn-modele-utilise' : ''}`}
                onClick={() => appliquerModele(m)}
              >
                {m.nom}
                {m.utilise_ce_mois && ' ✓'}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="barre-filtres">
        <input
          type="month"
          value={filtreMois}
          onChange={(e) => setFiltreMois(e.target.value)}
        />
        <select value={filtreCategorie} onChange={(e) => setFiltreCategorie(e.target.value)}>
          <option value="">Toutes les catégories</option>
          {aplatirPourSelect(categories).map((c) => (
            <option key={c.id} value={c.id}>{c.nomAffiche}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Rechercher dans la description..."
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
        />
        {(filtreMois || filtreCategorie || recherche) && (
          <button
            className="bouton-discret"
            onClick={() => { setFiltreMois(''); setFiltreCategorie(''); setRecherche(''); }}
          >
            Réinitialiser
          </button>
        )}
      </div>

      <div className="tableur-wrapper">
        <table className="tableur">
          <thead>
            <tr>
              <th style={{ width: '9%' }}>Date</th>
              <th style={{ width: '8%' }}>Type</th>
              <th style={{ width: '14%' }}>Catégorie</th>
              <th style={{ width: '14%' }}>Description</th>
              {!estCompteEpargne && <th style={{ width: '8%' }}>Moyen</th>}
              {!estCompteEpargne && <th style={{ width: '12%' }}>Virement</th>}
              {estCompteEpargne && <th style={{ width: '20%' }}>Objectif</th>}
              <th style={{ width: '10%' }}>Montant</th>
              <th style={{ width: '9%' }}>Solde</th>
              <th style={{ width: '9%' }}></th>
              {!estCompteEpargne && <th style={{ width: '7%' }}>Simuler</th>}
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
                {!nouvelleLigne.est_virement_epargne && !nouvelleLigne.est_virement_vers_courant && !nouvelleLigne.est_transfert_epargne && (
                  <select
                    value={nouvelleLigne.categorie_id}
                    onChange={(e) => majNouvelleLigne('categorie_id', e.target.value)}
                  >
                    <option value="">Choisir...</option>
                    {categoriesFiltrees.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.nomAffiche}</option>
                    ))}
                  </select>
                )}
                {nouvelleLigne.est_virement_epargne && <span>Épargne (auto)</span>}
                {nouvelleLigne.est_virement_vers_courant && <span>Renflouement (auto)</span>}
                {nouvelleLigne.est_transfert_epargne && <span>Transfert épargne (auto)</span>}
              </td>
              <td>
                <input
                  type="text"
                  value={nouvelleLigne.description}
                  onChange={(e) => majNouvelleLigne('description', e.target.value)}
                />
              </td>

              {!estCompteEpargne && (
                <td>
                  {nouvelleLigne.est_virement_epargne ? (
                    <span>Virement (auto)</span>
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

                  {nouvelleLigne.est_virement_epargne && (
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
                  )}
                </td>
              )}

              {estCompteEpargne && (
                <td>
                  {nouvelleLigne.type_transaction === 'depense' && (
                    <>
                      <label className="checkbox-virement">
                        <input
                          type="checkbox"
                          checked={nouvelleLigne.est_virement_vers_courant}
                          onChange={(e) => majNouvelleLigne('est_virement_vers_courant', e.target.checked)}
                        />
                        Vers le compte courant
                      </label>
                      <label className="checkbox-virement">
                        <input
                          type="checkbox"
                          checked={nouvelleLigne.est_transfert_epargne}
                          onChange={(e) => majNouvelleLigne('est_transfert_epargne', e.target.checked)}
                        />
                        Vers un autre livret
                      </label>
                    </>
                  )}

                  {nouvelleLigne.est_virement_vers_courant && (
                    <select
                      value={nouvelleLigne.compte_courant_destination_id}
                      onChange={(e) => majNouvelleLigne('compte_courant_destination_id', e.target.value)}
                    >
                      <option value="">Quel compte...</option>
                      {comptesCourantsDisponibles.map((c) => (
                        <option key={c.id} value={c.id}>{c.nom}</option>
                      ))}
                    </select>
                  )}

                  {nouvelleLigne.est_transfert_epargne && (
                    <select
                      value={nouvelleLigne.compte_epargne_dest_id}
                      onChange={(e) => majNouvelleLigne('compte_epargne_dest_id', e.target.value)}
                    >
                      <option value="">Quel livret...</option>
                      {comptesEpargneDisponibles.map((c) => (
                        <option key={c.id} value={c.id}>{c.nom}</option>
                      ))}
                    </select>
                  )}

                  {(nouvelleLigne.type_transaction === 'revenu' || nouvelleLigne.est_virement_vers_courant) && (
                    <>
                      <select
                        value={nouvelleLigne.objectif_id}
                        onChange={(e) => {
                          const nouvelId = e.target.value;
                          setNouvelleLigne((precedent) => ({
                            ...precedent,
                            objectif_id: nouvelId,
                            montant_fleche: nouvelId && !precedent.est_virement_vers_courant ? precedent.montant : precedent.montant_fleche,
                          }));
                        }}
                      >
                        <option value="">
                          {nouvelleLigne.est_virement_vers_courant ? 'Obligatoire...' : 'Optionnel...'}
                        </option>
                        {objectifs.map((obj) => (
                          <option key={obj.id} value={obj.id}>{obj.nom}</option>
                        ))}
                      </select>
                      {nouvelleLigne.objectif_id && !nouvelleLigne.est_virement_vers_courant && (
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="Montant fléché (€)"
                          value={nouvelleLigne.montant_fleche}
                          onChange={(e) => majNouvelleLigne('montant_fleche', e.target.value)}
                          onKeyDown={gererToucheEntree}
                        />
                      )}
                    </>
                  )}
                </td>
              )}

              <td>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={nouvelleLigne.montant}
                  onChange={(e) => majNouvelleLigne('montant', e.target.value)}
                  onKeyDown={gererToucheEntree}
                />
              </td>
              <td>
                <button className="btn-ajouter-ligne" onClick={gererAjout}>Ajouter</button>
              </td>
              <td></td>
              {!estCompteEpargne && (
                <td>
                  <label className="checkbox-virement">
                    <input
                      type="checkbox"
                      checked={nouvelleLigne.est_simulee}
                      onChange={(e) => majNouvelleLigne('est_simulee', e.target.checked)}
                    />
                  </label>
                </td>
              )}
            </tr>
            {transactionsAvecSolde.map((t) => {
              const estModifiable = !t.objectif_id && t.description !== 'Virement vers épargne'
                && t.description !== 'Virement depuis compte courant'
                && t.description !== 'Virement vers compte courant'
                && t.description !== 'Virement depuis épargne';
              const enEdition = transactionEnEdition === t.id;

              if (enEdition) {
                return (
                  <tr key={t.id} className="ligne-ajout">
                    <td>
                      <input
                        type="date"
                        value={editionValeurs.date}
                        onChange={(e) => setEditionValeurs({ ...editionValeurs, date: e.target.value })}
                      />
                    </td>
                    <td>{t.type_transaction === 'revenu' ? 'Revenu' : 'Dépense'}</td>
                    <td>
                      <select
                        value={editionValeurs.categorie_id}
                        onChange={(e) => setEditionValeurs({ ...editionValeurs, categorie_id: e.target.value })}
                      >
                        {aplatirPourSelect(categories.filter((c) => c.type_categorie === t.type_transaction)).map((cat) => (
                          <option key={cat.id} value={cat.id}>{cat.nomAffiche}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        value={editionValeurs.description}
                        onChange={(e) => setEditionValeurs({ ...editionValeurs, description: e.target.value })}
                      />
                    </td>
                    {!estCompteEpargne && (
                      <td>
                        <select
                          value={editionValeurs.moyen_paiement}
                          onChange={(e) => setEditionValeurs({ ...editionValeurs, moyen_paiement: e.target.value })}
                        >
                          {MOYENS_PAIEMENT.map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </td>
                    )}
                    {!estCompteEpargne && <td>—</td>}
                    {estCompteEpargne && <td>—</td>}
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={editionValeurs.montant}
                        onChange={(e) => setEditionValeurs({ ...editionValeurs, montant: e.target.value })}
                      />
                    </td>
                    <td>—</td>
                    <td className="actions-cell">
                      <button className="btn-valider-simulation" onClick={() => gererEnregistrerEditionTransaction(t)} title="Valider">✓</button>
                      <button className="btn-supprimer-ligne" onClick={gererAnnulerEditionTransaction} title="Annuler">✕</button>
                    </td>
                    {!estCompteEpargne && <td></td>}
                  </tr>
                );
              }

              return (
                <tr key={t.id} className={`${t.est_simulee ? 'ligne-simulee' : ''} ${t.categorie_recurrente ? 'ligne-recurrente' : ''}`}>
                  <td>{t.date}</td>
                  <td>{t.type_transaction === 'revenu' ? 'Revenu' : 'Dépense'}</td>
                  <td>{categories.find((c) => c.id === t.categorie_id)?.nom || '—'}</td>
                  <td className="description-cell">{t.description || '—'}</td>
                  {!estCompteEpargne && <td>{t.moyen_paiement}</td>}
                  {!estCompteEpargne && <td>—</td>}
                  {estCompteEpargne && <td>{t.objectif_nom || '—'}</td>}
                  <td className={t.type_transaction === 'revenu' ? 'montant-revenu' : 'montant-depense'}>
                    {t.type_transaction === 'revenu' ? '+' : '-'}{(t.montant / 100).toFixed(2)} €
                  </td>
                  <td className="solde-cell">{(t.soldeReel / 100).toFixed(2)} €</td>
                  <td className="actions-cell">
                    {estModifiable && (
                      <button className="btn-valider-simulation" onClick={() => gererDebutEditionTransaction(t)} title="Modifier">✎</button>
                    )}
                    <button className="btn-supprimer-ligne" onClick={() => gererSuppression(t.id)} title="Supprimer">✕</button>
                  </td>
                  {!estCompteEpargne && 
                    <td>
                      {t.est_simulee && (
                        <button className="btn-valider-simulation" onClick={() => gererValidationSimulation(t.id)} title="Passer en réelle">✓</button>
                      )}
                    </td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Transactions;