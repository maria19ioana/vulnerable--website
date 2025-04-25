const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

// Import routes with proper paths
const authRoutes = require('./auth.js');
const clubRoutes = require('./clubs.js');
const inviteRoutes = require('./invites.js');

// Configure CORS to allow all origins
app.use((req, res, next) => {
    // Log all incoming requests for debugging
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - Origin: ${req.headers.origin || 'Unknown'}`);
    
    // Allow requests from localhost:8080 (where our frontend is running)
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        console.log('Handling OPTIONS preflight request');
        return res.sendStatus(200);
    }
    
    next();
});

// Basic CORS middleware as backup
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Routes
app.use('/', authRoutes);
app.use('/', clubRoutes);
app.use('/', inviteRoutes);

// Test route
app.get('/test', (req, res) => {
    res.send('Server is running!');
});

// Add CORS test route
app.get('/cors-test', (req, res) => {
    res.json({ 
        success: true, 
        message: 'CORS is working!',
        origin: req.headers.origin || 'Unknown'
    });
});

// Start server with error handling
const PORT = 3000;
const server = app.listen(PORT, () => {
    console.log(`ClubConnect backend running on http://localhost:${PORT}`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please use a different port or stop the other process.`);
    } else {
        console.error('Failed to start server:', err);
    }
    process.exit(1);
});
