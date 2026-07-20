const Sentry = require('@sentry/node');

Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 1.0,
});

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
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
const foyersRoutes = require('./routes/foyers');

const app = express();

app.use(helmet());
const originesAutorisees = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL]
  : ['http://localhost:5173'];

app.use(cors({
  origin: originesAutorisees,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
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
app.use('/foyers', foyersRoutes);

app.get('/debug-sentry', (req, res) => {
    throw new Error('Test Sentry backend');
});

Sentry.setupExpressErrorHandler(app);
app.use(gestionErreurs);

module.exports = app;