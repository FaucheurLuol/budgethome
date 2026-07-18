import { useState, useEffect } from 'react';
import { listerObjectifsApi, creerObjectifApi, supprimerObjectifApi } from '../api/objectifs';
import '../style/app.css';
import '../style/tableur.css';

function Objectifs() {
  const [objectifs, setObjectifs] = useState([]);
  const [estCommun, setEstCommun] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [nom, setNom] = useState('');
  const [montantCible, setMontantCible] = useState('');

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
      await creerObjectifApi({
        nom,
        montant_cible: Math.round(parseFloat(montantCible) * 100),
        est_commun: estCommun,
      });
      setNom('');
      setMontantCible('');
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
                <button className="bouton-discret" onClick={() => gererSuppression(obj.id)}>Supprimer</button>
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

      <h2>Créer un objectif</h2>
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

        <label className="champ-checkbox">
          <input type="checkbox" checked={estCommun} onChange={(e) => setEstCommun(e.target.checked)} />
          Objectif commun du foyer
        </label>

        <button className="btn-primary" type="submit">Créer</button>
      </form>
    </div>
  );
}

export default Objectifs;