const mysql = require('mysql2/promise');

// Database connection (Pool) ko yahan import karne ke bajaye, 
// hum function mein pass karenge ya same pool use karenge.
// Simplicity ke liye, hum index.js wala pool reuse karenge.

const logActivity = async (dbPool, leadId, userId, actionType, description) => {
    try {
        await dbPool.query(
            'INSERT INTO LeadLogs (LeadID, UserID, ActionType, Description) VALUES (?, ?, ?, ?)',
            [leadId, userId, actionType, description]
        );
        console.log(`📝 Logged: ${actionType} for Lead ${leadId}`);
    } catch (error) {
        console.error('Failed to log activity:', error);
        // Log fail hone se main process nahi rukna chahiye
    }
};

module.exports = { logActivity };