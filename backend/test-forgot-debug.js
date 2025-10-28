import http from 'http';

const data = JSON.stringify({
  email: 'jamesshon37@gmail.com'
});

const options = {
  hostname: 'goals-ccs.onrender.com',
  port: 4000,
  path: '/api/forgot-password',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(options, (res) => {
  console.log('Status:', res.statusCode);
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  res.on('end', () => {
    console.log('Response:', body);
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.write(data);
req.end();