const express = require('express');
const cors = require('cors');
const gestionErreurs = require('./middleware/erreurs');
const authRoutes = require('./routes/auth');

const app = express();

app.use(cors());
app.use(express.json());
app.use(gestionErreurs);
app.use('/auth', authRoutes);

module.exports = app;