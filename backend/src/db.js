const { Pool, types } = require('pg');
require('dotenv').config();

types.setTypeParser(1082, (val) => val); // 1082 = OID du type DATE en PostgreSQL

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

module.exports = pool;