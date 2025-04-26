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

// Direct event routes handler for /events endpoints
const auth = require('./middleware');
const db = require('./db');

// Get event by ID
app.get('/events/:id', auth, (req, res) => {
    const eventId = req.params.id;
    console.log(`Event details request for event ID: ${eventId}`);
  
    const query = 'SELECT * FROM events WHERE id = ?';
    db.get(query, [eventId], (err, event) => {
      if (err) {
        console.error('Error fetching event details:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Error fetching event details.' 
        });
      }
  
      if (!event) {
        return res.status(404).json({ 
          success: false, 
          message: 'Event not found.' 
        });
      }
  
      res.json(event);
    });
});
  
// Update event by ID
app.put('/events/:id', auth, (req, res) => {
    const eventId = req.params.id;
    const { title, description } = req.body;
    console.log(`Update request for event ID: ${eventId}`);
  
    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Title and description are required.'
      });
    }
  
    const query = 'UPDATE events SET title = ?, description = ? WHERE id = ?';
    db.run(query, [title, description, eventId], function(err) {
      if (err) {
        console.error('Error updating event:', err);
        return res.status(500).json({
          success: false,
          message: 'Error updating event.'
        });
      }
  
      if (this.changes === 0) {
        return res.status(404).json({
          success: false,
          message: 'Event not found or no changes made.'
        });
      }
  
      res.json({
        success: true,
        message: 'Event updated successfully.'
      });
    });
});
  
// Delete event by ID
app.delete('/events/:id', auth, (req, res) => {
    const eventId = req.params.id;
    console.log(`Delete request for event ID: ${eventId}`);
  
    const query = 'DELETE FROM events WHERE id = ?';
    db.run(query, [eventId], function(err) {
      if (err) {
        console.error('Error deleting event:', err);
        return res.status(500).json({
          success: false,
          message: 'Error deleting event.'
        });
      }
  
      if (this.changes === 0) {
        return res.status(404).json({
          success: false,
          message: 'Event not found.'
        });
      }
  
      res.json({
        success: true,
        message: 'Event deleted successfully.'
      });
    });
});

// Define direct clubs routes to ensure proper handling of PUT/DELETE
// Update club by ID
app.put('/clubs/:id', auth, (req, res) => {
    const clubId = req.params.id;
    const userId = req.user.id;
    const { name, description, category } = req.body;
    
    console.log(`Direct PUT route - Update request for club ID: ${clubId} by user ID: ${userId}`);
    
    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Club name is required.'
      });
    }
    
    // Check if user is the owner of the club
    db.get('SELECT * FROM clubs WHERE id = ?', [clubId], (err, club) => {
      if (err) {
        console.error('Error checking club ownership:', err);
        return res.status(500).json({
          success: false,
          message: 'Error checking club ownership.'
        });
      }
      
      if (!club) {
        return res.status(404).json({
          success: false,
          message: 'Club not found.'
        });
      }
      
      if (club.owner_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Only the club owner can update club details.'
        });
      }
      
      // Update club details
      const query = 'UPDATE clubs SET name = ?, description = ?, category = ? WHERE id = ?';
      db.run(query, [name, description, category, clubId], function(err) {
        if (err) {
          console.error('Error updating club:', err);
          return res.status(500).json({
            success: false,
            message: 'Error updating club.'
          });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({
            success: false,
            message: 'Club not found or no changes made.'
          });
        }
        
        res.json({
          success: true,
          message: 'Club updated successfully.'
        });
      });
    });
});

// Delete club by ID
app.delete('/clubs/:id', auth, (req, res) => {
    const clubId = req.params.id;
    const userId = req.user.id;
    
    console.log(`Direct DELETE route - Delete request for club ID: ${clubId} by user ID: ${userId}`);
    
    // Check if user is the owner of the club
    db.get('SELECT * FROM clubs WHERE id = ?', [clubId], (err, club) => {
      if (err) {
        console.error('Error checking club ownership:', err);
        return res.status(500).json({
          success: false,
          message: 'Error checking club ownership.'
        });
      }
      
      if (!club) {
        return res.status(404).json({
          success: false,
          message: 'Club not found.'
        });
      }
      
      if (club.owner_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Only the club owner can delete this club.'
        });
      }
      
      // Delete club
      db.run('DELETE FROM clubs WHERE id = ?', [clubId], function(err) {
        if (err) {
          console.error('Error deleting club:', err);
          return res.status(500).json({
            success: false,
            message: 'Error deleting club.'
          });
        }
        
        // Delete all related club members
        db.run('DELETE FROM club_members WHERE club_id = ?', [clubId], function(err) {
          if (err) {
            console.error('Error deleting club members:', err);
            // Continue with success response even if member deletion fails
          }
          
          // Delete all related events
          db.run('DELETE FROM events WHERE club_id = ?', [clubId], function(err) {
            if (err) {
              console.error('Error deleting club events:', err);
              // Continue with success response even if event deletion fails
            }
            
            res.json({
              success: true,
              message: 'Club deleted successfully.'
            });
          });
        });
      });
    });
});

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
