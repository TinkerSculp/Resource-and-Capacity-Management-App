  const express = require('express');
  const mysql = require('mysql2');
  const cors = require('cors');

  const app = express();
  const port = 3001; // Or any available port

  app.use(cors());
  app.use(express.json()); // To parse JSON request bodies

  // Create a MySQL connection pool
  const db = mysql.createPool({
      host: 'localhost', // Your MySQL host
      user: 'root',      // Your MySQL username
      password: 'your_password', // Your MySQL password
      database: 'your_database_name', // Your database name
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
  });

  // Example API route to fetch data
  app.get('/api/data', (req, res) => {
      db.query('SELECT * FROM your_table', (err, results) => {
          if (err) {
              console.error('Error fetching data:', err);
              res.status(500).send('Error fetching data');
              return;
          }
          res.json(results);
      });
  });

  // Example API route to add data
  app.post('/api/data', (req, res) => {
      const { name, value } = req.body;
      db.query('INSERT INTO your_table (name, value) VALUES (?, ?)', [name, value], (err, result) => {
          if (err) {
              console.error('Error inserting data:', err);
              res.status(500).send('Error inserting data');
              return;
          }
          res.status(201).send('Data added successfully');
      });
  });

  app.listen(port, () => {
      console.log(`Server running on port ${port}`);
  });