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