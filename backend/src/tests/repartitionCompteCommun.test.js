const { calculerRepartition } = require('../services/repartitionCompteCommun');

describe('calculerRepartition', () => {
  test('répartit au prorata simple des revenus', () => {
    const revenus = [
      { personne: 'Lucas', montant: 200000 },
      { personne: 'Chloé', montant: 300000 },
    ];
    const depenses = [{ nom: 'Loyer', montant: 150000 }];

    const resultat = calculerRepartition(revenus, depenses);

    expect(resultat.revenu_total).toBe(500000);
    expect(resultat.depenses_totales).toBe(150000);

    const lucas = resultat.repartition.find((r) => r.nom === 'Lucas');
    const chloe = resultat.repartition.find((r) => r.nom === 'Chloé');
    expect(lucas.part_a_verser).toBe(60000);
    expect(chloe.part_a_verser).toBe(90000);
  });

  test('consolide plusieurs revenus de la même personne (multi-source)', () => {
    const revenus = [
      { personne: 'Chloé', montant: 300000 },
      { personne: 'Chloé', montant: 30000 },
      { personne: 'Lucas', montant: 200000 },
    ];
    const depenses = [{ nom: 'Courses', montant: 50000 }];

    const resultat = calculerRepartition(revenus, depenses);

    const chloe = resultat.repartition.find((r) => r.nom === 'Chloé');
    expect(chloe.revenu).toBe(330000);
    // La somme des parts doit toujours reconstituer exactement le total des dépenses
    const sommeParts = resultat.repartition.reduce((s, r) => s + r.part_a_verser, 0);
    expect(sommeParts).toBe(50000);
  });

  test('rejette avec moins de 2 personnes distinctes', () => {
    const revenus = [{ personne: 'Lucas', montant: 200000 }];
    const depenses = [{ nom: 'Loyer', montant: 100000 }];

    expect(() => calculerRepartition(revenus, depenses)).toThrow(
      'Au moins deux personnes distinctes sont nécessaires'
    );
  });

  test('rejette sans aucune dépense', () => {
    const revenus = [
      { personne: 'Lucas', montant: 200000 },
      { personne: 'Chloé', montant: 300000 },
    ];

    expect(() => calculerRepartition(revenus, [])).toThrow(
      'Au moins une dépense est nécessaire'
    );
  });

  test('rejette un revenu total nul', () => {
    const revenus = [
      { personne: 'Lucas', montant: 0 },
      { personne: 'Chloé', montant: 0 },
    ];
    const depenses = [{ nom: 'Loyer', montant: 100000 }];

    expect(() => calculerRepartition(revenus, depenses)).toThrow(
      'Le revenu total doit être supérieur à zéro'
    );
  });
});