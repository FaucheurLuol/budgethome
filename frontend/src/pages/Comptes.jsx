import { useState, useEffect } from 'react';
import { listerComptesApi, creerCompteApi, archiverCompteApi } from '../api/comptes';
import { listerUtilisateursApi } from '../api/utilisateurs';
import { useAuth } from '../context/useAuth';
import { listerSoldesApi } from '../api/dashboard';
import '../style/app.css';

const TYPES_COMPTE = ['Compte courant', 'Livret A', 'PEL', 'LDD', 'Action', 'Crypto'];

function Comptes() {
  const { utilisateur } = useAuth();
  const [comptes, setComptes] = useState([]);
  const [autresUtilisateurs, setAutresUtilisateurs] = useState([]);
  const [soldes, setSoldes] = useState({});
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  const [nom, setNom] = useState('');
  const [typeCompte, setTypeCompte] = useState(TYPES_COMPTE[0]);
  const [soldeInitial, setSoldeInitial] = useState('');
  const [partage, setPartage] = useState(false);
  const [utilisateurAssocie, setUtilisateurAssocie] = useState('');

  useEffect(() => {
    async function chargerDonnees() {
      try {
        const [donneesComptes, donneesUtilisateurs, donneesSoldes] = await Promise.all([
          listerComptesApi(),
          listerUtilisateursApi(),
          listerSoldesApi(),
        ]);
        setComptes(donneesComptes);
        setAutresUtilisateurs(donneesUtilisateurs.filter((u) => u.id !== utilisateur.id));
        const soldesParId = {};
        donneesSoldes.forEach((s) => { soldesParId[s.id] = s.solde_actuel; });
        setSoldes(soldesParId);
      } catch (err) {
        setErreur(err.message);
      } finally {
        setChargement(false);
      }
    }
    chargerDonnees();
  }, [utilisateur.id]);

  async function gererSoumission(e) {
    e.preventDefault();
    setErreur('');

    try {
      const nouveauCompte = await creerCompteApi({
        nom,
        type_compte: typeCompte,
        solde_initial: Math.round(parseFloat(soldeInitial) * 100),
        partage,
        utilisateurs_associes: partage && utilisateurAssocie ? [Number(utilisateurAssocie)] : [],
      });
      setComptes([...comptes, nouveauCompte]);
      setNom('');
      setSoldeInitial('');
      setPartage(false);
      setUtilisateurAssocie('');
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function gererArchivage(id) {
    try {
      await archiverCompteApi(id);
      setComptes(comptes.filter((c) => c.id !== id));
    } catch (err) {
      setErreur(err.message);
    }
  }

  if (chargement) return <p>Chargement...</p>;

  return (
    <div className="page-app">
      <h1>Mes comptes</h1>
      <p className="page-sous-titre">Gérez vos comptes personnels et partagés.</p>

      {erreur && <p className="message-erreur">{erreur}</p>}

      <ul className="grille-cartes">
        {comptes.map((compte) => (
          <li key={compte.id} className="carte-item">
            <div className="carte-item-entete">
              <strong>{compte.nom}</strong>
              <button className="bouton-discret" onClick={() => gererArchivage(compte.id)}>Archiver</button>
            </div>
            <span className="carte-detail">{compte.type_compte}</span>
            <span className={`carte-montant ${(soldes[compte.id] ?? compte.solde_initial) < 0 ? 'montant-negatif' : ''}`}>
              {((soldes[compte.id] ?? compte.solde_initial) / 100).toFixed(2)} €
            </span>
          </li>
        ))}
      </ul>

      <h2>Créer un compte</h2>
      <form className="formulaire-carte" onSubmit={gererSoumission}>
        <label htmlFor="nom">Nom :</label>
        <input
          id="nom"
          type="text"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          required
        />

        <label htmlFor="type_compte">Type :</label>
        <select id="type_compte" value={typeCompte} onChange={(e) => setTypeCompte(e.target.value)}>
          {TYPES_COMPTE.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>

        <label htmlFor="solde_initial">Solde initial (€) :</label>
        <input
          id="solde_initial"
          type="number"
          step="0.01"
          value={soldeInitial}
          onChange={(e) => setSoldeInitial(e.target.value)}
          required
        />

        <label className="champ-checkbox">
          <input
            type="checkbox"
            checked={partage}
            onChange={(e) => setPartage(e.target.checked)}
          />
          Compte partagé
        </label>

        {partage && (
          <>
            <label htmlFor="utilisateur_associe">Partager avec :</label>
            <select
              id="utilisateur_associe"
              value={utilisateurAssocie}
              onChange={(e) => setUtilisateurAssocie(e.target.value)}
            >
              <option value="">Sélectionner...</option>
              {autresUtilisateurs.map((u) => (
                <option key={u.id} value={u.id}>{u.nom}</option>
              ))}
            </select>
          </>
        )}

        <button className="btn-primary" type="submit">Créer le compte</button>
      </form>
    </div>
  );
}

export default Comptes;