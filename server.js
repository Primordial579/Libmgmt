const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const cors = require('cors'); // Import CORS package

const app = express();
const port = 3000;

// Enable CORS for all origins
app.use(cors()); // This will allow requests from any origin

// Middleware to parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Set up MySQL connection (hardcoded)
const db = mysql.createConnection({
    host: 'db3.ch4qywaga5wq.ap-south-1.rds.amazonaws.com',        // Replace with your RDS host
    user: 'admin',        // Replace with your DB username
    password: 'Kammavari123',// Replace with your DB password
    database: 'Arjav',    // Replace with your DB name
});

db.connect(err => {
    if (err) {
        console.error('Database connection failed: ' + err.stack);
        return;
    }
    console.log('Connected to database');
});

// Set up image upload using multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

// Create Users table on first run if not exists
const createUsersTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL
    );
`;

const createTableQuery = `
    CREATE TABLE IF NOT EXISTS user_data (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        img VARCHAR(255),
        FOREIGN KEY (user_id) REFERENCES users(id)
    );
`;

db.query(createUsersTableQuery);
db.query(createTableQuery);

// Helper function to generate JWT
function generateToken(userId) {
    return jwt.sign({ userId }, 'your-jwt-secret-key', { expiresIn: '1h' }); // Replace with your secret key
}

// Registration endpoint
app.post('/api/register', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new user into the database
        db.query('INSERT INTO users (email, password) VALUES (?, ?)', [email, hashedPassword], (err, result) => {
            if (err) {
                return res.status(500).json({ message: 'Error registering user.' });
            }

            const token = generateToken(result.insertId);
            res.status(200).json({ token });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error registering user.' });
    }
});

// Login endpoint
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (err || results.length === 0) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        const user = results[0];
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        const token = generateToken(user.id);
        res.status(200).json({ token });
    });
});

// Middleware to verify JWT
function verifyToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return res.status(403).json({ message: 'No token provided.' });
    }

    jwt.verify(token, 'your-jwt-secret-key', (err, decoded) => { // Replace with your secret key
        if (err) {
            return res.status(403).json({ message: 'Invalid token.' });
        }
        req.userId = decoded.userId;
        next();
    });
}

// Get user data (table rows)
app.get('/api/getTableData', verifyToken, (req, res) => {
    const userId = req.userId;

    db.query('SELECT * FROM user_data WHERE user_id = ?', [userId], (err, rows) => {
        if (err) {
            return res.status(500).json({ message: 'Error fetching data.' });
        }
        res.status(200).json(rows);
    });
});

// Add a new row
app.post('/api/addRow', verifyToken, upload.single('img'), (req, res) => {
    const userId = req.userId;
    const { name } = req.body;
    const img = req.file ? '/uploads/' + req.file.filename : null;

    db.query('INSERT INTO user_data (user_id, name, img) VALUES (?, ?, ?)', [userId, name, img], (err) => {
        if (err) {
            return res.status(500).json({ message: 'Error adding row.' });
        }
        res.status(200).json({ message: 'Row added successfully!' });
    });
});

// Edit name
app.put('/api/editName/:id', verifyToken, (req, res) => {
    const userId = req.userId;
    const { name } = req.body;
    const { id } = req.params;

    db.query('UPDATE user_data SET name = ? WHERE id = ? AND user_id = ?', [name, id, userId], (err) => {
        if (err) {
            return res.status(500).json({ message: 'Error updating name.' });
        }
        res.status(200).json({ message: 'Name updated successfully!' });
    });
});

// Edit image
app.put('/api/editImage/:id', verifyToken, upload.single('img'), (req, res) => {
    const userId = req.userId;
    const { id } = req.params;
    const img = req.file ? '/uploads/' + req.file.filename : null;

    db.query('UPDATE user_data SET img = ? WHERE id = ? AND user_id = ?', [img, id, userId], (err) => {
        if (err) {
            return res.status(500).json({ message: 'Error updating image.' });
        }
        res.status(200).json({ message: 'Image updated successfully!' });
    });
});

// Delete row
app.delete('/api/deleteRow/:id', verifyToken, (req, res) => {
    const userId = req.userId;
    const { id } = req.params;

    db.query('DELETE FROM user_data WHERE id = ? AND user_id = ?', [id, userId], (err) => {
        if (err) {
            return res.status(500).json({ message: 'Error deleting row.' });
        }
        res.status(200).json({ message: 'Row deleted successfully!' });
    });
});

// Download image endpoint
app.get('/api/downloadImage/:imageName', (req, res) => {
    const { imageName } = req.params;
    const imagePath = path.join(__dirname, 'uploads', imageName);

    res.download(imagePath, (err) => {
        if (err) {
            res.status(500).json({ message: 'Error downloading image.' });
        }
    });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
