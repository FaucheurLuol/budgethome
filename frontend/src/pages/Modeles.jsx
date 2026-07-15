import { useState, useEffect } from 'react';
import { listerComptesApi } from '../api/comptes';
import { listerCategoriesApi } from '../api/categories';
import { listerModelesApi, creerModeleApi, supprimerModeleApi } from '../api/modeles';
import { aplatirPourSelect } from '../api/organiserCategories';

const MOYENS_PAIEMENT = ['CB', 'Virement', 'Especes', 'Prelevement', 'Cheque'];

function Modeles() {
  const [comptes, setComptes] = useState([]);
  const [compteSelectionne, setCompteSelectionne] = useState('');
  const [categories, setCategories] = useState([]);
  const [modeles, setModeles] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  const [nom, setNom] = useState('');
  const [categorieId, setCategorieId] = useState('');
  const [montant, setMontant] = useState('');
  const [typeTransaction, setTypeTransaction] = useState('depense');
  const [moyenPaiement, setMoyenPaiement] = useState('');

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

  const categoriesFiltrees = aplatirPourSelect(
    categories.filter((c) => c.type_categorie === typeTransaction)
  );

  async function gererSoumission(e) {
    e.preventDefault();
    setErreur('');
    try {
      if (!nom || !categorieId) {
        setErreur('Nom et catégorie sont requis.');
        return;
      }

      await creerModeleApi({
        compte_id: Number(compteSelectionne),
        nom,
        categorie_id: Number(categorieId),
        montant: montant ? Math.round(parseFloat(montant) * 100) : null,
        type_transaction: typeTransaction,
        moyen_paiement: moyenPaiement || null,
      });

      setNom('');
      setCategorieId('');
      setMontant('');
      setMoyenPaiement('');
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
    <div>
      <h1>Modèles de transactions</h1>
      <p className="page-sous-titre">
        Créez des raccourcis pour vos dépenses et revenus récurrents (loyer, charges, courses...).
      </p>

      {erreur && <p className="message-erreur">{erreur}</p>}

      <div className="tableur-toolbar">
        <select value={compteSelectionne} onChange={(e) => setCompteSelectionne(e.target.value)}>
          {comptes.map((c) => (
            <option key={c.id} value={c.id}>{c.nom}</option>
          ))}
        </select>
      </div>

      <ul className="liste-modeles">
        {modeles.map((m) => (
          <li key={m.id} className="carte-modele">
            <div>
              <strong>{m.nom}</strong>
              <span>{categories.find((c) => c.id === m.categorie_id)?.nom || '—'}</span>
              <span>{m.type_transaction === 'revenu' ? 'Revenu' : 'Dépense'}</span>
              {m.montant && <span>{(m.montant / 100).toFixed(2)} €</span>}
            </div>
            <button onClick={() => gererSuppression(m.id)}>Supprimer</button>
          </li>
        ))}
      </ul>

      <h2>Créer un modèle</h2>
      <form onSubmit={gererSoumission}>
        <label htmlFor="nom">Nom :</label>
        <input id="nom" type="text" value={nom} onChange={(e) => setNom(e.target.value)} required />

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
        <select id="categorie_id" value={categorieId} onChange={(e) => setCategorieId(e.target.value)} required>
          <option value="">Choisir...</option>
          {categoriesFiltrees.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.nomAffiche}</option>
          ))}
        </select>

        <label htmlFor="montant">Montant par défaut (€, optionnel) :</label>
        <input
          id="montant"
          type="number"
          step="0.01"
          value={montant}
          onChange={(e) => setMontant(e.target.value)}
        />

        <label htmlFor="moyen_paiement">Moyen de paiement par défaut (optionnel) :</label>
        <select id="moyen_paiement" value={moyenPaiement} onChange={(e) => setMoyenPaiement(e.target.value)}>
          <option value="">Aucun</option>
          {MOYENS_PAIEMENT.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <button className="btn-primary" type="submit">Créer</button>
      </form>
    </div>
  );
}

export default Modeles;