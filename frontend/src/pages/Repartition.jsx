import { useState, useEffect } from 'react';
import { 
  calculerRepartitionApi, listerHistoriqueRepartitionApi, activerRepartitionApi, 
  supprimerRepartitionApi 
} from '../api/repartition';
import { listerUtilisateursApi } from '../api/utilisateurs';
import { listerComptesApi } from '../api/comptes';
import { creerOuRemplacerModeleCompteCommunApi } from '../api/modeles';
import { useAuth } from '../context/useAuth';
import '../style/app.css';
import '../style/tableur.css';

function ligneVide() {
  return { nom: '', montant: '' };
}

function ligneRevenuVide() {
  return { utilisateur_id: '', source: '', montant: '' };
}

function moisActuelISO() {
  const maintenant = new Date();
  return `${maintenant.getFullYear()}-${String(maintenant.getMonth() + 1).padStart(2, '0')}-01`;
}

function Repartition() {
  const { utilisateur } = useAuth();
  const [mois, setMois] = useState(moisActuelISO());
  const [revenus, setRevenus] = useState([ligneRevenuVide(), ligneRevenuVide()]);
  const [depenses, setDepenses] = useState([ligneVide()]);
  const [resultat, setResultat] = useState(null);
  const [historique, setHistorique] = useState([]);
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [comptes, setComptes] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [compteChoisiParPersonne, setCompteChoisiParPersonne] = useState({});
  const [erreur, setErreur] = useState('');
  const [messageModele, setMessageModele] = useState('');

  useEffect(() => {
    async function chargerInit() {
      try {
        const [donneesHistorique, donneesUtilisateurs, donneesComptes] = await Promise.all([
          listerHistoriqueRepartitionApi(),
          listerUtilisateursApi(),
          listerComptesApi(),
        ]);
        setHistorique(donneesHistorique);
        setUtilisateurs(donneesUtilisateurs);
        setComptes(donneesComptes);
      } catch (err) {
        setErreur(err.message);
      } finally {
        setChargement(false);
      }
    }
    chargerInit();
  }, []);

  async function chargerHistorique() {
    try {
      const donnees = await listerHistoriqueRepartitionApi();
      setHistorique(donnees);
    } catch (err) {
      setErreur(err.message);
    } finally {
      setChargement(false);
    }
  }

  async function gererSuppression(id) {
    try {
      await supprimerRepartitionApi(id);
      setHistorique(historique.filter((h) => h.id !== id));
    } catch (err) {
      setErreur(err.message);
    }
  }

  function majLigne(liste, setListe, index, champ, valeur) {
    setListe(liste.map((ligne, i) => (i === index ? { ...ligne, [champ]: valeur } : ligne)));
  }

  function ajouterLigne(liste, setListe, creerLigneVide = ligneVide) {
    setListe([...liste, creerLigneVide()]);
  }

  function retirerLigne(liste, setListe, index) {
    setListe(liste.filter((_, i) => i !== index));
  }

  function chargerDansFormulaire(item) {
    setMois(item.mois);
    setRevenus(item.revenus.map((r) => ({
      utilisateur_id: r.utilisateur_id ? String(r.utilisateur_id) : '',
      source: r.source || '',
      montant: (r.montant / 100).toFixed(2),
    })));
    setDepenses(item.depenses.map((d) => ({ nom: d.nom, montant: (d.montant / 100).toFixed(2) })));
    setResultat(null);
  }

  async function gererCalcul() {
    setErreur('');
    try {
      const revenusValides = revenus
        .filter((r) => r.utilisateur_id && r.montant)
        .map((r) => {
          const utilisateur = utilisateurs.find((u) => u.id === Number(r.utilisateur_id));
          return {
            utilisateur_id: Number(r.utilisateur_id),
            personne: utilisateur ? utilisateur.nom : 'Inconnu',
            source: r.source || 'Revenu',
            montant: Math.round(parseFloat(r.montant) * 100),
          };
        });
      const depensesValides = depenses
        .filter((d) => d.nom && d.montant)
        .map((d) => ({ nom: d.nom, montant: Math.round(parseFloat(d.montant) * 100) }));

      if (revenusValides.length === 0) {
        setErreur('Au moins un revenu est nécessaire.');
        return;
      }
      if (depensesValides.length === 0) {
        setErreur('Au moins une dépense est nécessaire.');
        return;
      }

      const donnees = await calculerRepartitionApi(revenusValides, depensesValides, mois);
      setResultat(donnees);
      chargerHistorique();
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function gererActivation(id) {
    try {
      await activerRepartitionApi(id);
      chargerHistorique();
    } catch (err) {
      setErreur(err.message);
    }
  }

  const repartitionActive = historique.find((r) => r.est_active);
  const mesComptesCourants = comptes.filter((c) => c.type_compte === 'Compte courant' && c.nb_proprietaires === 1);

  async function gererCreationModele(nomPersonne, partAVerser) {
    setMessageModele('');
    setErreur('');
    const compteId = compteChoisiParPersonne[nomPersonne] || (mesComptesCourants[0]?.id);

    if (!compteId) {
      setErreur('Aucun compte courant personnel trouvé.');
      return;
    }

    try {
      await creerOuRemplacerModeleCompteCommunApi(compteId, partAVerser);
      setMessageModele(`Modèle "Virement vers compte commun" mis à jour pour ${nomPersonne} (${(partAVerser / 100).toFixed(2)} €).`);
    } catch (err) {
      setErreur(err.message);
    }
  }

  if (chargement) return <p>Chargement...</p>;

  return (
    <div className="page-app">
      <h1>Répartition du compte commun</h1>
      <p className="page-sous-titre">
        Simulez la répartition des versements vers le compte commun, au prorata de vos revenus.
      </p>

      {erreur && <p className="message-erreur">{erreur}</p>}

      {repartitionActive && (
        <div className="bloc-repartition">
          <h2>Répartition active — {repartitionActive.mois}</h2>
          {repartitionActive.resultat.repartition.map((r) => {
            const estMoi = r.nom === utilisateur.nom;
            return (
              <div key={r.nom} className="ligne-resultat-personne">
                <p>{r.nom} : {(r.part_a_verser / 100).toFixed(2)} €</p>
                {estMoi && mesComptesCourants.length > 1 && (
                  <select
                    value={compteChoisiParPersonne[r.nom] || mesComptesCourants[0]?.id}
                    onChange={(e) => setCompteChoisiParPersonne({ ...compteChoisiParPersonne, [r.nom]: e.target.value })}
                  >
                    {mesComptesCourants.map((c) => (
                      <option key={c.id} value={c.id}>{c.nom}</option>
                    ))}
                  </select>
                )}
                <button
                  className="bouton-discret"
                  disabled={!estMoi}
                  onClick={() => gererCreationModele(r.nom, r.part_a_verser)}
                >
                  {estMoi ? 'Créer le modèle' : 'Réservé à ' + r.nom}
                </button>
              </div>
            );
          })}
          {messageModele && <p style={{ color: 'var(--color-accent)' }}>{messageModele}</p>}
        </div>
      )}

      <h2>Nouvelle simulation</h2>
      <div className="bloc-repartition">
        <label htmlFor="mois" className="label-inline">Mois :</label>
        <input
          className="select-mois"
          id="mois"
          type="month"
          value={mois.slice(0, 7)}
          onChange={(e) => setMois(`${e.target.value}-01`)}
        />

        <h3>Revenus</h3>
        {revenus.map((r, i) => (
          <div key={i} className="ligne-repartition-nouvelle">
            <select
              value={r.utilisateur_id}
              onChange={(e) => majLigne(revenus, setRevenus, i, 'utilisateur_id', e.target.value)}
            >
              <option value="">Personne...</option>
              {utilisateurs.map((u) => (
                <option key={u.id} value={u.id}>{u.nom}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Source (ex: Salaire, CAF)"
              value={r.source}
              onChange={(e) => majLigne(revenus, setRevenus, i, 'source', e.target.value)}
            />
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="Montant (€)"
              value={r.montant}
              onChange={(e) => majLigne(revenus, setRevenus, i, 'montant', e.target.value)}
            />
            <button className="btn-retirer-ligne" onClick={() => retirerLigne(revenus, setRevenus, i)}>✕</button>
          </div>
        ))}
        <button className="btn-ajouter-champ" onClick={() => ajouterLigne(revenus, setRevenus, ligneRevenuVide)}>+ Ajouter un revenu</button>

        <h3>Dépenses communes</h3>
        {depenses.map((d, i) => (
          <div key={i} className="ligne-repartition-nouvelle">
            <input
              type="text"
              placeholder="Nom"
              value={d.nom}
              onChange={(e) => majLigne(depenses, setDepenses, i, 'nom', e.target.value)}
            />
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="Montant (€)"
              value={d.montant}
              onChange={(e) => majLigne(depenses, setDepenses, i, 'montant', e.target.value)}
            />
            <button className="btn-retirer-ligne" onClick={() => retirerLigne(depenses, setDepenses, i)}>✕</button>
          </div>
        ))}
        <button className="btn-ajouter-champ" onClick={() => ajouterLigne(depenses, setDepenses)}>+ Ajouter une dépense</button>

        <div>
          <button className="btn-primary" onClick={gererCalcul}>Calculer</button>
        </div>
      </div>

      {resultat && (
        <div className="carte-resultat bloc-repartition">
          <h3>Résultat</h3>
          <p>Revenu total : {(resultat.resultat.revenu_total / 100).toFixed(2)} €</p>
          <p>Dépenses totales : {(resultat.resultat.depenses_totales / 100).toFixed(2)} €</p>
          {resultat.resultat.repartition.map((r) => (
            <p key={r.nom}>{r.nom} : {(r.part_a_verser / 100).toFixed(2)} €</p>
          ))}
        </div>
      )}

      <h2>Historique</h2>
      <ul className="liste-historique">
        {historique.map((h) => (
          <li key={h.id} className={h.est_active ? 'historique-actif' : ''}>
            <span>{h.mois}</span>
            {h.resultat.repartition.map((r) => (
              <span key={r.nom}>{r.nom}: {(r.part_a_verser / 100).toFixed(2)} €</span>
            ))}
            <button className="bouton-discret" onClick={() => chargerDansFormulaire(h)}>Charger</button>
            <button className="bouton-discret" onClick={() => gererActivation(h.id)} disabled={h.est_active}>
              {h.est_active ? 'Active' : 'Activer'}
            </button>
            <button className="bouton-discret" onClick={() => gererSuppression(h.id)}>Supprimer</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Repartition;