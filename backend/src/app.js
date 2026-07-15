const express = require('express');
const cors = require('cors');
const verifierToken = require('./middleware/auth');
const gestionErreurs = require('./middleware/erreurs');
const authRoutes = require('./routes/auth');
const comptesRoutes = require('./routes/comptes');
const categoriesRoutes = require('./routes/categories');
const transactionsRoutes = require('./routes/transactions');
const budgetsRoutes = require('./routes/budgets');
const objectifsRoutes = require('./routes/objectifs');
const repartitionRoutes = require('./routes/repartition');
const utilisateursRoutes = require('./routes/utilisateurs');
const modelesRoutes = require('./routes/modeles');
const dashboardRoutes = require('./routes/dashboard');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/auth', authRoutes);
app.use('/comptes', comptesRoutes);
app.use('/categories', categoriesRoutes);
app.use('/transactions', transactionsRoutes);
app.use('/budgets', budgetsRoutes);
app.use('/objectifs', objectifsRoutes);
app.use('/repartition', repartitionRoutes);
app.use('/utilisateurs', utilisateursRoutes);
app.use('/modeles', modelesRoutes);
app.use('/dashboard', dashboardRoutes);

app.use(gestionErreurs);
module.exports = app;