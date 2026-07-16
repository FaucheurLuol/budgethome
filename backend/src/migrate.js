require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrer() {
  try {
    const cheminScript = path.join(__dirname, 'migration.sql');
    const script = fs.readFileSync(cheminScript, 'utf8');

    console.log('Exécution du script de migration...');
    await pool.query(script);
    console.log('Migration terminée avec succès.');
  } catch (erreur) {
    console.error('Erreur lors de la migration :', erreur.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrer();