const {PORT = 3000} = process.env;
const express = require('express');
const server = express();
require('dotenv').config();

const bodyParser = require('body-parser');
server.use(bodyParser.json());

const morgan = require('morgan');
server.use(morgan('dev'));

const apiRouter = require('./api');
server.use('/api', apiRouter);

const { client } = require('./db');
client.connect();

server.use((req,res,next) => {
  console.log("<____Body Logger START____>");
  console.log(req.body);
  console.log("<____Body Logger END____>");

  next();
});

server.listen(PORT, () => {
  console.log(`The server is up on port ${PORT}`);
});
