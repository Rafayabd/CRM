const jwt = require('jsonwebtoken');

// This is the same secret from your index.js
const JWT_SECRET = 'your-super-secret-key-12345';


function authMiddleware(req, res, next) {
    // Get the token from the request header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) {
        return res.status(401).json({ message: 'No token provided' }); // Unauthorized
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid token' }); // Forbidden
        }

        // If token is valid, attach the user's info to the request object
        req.user = user;
        next(); // Move on to the next function (the actual API endpoint)
    });
}

// Middleware to check if the user is an Admin
function adminOnly(req, res, next) {
    if (req.user && req.user.role === 'Admin') {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Admin role required.' });
    }
}

module.exports = {
    authMiddleware,
    adminOnly
};