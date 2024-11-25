const express = require('express');
const sql = require('mssql');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const port = 3000;

// Middleware setup
app.use(cors());
app.use(bodyParser.json());

app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html')); // Serve login.html when accessing /
  });

  

// Database configuration
const dbConfig = {
  user: 'sa',
  password: 'P@ssw0rd',
  server: 'DESKTOP-SIOHM8D',
  database: 'TestDB',
  options: {
    encrypt: true,
    trustServerCertificate: true
  }
};

// Connect to SQL Server
sql.connect(dbConfig).then(() => {
  console.log("Connected to SQL Server");
}).catch((err) => {
  console.error("Failed to connect to SQL Server", err);
});

// Generate JWT token
const generateAuthToken = () => {
  return jwt.sign({}, 'your_jwt_secret', { expiresIn: '1h' });  // Replace with your secret key
};

// POST /login route
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
  
    const request = new sql.Request();
    const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  
    request.input('username', sql.NVarChar, username);
    request.input('password', sql.NVarChar, password);
  
    try {
      // Execute login query
      const result = await sql.query(`SELECT * FROM useraccounts WHERE username = '${username}' AND password = '${password}'`);

      const isSuccess = result.recordset.length > 0;
  
      // Log the login attempt
      const logRequest = new sql.Request();
      logRequest.input('username', sql.NVarChar, username);
      logRequest.input('ipAddress', sql.NVarChar, clientIP);
      logRequest.input('isSuccessful', sql.Bit, isSuccess);
      await logRequest.query(
        'INSERT INTO LoginLogs (Username, IPAddress, IsSuccessful, Timestamp) VALUES (@username, @ipAddress, @isSuccessful, GETDATE())'
      );
  
      // Handle response based on login success
      if (isSuccess) {
        const token = generateAuthToken();
        res.status(200).json({ token });
      } else {
        res.status(401).json({ message: 'Invalid credentials' });
      }
    } catch (err) {
      res.status(500).json({ message: 'Error logging in', error: err });
    }
  });

  app.get('/', (req, res) => {
    res.send('Welcome to the API. Use /login to authenticate.');
  });
  
// Handle preflight CORS requests
app.options('/login', cors());

// Start the server
app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on port ${port}`);
  });
  
  