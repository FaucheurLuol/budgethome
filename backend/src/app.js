const express = require('express');
const cors = require('cors');
const verifierToken = require('./middleware/auth');
const gestionErreurs = require('./middleware/erreurs');
const authRoutes = require('./routes/auth');
const comptesRoutes = require('./routes/comptes');
const categoriesRoutes = require('./routes/categories');

const app = express();

app.use(cors());
app.use(express.json());
app.use(gestionErreurs);
app.use('/auth', authRoutes);
app.use('/comptes', comptesRoutes);
app.use('/categories', categoriesRoutes);

module.exports = app;