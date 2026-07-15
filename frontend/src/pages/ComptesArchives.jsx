import { useState, useEffect } from 'react';
import { listerComptesArchivesApi, desarchiverCompteApi, supprimerCompteDefinitifApi } from '../api/comptes';
import '../style/app.css';

function ComptesArchives() {
  const [comptes, setComptes] = useState([]);
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

  if (chargement) return <p>Chargement...</p>;

  return (
    <div className="page-app">
      <h1>Comptes archivés</h1>
      <p className="page-sous-titre">Consultez, réactivez ou supprimez définitivement vos comptes archivés.</p>

      {erreur && <p className="message-erreur">{erreur}</p>}

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
                  <button className="bouton-discret" onClick={() => gererSuppression(compte.id, compte.nom)}>Supprimer</button>
                </div>
              </div>
              <span className="carte-detail">{compte.type_compte}</span>
              <span className="carte-montant">{(compte.solde_initial / 100).toFixed(2)} €</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ComptesArchives;