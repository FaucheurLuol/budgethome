import { useState, useEffect } from 'react';
import { listerCategoriesApi, creerCategorieApi, supprimerCategorieApi } from '../api/categories';
import { organiserEnArbre } from '../api/organiserCategories';
import '../style/app.css';

function Categories() {
  const [categoriesPlates, setCategoriesPlates] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  const [nom, setNom] = useState('');
  const [typeCategorie, setTypeCategorie] = useState('depense');
  const [parentId, setParentId] = useState('');

  useEffect(() => {
    chargerCategories();
  }, []);

  async function chargerCategories() {
    try {
      const donnees = await listerCategoriesApi();
      setCategoriesPlates(donnees);
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
      await creerCategorieApi({
        nom,
        type_categorie: typeCategorie,
        parent_id: parentId ? Number(parentId) : null,
      });
      setNom('');
      setParentId('');
      chargerCategories();
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function gererSuppression(id) {
    try {
      await supprimerCategorieApi(id);
      chargerCategories();
    } catch (err) {
      setErreur(err.message);
    }
  }

  if (chargement) return <p>Chargement...</p>;

  const arbre = organiserEnArbre(categoriesPlates);
  const racinesDuMemeType = categoriesPlates.filter(
    (cat) => !cat.parent_id && cat.type_categorie === typeCategorie
  );

  function afficherNoeud(noeud) {
    return (
      <li key={noeud.id}>
        <div className="noeud-categorie">
          <span>{noeud.nom}</span>
          <button className="bouton-discret" onClick={() => gererSuppression(noeud.id)}>Supprimer</button>
        </div>
        {noeud.enfants.length > 0 && (
          <ul>{noeud.enfants.map((enfant) => afficherNoeud(enfant))}</ul>
        )}
      </li>
    );
  }

  return (
    <div className="page-app">
      <h1>Mes catégories</h1>
      <p className="page-sous-titre">Organisez vos dépenses et revenus par catégorie.</p>

      {erreur && <p className="message-erreur">{erreur}</p>}

      <h2>Dépenses</h2>
      <ul className="arbre-categories">
        {arbre.filter((c) => c.type_categorie === 'depense').map((noeud) => afficherNoeud(noeud))}
      </ul>

      <h2>Revenus</h2>
      <ul className="arbre-categories">
        {arbre.filter((c) => c.type_categorie === 'revenu').map((noeud) => afficherNoeud(noeud))}
      </ul>

      <h2>Créer une catégorie</h2>
      <form className="formulaire-carte" onSubmit={gererSoumission}>
        <label htmlFor="nom">Nom :</label>
        <input id="nom" type="text" value={nom} onChange={(e) => setNom(e.target.value)} required />

        <label htmlFor="type_categorie">Type :</label>
        <select
          id="type_categorie"
          value={typeCategorie}
          onChange={(e) => { setTypeCategorie(e.target.value); setParentId(''); }}
        >
          <option value="depense">Dépense</option>
          <option value="revenu">Revenu</option>
        </select>

        <label htmlFor="parent_id">Catégorie parente (optionnel) :</label>
        <select id="parent_id" value={parentId} onChange={(e) => setParentId(e.target.value)}>
          <option value="">Aucune (catégorie racine)</option>
          {racinesDuMemeType.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.nom}</option>
          ))}
        </select>

        <button className="btn-primary" type="submit">Créer</button>
      </form>
    </div>
  );
}

export default Categories;