const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');  // Import the CORS package

const app = express();
const port = 3000;

// Set up the MySQL connection
const connection = mysql.createConnection({
    host: 'db3.ch4qywaga5wq.ap-south-1.rds.amazonaws.com',  // Replace with your RDS endpoint
    user: 'admin',      // Replace with your RDS username
    password: 'Kammavari123',  // Replace with your RDS password
    database: 'Arjav'   // Replace with your database name
});

// Establish MySQL connection
connection.connect(err => {
    if (err) {
        console.error('Error connecting to the database: ' + err.stack);
        return;
    }
    console.log('Connected to the database.');
});

// Use CORS for all routes
app.use(cors());  // Enable CORS globally for all routes

// Create an endpoint to fetch users from the 'users' table
app.get('/users', (req, res) => {
    connection.query('select * from users', (err, results) => {
        if (err) {
            res.status(500).send('Error retrieving users.');
            return;
        }
        res.json(results);  // Send the users as JSON response
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
