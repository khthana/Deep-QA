// swagger.js
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const test = require('./config/testMail');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'My API',
      version: '1.0.0',
      description: 'API documentation by Swagger',
    },
    servers: [
      {
        url: 'http://localhost:3000' || 'http://100.70.152.92:3000', 
      },
    ],
  },
  apis: ['./routes/*.js'], 
};

const specs = swaggerJsdoc(options);

module.exports = {
  swaggerUi,
  specs,
};
