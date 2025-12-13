require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// === MIDDLEWARE ===
app.use(express.json());
app.use(cors({
    origin: '*', // Live deployment mein testing ke liye best hai
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// === DATABASE CONNECTION (AIVEN/RENDER READY) ===
const dbPool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'defaultdb',
    port: process.env.DB_PORT || 24333,
    ssl: {
        rejectUnauthorized: false // Aiven/Cloud DB ke liye ye line MUST hai
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
}).promise();

// === AUTH MIDDLEWARES ===
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Token missing' });

    jwt.verify(token, process.env.JWT_SECRET || 'secret123', (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid token' });
        req.user = user;
        next();
    });
};

const adminOnly = (req, res, next) => {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Admin access required' });
    next();
};

// === ROUTES ===

// 1. Auth: Register & Login
app.post('/api/auth/register', async (req, res) => {
    const { username, email, password, role } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await dbPool.query(
            'INSERT INTO Users (Username, Email, PasswordHash, Role) VALUES (?, ?, ?, ?)',
            [username, email, hashedPassword, role || 'Sales User']
        );
        res.status(201).json({ message: 'User created' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [users] = await dbPool.query('SELECT * FROM Users WHERE Email = ?', [email]);
        if (users.length === 0) return res.status(404).json({ message: 'User not found' });

        const user = users[0];
        const validPass = await bcrypt.compare(password, user.PasswordHash);
        if (!validPass) return res.status(401).json({ message: 'Invalid credentials' });

        const token = jwt.sign(
            { id: user.UserID, role: user.Role, username: user.Username },
            process.env.JWT_SECRET || 'secret123',
            { expiresIn: '24h' }
        );
        res.json({ token, user: { id: user.UserID, username: user.Username, email: user.Email, role: user.Role } });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 2. Leads: CRUD
app.get('/api/leads', authenticateToken, async (req, res) => {
    try {
        let query = 'SELECT l.*, u.Username as CreatedBy FROM Leads l JOIN Users u ON l.CreatedByID = u.UserID';
        let params = [];
        
        if (req.user.role !== 'Admin') {
            query += ' WHERE l.AssignedUserID = ? OR l.CreatedByID = ?';
            params = [req.user.id, req.user.id];
        }
        
        const [leads] = await dbPool.query(query, params);
        res.json(leads);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/leads', authenticateToken, async (req, res) => {
    const { Name, ContactInfo, Status, Notes } = req.body;
    try {
        await dbPool.query(
            'INSERT INTO Leads (Name, ContactInfo, Status, Notes, CreatedByID) VALUES (?, ?, ?, ?, ?)',
            [Name, ContactInfo, Status || 'Pending', Notes, req.user.id]
        );
        res.status(201).json({ message: 'Lead created' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.patch('/api/leads/:id/status', authenticateToken, async (req, res) => {
    const { Status } = req.body;
    try {
        await dbPool.query('UPDATE Leads SET Status = ? WHERE LeadID = ?', [Status, req.params.id]);
        res.json({ message: 'Status updated' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.patch('/api/leads/:id/assign', authenticateToken, adminOnly, async (req, res) => {
    const { AssignedUserID } = req.body;
    try {
        await dbPool.query('UPDATE Leads SET AssignedUserID = ? WHERE LeadID = ?', [AssignedUserID, req.params.id]);
        res.json({ message: 'Lead assigned' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// 3. Reports: Analytics
app.get('/api/reports/quick-stats', authenticateToken, adminOnly, async (req, res) => {
    try {
        const [statusStats] = await dbPool.query('SELECT Status, COUNT(*) as count FROM Leads GROUP BY Status');
        const [userStats] = await dbPool.query('SELECT u.Username, COUNT(l.LeadID) as TotalLeads FROM Users u LEFT JOIN Leads l ON u.UserID = l.AssignedUserID GROUP BY u.UserID');
        const [trendStats] = await dbPool.query('SELECT DATE(CreatedAt) as date, COUNT(*) as count FROM Leads GROUP BY DATE(CreatedAt) ORDER BY date DESC LIMIT 7');
        
        res.json({ leadsByStatus: statusStats, leadsPerUser: userStats, leadsTrend: trendStats });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// 4. Users Management
app.get('/api/users/sales', authenticateToken, adminOnly, async (req, res) => {
    try {
        const [users] = await dbPool.query('SELECT UserID, Username FROM Users WHERE Role = "Sales User"');
        res.json(users);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get('/api/users', authenticateToken, adminOnly, async (req, res) => {
    try {
        const [users] = await dbPool.query('SELECT UserID, Username, Email, Role, CreatedAt FROM Users');
        res.json(users);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.delete('/api/users/:id', authenticateToken, adminOnly, async (req, res) => {
    try {
        await dbPool.query('DELETE FROM Users WHERE UserID = ?', [req.params.id]);
        res.json({ message: 'User deleted' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// 5. Notifications
app.get('/api/notifications', authenticateToken, async (req, res) => {
    try {
        const [notifs] = await dbPool.query('SELECT * FROM Notifications WHERE UserID = ? ORDER BY CreatedAt DESC LIMIT 10', [req.user.id]);
        res.json(notifs);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.patch('/api/notifications/read', authenticateToken, async (req, res) => {
    try {
        await dbPool.query('UPDATE Notifications SET IsRead = TRUE WHERE UserID = ?', [req.user.id]);
        res.json({ message: 'Marked as read' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// === SERVER START ===
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
