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
const simulationsRoutes = require('./routes/simulations');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/auth', authRoutes);
app.use('/comptes', comptesRoutes);
app.use('/categories', categoriesRoutes);
app.use('/transactions', transactionsRoutes);
app.use('/budgets', budgetsRoutes);
app.use('/objectifs', objectifsRoutes);
app.use('/simulations', simulationsRoutes);

app.use(gestionErreurs);
module.exports = app;