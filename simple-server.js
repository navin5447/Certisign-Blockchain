import http from 'http';

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  
  if (req.method === 'OPTIONS') {
    res.end();
    return;
  }
  
  res.end(JSON.stringify({ 
    status: 'OK', 
    message: 'Simple test server is working',
    timestamp: new Date().toISOString()
  }));
});

const PORT = 3333;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Simple test server running on http://localhost:${PORT}`);
  console.log('Test with: http://localhost:3333');
});

server.on('error', (err) => {
  console.error('Server error:', err);
});