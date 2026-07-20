const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'BudgetHome API',
      version: '1.0.0',
      description: 'Documentation de l\'API BudgetHome — gestion budgétaire pour le foyer',
    },
    servers: [
      { url: process.env.API_URL || 'http://localhost:5000', description: 'Serveur courant' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.js'],
};

module.exports = swaggerJsdoc(options);