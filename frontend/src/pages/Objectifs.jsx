import { useState, useEffect } from 'react';
import { 
  listerObjectifsApi, creerObjectifApi, supprimerObjectifApi,
  archiverObjectifApi, modifierObjectifApi
} from '../api/objectifs';
import '../style/app.css';
import '../style/tableur.css';

function Objectifs() {
  const [objectifs, setObjectifs] = useState([]);
  const [estCommun, setEstCommun] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [nom, setNom] = useState('');
  const [montantCible, setMontantCible] = useState('');
  const [objectifEnEdition, setObjectifEnEdition] = useState(null);

  useEffect(() => {
    chargerObjectifs();
  }, []);

  async function chargerObjectifs() {
    try {
      const donnees = await listerObjectifsApi();
      setObjectifs(donnees);
    } catch (err) {
      setErreur(err.message);
    } finally {
      setChargement(false);
    }
  }

  async function gererSoumission(e) {
    e.preventDefault();
    setErreur('');
    try {
      if (!nom || !montantCible) {
        setErreur('Nom et montant cible sont requis.');
        return;
      }

      const donneesObjectif = {
        nom,
        montant_cible: Math.round(parseFloat(montantCible) * 100),
      };

      if (objectifEnEdition) {
        await modifierObjectifApi(objectifEnEdition, donneesObjectif);
      } else {
        await creerObjectifApi({ ...donneesObjectif, est_commun: estCommun });
      }

      gererAnnulerEdition();
      setEstCommun(false);
      chargerObjectifs();
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function gererSuppression(id) {
    try {
      await supprimerObjectifApi(id);
      chargerObjectifs();
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function gererArchivage(id) {
    try {
      await archiverObjectifApi(id);
      chargerObjectifs();
    } catch (err) {
      setErreur(err.message);
    }
  }

  function gererDebutEdition(objectif) {
    setObjectifEnEdition(objectif.id);
    setNom(objectif.nom);
    setMontantCible((objectif.montant_cible / 100).toFixed(2));
  }

  function gererAnnulerEdition() {
    setObjectifEnEdition(null);
    setNom('');
    setMontantCible('');
  }

  if (chargement) return <p>Chargement...</p>;

  return (
    <div className="page-app">
      <h1>Objectifs d'épargne</h1>
      <p className="page-sous-titre">Suivez la progression de votre épargne vers vos projets.</p>

      {erreur && <p className="message-erreur">{erreur}</p>}

      <ul className="grille-objectifs">
        {objectifs.map((obj) => {
          const montantActuel = Number(obj.montant_actuel);
          const pourcentage = Math.min(100, Math.max(0, (montantActuel / obj.montant_cible) * 100));
          return (
            <li key={obj.id} className="carte-objectif">
              <div className="objectif-entete">
                <strong>{obj.nom}</strong>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="bouton-discret" onClick={() => gererDebutEdition(obj)}>Modifier</button>
                  <button className="bouton-discret" onClick={() => gererArchivage(obj.id)}>Archiver</button>
                  <button className="bouton-discret" onClick={() => gererSuppression(obj.id)}>Supprimer</button>
                </div>
              </div>
              <div className="objectif-progression">
                <div className="objectif-barre-fond">
                  <div
                    className="objectif-barre-remplie"
                    style={{
                      width: `${pourcentage}%`,
                      backgroundPosition: `${pourcentage}% 0`,
                    }}
                  />
                </div>
                <span>
                  {(montantActuel / 100).toFixed(2)} € / {(obj.montant_cible / 100).toFixed(2)} €
                  {' '}({pourcentage.toFixed(0)}%)
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      <h2>{objectifEnEdition ? 'Modifier l\'objectif' : 'Créer un objectif'}</h2>
      <form className="formulaire-carte" onSubmit={gererSoumission}>
        <label htmlFor="nom">Nom :</label>
        <input id="nom" type="text" value={nom} onChange={(e) => setNom(e.target.value)} required />

        <label htmlFor="montant_cible">Montant cible (€) :</label>
        <input
          id="montant_cible"
          type="number"
          step="0.01"
          min="0.01"
          value={montantCible}
          onChange={(e) => setMontantCible(e.target.value)}
          required
        />

        {!objectifEnEdition && (
          <label className="champ-checkbox">
            <input type="checkbox" checked={estCommun} onChange={(e) => setEstCommun(e.target.checked)} />
            Objectif commun du foyer
          </label>
        )}

        <button className="btn-primary" type="submit">
          {objectifEnEdition ? 'Enregistrer' : 'Créer'}
        </button>
        {objectifEnEdition && (
          <button type="button" className="bouton-discret" onClick={gererAnnulerEdition}>
            Annuler
          </button>
        )}
      </form>
    </div>
  );
}

export default Objectifs;