// Servidor HTTP simples para servir a simulação sem depender de ferramentas extras
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 4173;
const PUBLIC_DIR = __dirname;
// Tipos MIME básicos para conteúdos estáticos mais comuns
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// Lê o arquivo do disco e envia com o cabeçalho adequado
function sendFile(res, filePath, status = 200) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Erro ao carregar arquivo.');
      return;
    }
    res.writeHead(status, { 'Content-Type': contentType });
    res.end(data);
  });
}

// Roteamento mínimo: tenta servir o caminho solicitado ou cai para o index
const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  const safePath = urlPath === '/' ? '/index.html' : urlPath;
  const filePath = path.join(PUBLIC_DIR, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback para a página principal
      const fallback = path.join(PUBLIC_DIR, 'index.html');
      sendFile(res, fallback, 200);
      return;
    }
    sendFile(res, filePath);
  });
});

// Inicializa o servidor na porta escolhida
server.listen(PORT, () => {
  console.log(`Servidor iniciado em http://localhost:${PORT}`);
});
