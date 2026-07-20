const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'RunTrack API',
            version: '1.0.0',
            description: 'API de la plateforme BudgetHome — gestion budgétaire pour le foyer',
        },
        servers: [
            {
                url: process.env.NODE_ENV === 'production'
                    ? 'https://budgethome-production.up.railway.app'
                    : 'http://localhost:3000',
                description: process.env.NODE_ENV === 'production' ? 'Production' : 'Développement',
            },
        ],
        components: {
            securitySchemes: {
                cookieAuth: {
                    type: 'apiKey',
                    in: 'cookie',
                    name: 'token',
                },
            },
        },
    },
    apis: ['./src/routes/*.js'], // Fichiers contenant les annotations JSDoc
};

module.exports = swaggerJsdoc(options);