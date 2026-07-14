const express = require('express');
const cors = require('cors');
const gestionErreurs = require('./middleware/erreurs');

const app = express();

app.use(cors());
app.use(express.json());
app.use(gestionErreurs);

module.exports = app;