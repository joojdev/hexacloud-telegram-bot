const express = require('express');
const http = require('http');

function createServer() {
  const expressApp = express();
  const httpServer = http.createServer(expressApp);
  
  expressApp.get('/', (request, response) => {
    response.json({ success: true });
  });

  return httpServer;
}

function startServer(httpServer) {
  const port = process.env.PORT || 3000;
  httpServer.listen(port, () => {
    console.log(`Express Server is listening on port ${port}!`);
  });
}

module.exports = { createServer, startServer };