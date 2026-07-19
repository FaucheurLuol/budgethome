import { useState, useEffect } from 'react';
import { listerComptesApi } from '../api/comptes';
import { listerCategoriesApi } from '../api/categories';
import { listerModelesApi, creerModeleApi, supprimerModeleApi, modifierModeleApi } from '../api/modeles';
import { aplatirPourSelect } from '../api/organiserCategories';
import { listerObjectifsApi } from '../api/objectifs';
import '../style/app.css';

const MOYENS_PAIEMENT = ['CB', 'Virement', 'Especes', 'Prelevement', 'Cheque'];

function Modeles() {
  const [chargement, setChargement] = useState(true);
  const [estVirementEpargne, setEstVirementEpargne] = useState(false);
  const [modeleEnEdition, setModeleEnEdition] = useState(null);
  const [typeTransaction, setTypeTransaction] = useState('depense');
  const [objectifs, setObjectifs] = useState([]);
  const [comptes, setComptes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [modeles, setModeles] = useState([]);
  const [erreur, setErreur] = useState('');
  const [compteSelectionne, setCompteSelectionne] = useState('');
  const [nom, setNom] = useState('');
  const [categorieId, setCategorieId] = useState('');
  const [montant, setMontant] = useState('');
  const [moyenPaiement, setMoyenPaiement] = useState('');
  const [compteEpargneId, setCompteEpargneId] = useState('');
  const [objectifId, setObjectifId] = useState('');

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

  useEffect(() => {
    if (!compteSelectionne) return;
    async function charger() {
      try {
        const donnees = await listerModelesApi(compteSelectionne);
        setModeles(donnees);
      } catch (err) {
        setErreur(err.message);
      }
    }
    charger();
  }, [compteSelectionne]);

  async function rechargerModeles() {
    try {
      const donnees = await listerModelesApi(compteSelectionne);
      setModeles(donnees);
    } catch (err) {
      setErreur(err.message);
    }
  }

  function gererDebutEdition(modele) {
    setModeleEnEdition(modele.id);
    setNom(modele.nom);
    setMontant(modele.montant ? (modele.montant / 100).toFixed(2) : '');
    setMoyenPaiement(modele.moyen_paiement || '');
    setEstVirementEpargne(modele.est_virement_epargne);
    if (modele.est_virement_epargne) {
      setCompteEpargneId(String(modele.compte_epargne_id));
      setObjectifId(modele.objectif_id ? String(modele.objectif_id) : '');
    } else {
      setCategorieId(String(modele.categorie_id));
      setTypeTransaction(modele.type_transaction);
    }
  }

  function gererAnnulerEdition() {
    setModeleEnEdition(null);
    setNom('');
    setCategorieId('');
    setMontant('');
    setMoyenPaiement('');
    setEstVirementEpargne(false);
    setCompteEpargneId('');
    setObjectifId('');
  }

  const categoriesFiltrees = aplatirPourSelect(categories.filter((c) => c.type_categorie === typeTransaction));
  const comptesEpargneDisponibles = comptes.filter((c) => c.type_compte !== 'Compte courant');

  async function gererSoumission(e) {
    e.preventDefault();
    setErreur('');
    try {
      if (!nom) {
        setErreur('Le nom est requis.');
        return;
      }
      if (!estVirementEpargne && !categorieId) {
        setErreur('Une catégorie est requise.');
        return;
      }
      if (estVirementEpargne && !compteEpargneId) {
        setErreur('Un compte d\'épargne de destination est requis.');
        return;
      }

      const donneesModele = {
        compte_id: Number(compteSelectionne),
        nom,
        categorie_id: estVirementEpargne ? null : Number(categorieId),
        montant: montant ? Math.round(parseFloat(montant) * 100) : null,
        type_transaction: estVirementEpargne ? 'depense' : typeTransaction,
        moyen_paiement: moyenPaiement || null,
        est_virement_epargne: estVirementEpargne,
        compte_epargne_id: estVirementEpargne ? Number(compteEpargneId) : null,
        objectif_id: objectifId ? Number(objectifId) : null,
      };

      if (modeleEnEdition) {
        await modifierModeleApi(modeleEnEdition, donneesModele);
      } else {
        await creerModeleApi(donneesModele);
      }

      gererAnnulerEdition();
      rechargerModeles();
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function gererSuppression(id) {
    try {
      await supprimerModeleApi(id);
      rechargerModeles();
    } catch (err) {
      setErreur(err.message);
    }
  }

  if (chargement) return <p>Chargement...</p>;

  return (
    <div className="page-app">
      <h1>Modèles de transactions</h1>
      <p className="page-sous-titre">
        Créez des raccourcis pour vos dépenses et revenus récurrents (loyer, charges, courses...).
      </p>

      {erreur && <p className="message-erreur">{erreur}</p>}

      <div className="toolbar-generique">
        <select value={compteSelectionne} onChange={(e) => setCompteSelectionne(e.target.value)}>
          {comptes.map((c) => (
            <option key={c.id} value={c.id}>{c.nom}</option>
          ))}
        </select>
      </div>

      <ul className="grille-cartes">
        {modeles.map((m) => (
          <li key={m.id} className="carte-item">
            <div className="carte-item-entete">
              <strong>{m.nom}</strong>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="bouton-discret" onClick={() => gererDebutEdition(m)}>Modifier</button>
                <button className="bouton-discret" onClick={() => gererSuppression(m.id)}>Supprimer</button>
              </div>
            </div>
            {m.est_virement_epargne ? (
              <span className="carte-detail">Vers l'épargne → {comptes.find((c) => c.id === m.compte_epargne_id)?.nom || '—'}</span>
            ) : (
              <span className="carte-detail">{categories.find((c) => c.id === m.categorie_id)?.nom || '—'}</span>
            )}
            {m.montant && <span className="carte-montant">{(m.montant / 100).toFixed(2)} €</span>}
          </li>
        ))}
      </ul>

      <h2>{modeleEnEdition ? 'Modifier le modèle' : 'Créer un modèle'}</h2>
      <form className="formulaire-carte" onSubmit={gererSoumission}>
        <label htmlFor="nom">Nom :</label>
        <input id="nom" type="text" value={nom} onChange={(e) => setNom(e.target.value)} required />

        <label className="champ-checkbox">
          <input
            type="checkbox"
            checked={estVirementEpargne}
            onChange={(e) => setEstVirementEpargne(e.target.checked)}
          />
          Virement automatisé vers l'épargne
        </label>

        {!estVirementEpargne && (
          <>
            <label htmlFor="type_transaction">Type :</label>
            <select
              id="type_transaction"
              value={typeTransaction}
              onChange={(e) => { setTypeTransaction(e.target.value); setCategorieId(''); }}
            >
              <option value="depense">Dépense</option>
              <option value="revenu">Revenu</option>
            </select>

            <label htmlFor="categorie_id">Catégorie :</label>
            <select id="categorie_id" value={categorieId} onChange={(e) => setCategorieId(e.target.value)}>
              <option value="">Choisir...</option>
              {categoriesFiltrees.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.nomAffiche}</option>
              ))}
            </select>

            <label htmlFor="moyen_paiement">Moyen de paiement par défaut (optionnel) :</label>
            <select id="moyen_paiement" value={moyenPaiement} onChange={(e) => setMoyenPaiement(e.target.value)}>
              <option value="">Aucun</option>
              {MOYENS_PAIEMENT.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </>
        )}

        {estVirementEpargne && (
          <>
            <label htmlFor="compte_epargne_id">Livret de destination :</label>
            <select id="compte_epargne_id" value={compteEpargneId} onChange={(e) => setCompteEpargneId(e.target.value)}>
              <option value="">Choisir...</option>
              {comptesEpargneDisponibles.map((c) => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>

            <label htmlFor="objectif_id">Objectif (optionnel) :</label>
            <select id="objectif_id" value={objectifId} onChange={(e) => setObjectifId(e.target.value)}>
              <option value="">Aucun</option>
              {objectifs.map((obj) => (
                <option key={obj.id} value={obj.id}>{obj.nom}</option>
              ))}
            </select>
          </>
        )}

        <label htmlFor="montant">Montant par défaut (€, optionnel) :</label>
        <input
          id="montant"
          type="number"
          step="0.01"
          min="0.01"
          value={montant}
          onChange={(e) => setMontant(e.target.value)}
        />

        <button className="btn-primary" type="submit">
          {modeleEnEdition ? 'Enregistrer' : 'Créer'}
        </button>
        {modeleEnEdition && (
          <button type="button" className="bouton-discret" onClick={gererAnnulerEdition}>
            Annuler
          </button>
        )}
      </form>
    </div>
  );
}

export default Modeles;