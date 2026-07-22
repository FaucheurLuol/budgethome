import { useState, useEffect } from 'react';
import { 
  listerComptesArchivesApi, desarchiverCompteApi, supprimerCompteDefinitifApi, 
  quitterCompteApi 
} from '../api/comptes';
import {
  listerObjectifsArchivesApi, desarchiverObjectifApi, supprimerObjectifDefinitifApi,
} from '../api/objectifs';
import '../style/app.css';
import '../style/tableur.css';

function Archives() {
  const [comptes, setComptes] = useState([]);
  const [objectifs, setObjectifs] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  async function chargerComptes() {
    try {
      const donnees = await listerComptesArchivesApi();
      setComptes(donnees);
    } catch (err) {
      setErreur(err.message);
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial des comptes archivés au montage
    chargerComptes();
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial des comptes et objectifs archivés au montage
    chargerComptes();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- idem
    chargerObjectifsArchives();
  }, []);

  async function gererDesarchivage(id) {
    try {
      await desarchiverCompteApi(id);
      setComptes(comptes.filter((c) => c.id !== id));
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function gererSuppression(id, nom) {
    const confirmation = window.confirm(
      `Supprimer définitivement "${nom}" et TOUTES ses transactions, budgets et modèles associés ? Cette action est IRRÉVERSIBLE.`
    );
    if (!confirmation) return;

    try {
      await supprimerCompteDefinitifApi(id);
      setComptes(comptes.filter((c) => c.id !== id));
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function gererQuitterCompte(id, nom) {
    const confirmation = window.confirm(
      `Quitter "${nom}" ? Ce compte deviendra personnel pour l'autre propriétaire, vous n'y aurez plus accès.`
    );
    if (!confirmation) return;

    try {
      await quitterCompteApi(id);
      setComptes(comptes.filter((c) => c.id !== id));
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function chargerObjectifsArchives() {
    try {
      const donnees = await listerObjectifsArchivesApi();
      setObjectifs(donnees);
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function gererDesarchivageObjectif(id) {
    try {
      await desarchiverObjectifApi(id);
      setObjectifs(objectifs.filter((o) => o.id !== id));
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function gererSuppressionObjectif(id, nom) {
    const confirmation = window.confirm(
      `Supprimer définitivement "${nom}" et tous ses flèchages associés ? Cette action est irréversible.`
    );
    if (!confirmation) return;

    try {
      await supprimerObjectifDefinitifApi(id);
      setObjectifs(objectifs.filter((o) => o.id !== id));
    } catch (err) {
      setErreur(err.message);
    }
  }

  if (chargement) return <p>Chargement...</p>;

  return (
    <div className="page-app">
      <h1>Archives</h1>
      <p className="page-sous-titre">Consultez, réactivez ou supprimez définitivement vos comptes et objectifs archivés.</p>

      {erreur && <p className="message-erreur">{erreur}</p>}

      <section className="section-profil">
        <h2>Comptes archivés</h2>
        {comptes.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>Aucun compte archivé.</p>
        ) : (
          <ul className="grille-cartes">
            {comptes.map((compte) => (
              <li key={compte.id} className="carte-item">
                <div className="carte-item-entete">
                  <strong>{compte.nom}</strong>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="bouton-discret" onClick={() => gererDesarchivage(compte.id)}>Désarchiver</button>
                    {compte.nb_proprietaires > 1 ? (
                      <button className="bouton-discret" onClick={() => gererQuitterCompte(compte.id, compte.nom)}>Quitter</button>
                    ) : (
                      <button className="bouton-discret" onClick={() => gererSuppression(compte.id, compte.nom)}>Supprimer</button>
                    )}
                  </div>
                </div>
                <span className="carte-detail">{compte.type_compte}</span>
                <span className="carte-montant">{(compte.solde_initial / 100).toFixed(2)} €</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="section-profil">
        <h2>Objectifs d'épargne archivés</h2>
        {objectifs.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>Aucun objectif archivé.</p>
        ) : (
          <ul className="grille-objectifs">
            {objectifs.map((obj) => {
              const montantActuel = Number(obj.montant_actuel);
              const pourcentage = Math.min(100, Math.max(0, (montantActuel / obj.montant_cible) * 100));
              return (
                <li key={obj.id} className="carte-objectif">
                  <div className="objectif-entete">
                    <strong>{obj.nom}</strong>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="bouton-discret" onClick={() => gererDesarchivageObjectif(obj.id)}>Désarchiver</button>
                      <button className="bouton-discret" onClick={() => gererSuppressionObjectif(obj.id, obj.nom)}>Supprimer</button>
                    </div>
                  </div>
                  <div className="objectif-progression">
                    <div className="objectif-barre-fond">
                      <div
                        className="objectif-barre-remplie"
                        style={{ width: `${pourcentage}%`, backgroundPosition: `${pourcentage}% 0` }}
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
        )}
      </section>
    </div>
  );
}

export default Archives;