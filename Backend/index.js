// 1. IMPORT REQUIRED PACKAGES
const { authMiddleware, adminOnly } = require('./authMiddleware'); 
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { sendAssignmentEmail } = require('./emailService');
const { logActivity } = require('./logService'); 

const multer = require('multer');
const csv = require('csv-parser');
const { Parser } = require('json2csv');
const fs = require('fs');

// 2. INITIALIZE THE APP
const app = express();
app.use(cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

// 3. DATABASE CONNECTION
const dbPool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '', // Your Password
    database: 'crm_db'
});

const JWT_SECRET = 'your-super-secret-key-12345';

// 4. ROUTES
app.get('/', (req, res) => res.send('CRM API Running'));

// --- AUTH ---
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password, role } = req.body;
        if (!username || !email || !password || !role) return res.status(400).json({ message: 'All fields required.' });
        const [existing] = await dbPool.query('SELECT * FROM Users WHERE Email = ? OR Username = ?', [email, username]);
        if (existing.length > 0) return res.status(409).json({ message: 'User already exists.' });
        const hash = await bcrypt.hash(password, 10);
        await dbPool.query('INSERT INTO Users (Username, Email, PasswordHash, Role) VALUES (?, ?, ?, ?)', [username, email, hash, role]);
        res.status(201).json({ message: 'User registered successfully!' });
    } catch (error) { res.status(500).json({ message: 'Error.' }); }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const [users] = await dbPool.query('SELECT * FROM Users WHERE Email = ?', [email]);
        const user = users[0];
        if (!user || !(await bcrypt.compare(password, user.PasswordHash))) return res.status(401).json({ message: 'Invalid credentials.' });
        const token = jwt.sign({ userId: user.UserID, username: user.Username, role: user.Role }, JWT_SECRET, { expiresIn: '1d' });
        res.status(200).json({ message: 'Login successful!', token, user: { userId: user.UserID, username: user.Username, email: user.Email, role: user.Role } });
    } catch (error) { res.status(500).json({ message: 'Error.' }); }
});

app.use(authMiddleware);

// ====> NOTIFICATIONS ROUTES <====
app.get('/api/notifications', async (req, res) => {
    try {
        const [notifs] = await dbPool.query(
            'SELECT * FROM Notifications WHERE UserID = ? ORDER BY CreatedAt DESC LIMIT 10', 
            [req.user.userId]
        );
        res.status(200).json(notifs);
    } catch (error) { res.status(500).json({ message: 'Error.' }); }
});

app.patch('/api/notifications/mark-read', async (req, res) => {
    try {
        await dbPool.query('UPDATE Notifications SET IsRead = TRUE WHERE UserID = ?', [req.user.userId]);
        res.status(200).json({ message: 'Marked read.' });
    } catch (error) { res.status(500).json({ message: 'Error.' }); }
});

// --- LEADS ---
app.post('/api/leads', adminOnly, async (req, res) => {
    try {
        const { Name, ContactInfo, Status, Notes, AssignedUserID } = req.body;
        const createdByID = req.user.userId;
        const [result] = await dbPool.query(
            'INSERT INTO Leads (Name, ContactInfo, Status, Notes, AssignedUserID, CreatedByID) VALUES (?, ?, ?, ?, ?, ?)',
            [Name, ContactInfo, Status || 'Pending', Notes || null, AssignedUserID || null, createdByID]
        );
        
        await logActivity(dbPool, result.insertId, createdByID, 'CREATED', `Lead created by ${req.user.username}`);
        res.status(201).json({ message: 'Lead created!', leadId: result.insertId });
    } catch (error) { res.status(500).json({ message: 'Server error.' }); }
});

app.get('/api/leads', async (req, res) => {
    try {
        const { role, userId } = req.user;
        let query = 'SELECT L.*, U_Assigned.Username as AssignedTo, U_Creator.Username as CreatedBy FROM Leads AS L LEFT JOIN Users AS U_Assigned ON L.AssignedUserID = U_Assigned.UserID LEFT JOIN Users AS U_Creator ON L.CreatedByID = U_Creator.UserID ';
        if (role === 'Admin') {
            const [leads] = await dbPool.query(query + 'ORDER BY L.CreatedAt DESC');
            return res.status(200).json(leads);
        } else {
            query += 'WHERE L.AssignedUserID = ? ORDER BY L.CreatedAt DESC';
            const [leads] = await dbPool.query(query, [userId]);
            return res.status(200).json(leads);
        }
    } catch (error) { res.status(500).json({ message: 'Server error.' }); }
});

// Import/Export
app.get('/api/leads/export', adminOnly, async (req, res) => {
    try {
        const [leads] = await dbPool.query(`SELECT L.LeadID, L.Name, L.ContactInfo, L.Status, U.Username as AssignedTo FROM Leads L LEFT JOIN Users U ON L.AssignedUserID = U.UserID`);
        const json2csvParser = new Parser();
        const csvData = json2csvParser.parse(leads);
        res.header('Content-Type', 'text/csv');
        res.attachment('leads.csv');
        return res.send(csvData);
    } catch (error) { res.status(500).json({ message: 'Error.' }); }
});

app.post('/api/leads/import', adminOnly, upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file.' });
    const results = [];
    try {
        fs.createReadStream(req.file.path).pipe(csv()).on('data', (data) => results.push(data)).on('end', async () => {
            for (const row of results) {
                if (row.Name && row.ContactInfo) {
                    try {
                        const [res] = await dbPool.query('INSERT INTO Leads (Name, ContactInfo, Status, CreatedByID) VALUES (?, ?, ?, ?)', [row.Name, row.ContactInfo, 'Pending', req.user.userId]);
                        await logActivity(dbPool, res.insertId, req.user.userId, 'IMPORTED', 'Lead imported via CSV');
                    } catch (e) {}
                }
            }
            fs.unlinkSync(req.file.path);
            res.json({ message: 'Import complete.' });
        });
    } catch (error) { res.status(500).json({ message: 'Error.' }); }
});

// --- SINGLE LEAD ---
app.get('/api/leads/:leadId', async (req, res) => {
    try {
        const [leads] = await dbPool.query(`SELECT L.*, U_Assigned.Username as AssignedTo, U_Creator.Username as CreatedBy FROM Leads AS L LEFT JOIN Users AS U_Assigned ON L.AssignedUserID = U_Assigned.UserID LEFT JOIN Users AS U_Creator ON L.CreatedByID = U_Creator.UserID WHERE L.LeadID = ?`, [req.params.leadId]);
        if (!leads[0]) return res.status(404).json({ message: 'Not found.' });
        res.status(200).json(leads[0]);
    } catch (error) { res.status(500).json({ message: 'Error.' }); }
});

app.patch('/api/leads/:leadId/details', async (req, res) => {
    try {
        const { Name, ContactInfo, Notes } = req.body;
        await dbPool.query('UPDATE Leads SET Name=?, ContactInfo=?, Notes=? WHERE LeadID=?', [Name, ContactInfo, Notes, req.params.leadId]);
        await logActivity(dbPool, req.params.leadId, req.user.userId, 'UPDATED', 'Lead details updated');
        res.status(200).json({ message: 'Updated.' });
    } catch (error) { res.status(500).json({ message: 'Error.' }); }
});

app.patch('/api/leads/:leadId/status', async (req, res) => {
    try {
        const { Status } = req.body;
        await dbPool.query('UPDATE Leads SET Status=? WHERE LeadID=?', [Status, req.params.leadId]);
        await logActivity(dbPool, req.params.leadId, req.user.userId, 'STATUS_CHANGE', `Status changed to ${Status}`);
        res.status(200).json({ message: 'Status updated.' });
    } catch (error) { res.status(500).json({ message: 'Error.' }); }
});

// ====> ASSIGN LEAD <====
app.patch('/api/leads/:leadId/assign', adminOnly, async (req, res) => {
    try {
        let { AssignedUserID } = req.body;
        if (AssignedUserID === "") AssignedUserID = null;
        const leadId = req.params.leadId;
        
        let userEmail = null;
        let leadName = null;
        if(AssignedUserID) {
            const [u] = await dbPool.query('SELECT Username, Email FROM Users WHERE UserID=?', [AssignedUserID]);
            if(u.length > 0) userEmail = u[0].Email;
            const [l] = await dbPool.query('SELECT Name FROM Leads WHERE LeadID=?', [leadId]);
            if(l.length > 0) leadName = l[0].Name;
        }

        await dbPool.query('UPDATE Leads SET AssignedUserID=? WHERE LeadID=?', [AssignedUserID, leadId]);
        await logActivity(dbPool, leadId, req.user.userId, 'ASSIGNED', `Lead assigned to user ${AssignedUserID}`);

        if (AssignedUserID && leadName) {
            await dbPool.query(
                'INSERT INTO Notifications (UserID, Message, Link) VALUES (?, ?, ?)',
                [AssignedUserID, `New Lead Assigned: ${leadName}`, `/leads/${leadId}`]
            );
            // if (userEmail) sendAssignmentEmail(userEmail, leadName, req.user.username).catch(console.error);
        }

        res.status(200).json({ message: 'Assigned.' });
    } catch (error) { res.status(500).json({ message: 'Error.' }); }
});

app.get('/api/leads/:leadId/logs', async (req, res) => {
    try {
        const [logs] = await dbPool.query(`SELECT L.*, U.Username FROM LeadLogs AS L LEFT JOIN Users AS U ON L.UserID = U.UserID WHERE L.LeadID = ? ORDER BY L.CreatedAt DESC`, [req.params.leadId]);
        res.status(200).json(logs);
    } catch (error) { res.status(500).json({ message: 'Server error.' }); }
});

// --- TASKS ---
app.get('/api/leads/:leadId/tasks', async (req, res) => {
    try {
        const [tasks] = await dbPool.query('SELECT * FROM Tasks WHERE LeadID = ? ORDER BY IsCompleted ASC, DueDate ASC', [req.params.leadId]);
        res.status(200).json(tasks);
    } catch (error) { res.status(500).json({ message: 'Error.' }); }
});

app.post('/api/leads/:leadId/tasks', async (req, res) => {
    try {
        const { Description, DueDate } = req.body;
        if (!Description) return res.status(400).json({ message: 'Description required.' });
        await dbPool.query('INSERT INTO Tasks (LeadID, UserID, Description, DueDate) VALUES (?, ?, ?, ?)', [req.params.leadId, req.user.userId, Description, DueDate || null]);
        res.status(201).json({ message: 'Task added.' });
    } catch (error) { res.status(500).json({ message: 'Error.' }); }
});

app.patch('/api/tasks/:taskId/toggle', async (req, res) => {
    try {
        const [rows] = await dbPool.query('SELECT IsCompleted FROM Tasks WHERE TaskID = ?', [req.params.taskId]);
        if (rows.length === 0) return res.status(404).json({ message: 'Not found.' });
        const newStatus = !rows[0].IsCompleted;
        await dbPool.query('UPDATE Tasks SET IsCompleted = ? WHERE TaskID = ?', [newStatus, req.params.taskId]);
        res.status(200).json({ message: 'Task updated.' });
    } catch (error) { res.status(500).json({ message: 'Error.' }); }
});

app.delete('/api/tasks/:taskId', async (req, res) => {
    try {
        await dbPool.query('DELETE FROM Tasks WHERE TaskID = ?', [req.params.taskId]);
        res.status(200).json({ message: 'Task deleted.' });
    } catch (error) { res.status(500).json({ message: 'Error.' }); }
});

// --- COMMENTS & OTHERS ---
app.get('/api/leads/:leadId/comments', async (req, res) => {
    const [c] = await dbPool.query('SELECT C.*, U.Username FROM Comments C JOIN Users U ON C.UserID=U.UserID WHERE LeadID=? ORDER BY CreatedAt DESC', [req.params.leadId]);
    res.json(c);
});
app.post('/api/leads/:leadId/comments', async (req, res) => {
    await dbPool.query('INSERT INTO Comments (LeadID, UserID, CommentText) VALUES (?,?,?)', [req.params.leadId, req.user.userId, req.body.CommentText]);
    res.status(201).json({message:'Added'});
});
app.delete('/api/leads/:leadId', adminOnly, async (req, res) => {
    await dbPool.query('DELETE FROM Comments WHERE LeadID=?', [req.params.leadId]);
    await dbPool.query('DELETE FROM LeadLogs WHERE LeadID=?', [req.params.leadId]);
    await dbPool.query('DELETE FROM Tasks WHERE LeadID=?', [req.params.leadId]);
    await dbPool.query('DELETE FROM Leads WHERE LeadID=?', [req.params.leadId]);
    res.json({message:'Deleted'});
});

// ====> UPDATED STATS FOR ANALYTICS 2.0 <====
app.get('/api/reports/quick-stats', adminOnly, async (req, res) => {
    try {
        // 1. Pie Chart Data (Status)
        const [statusCounts] = await dbPool.query('SELECT Status, COUNT(*) as count FROM Leads GROUP BY Status');
        
        // 2. Bar Chart Data (User Performance)
        const [userCounts] = await dbPool.query(`
            SELECT 
                U.Username, 
                COUNT(L.LeadID) as TotalLeads,
                SUM(CASE WHEN L.Status = 'Success' THEN 1 ELSE 0 END) as SuccessCount,
                SUM(CASE WHEN L.Status = 'Active' THEN 1 ELSE 0 END) as ActiveCount,
                SUM(CASE WHEN L.Status = 'Pending' THEN 1 ELSE 0 END) as PendingCount
            FROM Users U 
            LEFT JOIN Leads L ON U.UserID = L.AssignedUserID 
            WHERE U.Role = "Sales User" 
            GROUP BY U.UserID
        `);

        // 3. Summary
        const [summary] = await dbPool.query(`
            SELECT 
                SUM(CASE WHEN Status = 'Active' OR Status = 'Success' THEN 1 ELSE 0 END) as ActiveSummary,
                SUM(CASE WHEN Status = 'Cancel' THEN 1 ELSE 0 END) as CancelSummary
             FROM Leads
        `);

        // 4. ===> NEW: LEADS TREND (LAST 7 DAYS) <===
        const [trend] = await dbPool.query(`
            SELECT DATE_FORMAT(CreatedAt, '%Y-%m-%d') as date, COUNT(*) as count
            FROM Leads
            WHERE CreatedAt >= CURDATE() - INTERVAL 6 DAY
            GROUP BY DATE_FORMAT(CreatedAt, '%Y-%m-%d')
            ORDER BY date ASC
        `);

        res.status(200).json({
            leadsByStatus: statusCounts,
            leadsPerUser: userCounts,
            performanceSummary: summary[0],
            leadsTrend: trend // Sending trend data
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
});

app.get('/api/users/sales', adminOnly, async (req, res) => {
    const [u] = await dbPool.query("SELECT UserID, Username FROM Users WHERE Role='Sales User'");
    res.json(u);
});
app.get('/api/users', adminOnly, async (req, res) => {
    const [u] = await dbPool.query("SELECT UserID, Username, Email, Role, CreatedAt FROM Users");
    res.json(u);
});
app.delete('/api/users/:id', adminOnly, async (req, res) => {
    if(parseInt(req.params.id)===req.user.userId) return res.status(400).json({message:'No'});
    await dbPool.query('UPDATE Leads SET AssignedUserID=NULL WHERE AssignedUserID=?',[req.params.id]);
    await dbPool.query('DELETE FROM Users WHERE UserID=?',[req.params.id]);
    res.json({message:'Deleted'});
});

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Running on ${PORT}`));