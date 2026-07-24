const request = require('supertest');
const app = require('../app');
const pool = require('../db');

const emailA = `test-isolation-a-${Date.now()}@test.com`;
const emailB = `test-isolation-b-${Date.now()}@test.com`;
const motDePasse = 'MotDePasseTest123!@#';

let cookieA;
let cookieB;
let compteIdA;

async function nettoyerUtilisateursTest() {
  await pool.query('DELETE FROM utilisateurs WHERE email = $1 OR email = $2', [emailA, emailB]);
}

beforeAll(async () => {
  await nettoyerUtilisateursTest();

  const inscriptionA = await request(app)
    .post('/auth/inscription')
    .send({ nom: 'TestA', email: emailA, mot_de_passe: motDePasse });
  cookieA = inscriptionA.headers['set-cookie'];

  const inscriptionB = await request(app)
    .post('/auth/inscription')
    .send({ nom: 'TestB', email: emailB, mot_de_passe: motDePasse });
  cookieB = inscriptionB.headers['set-cookie'];

  const compteA = await request(app)
    .post('/comptes')
    .set('Cookie', cookieA)
    .send({ nom: 'Compte perso A', type_compte: 'Compte courant', solde_initial: 10000, partage: false });
  compteIdA = compteA.body.id;
});

afterAll(async () => {
  await nettoyerUtilisateursTest();
  await pool.end();
});

describe('Isolation entre utilisateurs', () => {
  test("l'utilisateur B ne voit pas le compte de l'utilisateur A dans sa liste", async () => {
    const reponse = await request(app).get('/comptes').set('Cookie', cookieB);
    const idsVisibles = reponse.body.map((c) => c.id);
    expect(idsVisibles).not.toContain(compteIdA);
  });

  test("l'utilisateur B ne peut pas consulter le détail du compte de l'utilisateur A", async () => {
    const reponse = await request(app).get(`/comptes/${compteIdA}`).set('Cookie', cookieB);
    expect(reponse.status).toBe(404);
  });

  test("l'utilisateur B ne peut pas modifier le compte de l'utilisateur A", async () => {
    const reponse = await request(app)
      .put(`/comptes/${compteIdA}`)
      .set('Cookie', cookieB)
      .send({ nom: 'Piraté', type_compte: 'Compte courant' });
    expect(reponse.status).toBe(404);
  });

  test("l'utilisateur B ne peut pas archiver le compte de l'utilisateur A", async () => {
    const reponse = await request(app)
      .patch(`/comptes/${compteIdA}/archiver`)
      .set('Cookie', cookieB);
    expect(reponse.status).toBe(404);
  });

  test("l'utilisateur B ne peut pas supprimer le compte de l'utilisateur A", async () => {
    const reponse = await request(app)
      .delete(`/comptes/${compteIdA}/definitif`)
      .set('Cookie', cookieB);
    expect(reponse.status).toBe(404);
  });

  test("sans cookie, toute route protégée renvoie 401", async () => {
    const reponse = await request(app).get('/comptes');
    expect(reponse.status).toBe(401);
  });

  test("l'utilisateur B ne voit pas les utilisateurs de A dans /utilisateurs (pas de foyer commun)", async () => {
    const reponse = await request(app).get('/utilisateurs').set('Cookie', cookieB);
    const noms = reponse.body.map((u) => u.nom);
    expect(noms).not.toContain('TestA');
  });
});