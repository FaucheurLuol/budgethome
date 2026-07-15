export function organiserEnArbre(categoriesPlates) {
  const categoriesParId = {};
  categoriesPlates.forEach((cat) => {
    categoriesParId[cat.id] = { ...cat, enfants: [] };
  });

  const racines = [];

  categoriesPlates.forEach((cat) => {
    if (cat.parent_id) {
      categoriesParId[cat.parent_id].enfants.push(categoriesParId[cat.id]);
    } else {
      racines.push(categoriesParId[cat.id]);
    }
  });

  return racines;
}

export function aplatirPourSelect(categoriesPlates) {
  const arbre = organiserEnArbre(categoriesPlates);
  const resultat = [];

  function parcourir(noeuds, profondeur) {
    noeuds.forEach((noeud) => {
      resultat.push({
        id: noeud.id,
        nomAffiche: '—'.repeat(profondeur) + (profondeur > 0 ? ' ' : '') + noeud.nom,
      });
      if (noeud.enfants.length > 0) {
        parcourir(noeud.enfants, profondeur + 1);
      }
    });
  }

  parcourir(arbre, 0);
  return resultat;
}