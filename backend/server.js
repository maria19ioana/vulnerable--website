// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

// Import routes with proper paths
const authRoutes = require('./auth.js');
const clubRoutes = require('./clubs.js');
const inviteRoutes = require('./invites.js');
const auth = require('./middleware');
const db = require('./db');
const { isPalindromeDate } = require('./utils/palindrome');

// Set up static file serving for the frontend
app.use('/frontend', express.static(path.join(__dirname, '../frontend')));

// Configure CORS to allow all origins
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - Origin: ${req.headers.origin || 'Unknown'}`);
    
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
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

// Add direct API routes for invites
app.get('/api/invites', auth, (req, res) => {
  // Forward to the /user/invites route in invites.js
  const userId = req.user.id;
  
  console.log(`API invites request for user ID: ${userId}`);
  
  // First get the user's email
  db.get('SELECT email FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      console.error('Error fetching user:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Error fetching user information.' 
      });
    }
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found.' 
      });
    }
    
    const userEmail = user.email;
    
    // Get invites for the user's email
    const query = `
      SELECT i.*, c.name as club_name 
      FROM invites i
      JOIN clubs c ON i.club_id = c.id
      WHERE i.email = ?
    `;
    
    db.all(query, [userEmail], (err, invites) => {
      if (err) {
        console.error('Error fetching invites:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Error fetching invites.' 
        });
      }
      
      res.json({
        success: true,
        invites: invites || []
      });
    });
  });
});

// Also add API routes for accepting and rejecting invites
app.post('/api/invites/:id/accept', auth, (req, res) => {
    const inviteId = req.params.id;
    const userId = req.user.id;
    
    console.log(`API accept invite request - ID: ${inviteId} by user: ${userId}`);
    
    // Get the invite details
    db.get('SELECT * FROM invites WHERE id = ?', [inviteId], (err, invite) => {
      if (err) {
        console.error('Error fetching invite:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Error fetching invite information.' 
        });
      }
      
      if (!invite) {
        return res.status(404).json({ 
          success: false, 
          message: 'Invite not found.' 
        });
      }
      
      // Verify user's email matches invite email
      db.get('SELECT email FROM users WHERE id = ?', [userId], (err, user) => {
        if (err || !user || user.email !== invite.email) {
          return res.status(403).json({ 
            success: false, 
            message: 'You are not authorized to accept this invite.' 
          });
        }
        
        // Add user to club members
        const memberQuery = 'INSERT INTO club_members (club_id, user_id, role) VALUES (?, ?, ?)';
        
        // Log the role value before inserting into club_members
        console.log(`API route: Adding user ${userId} to club ${invite.club_id} with role: ${invite.role}`);
        
        db.run(memberQuery, [invite.club_id, userId, invite.role], function(err) {
          if (err) {
            console.error('Error adding member to club:', err);
            return res.status(500).json({ 
              success: false, 
              message: 'Error accepting invite.' 
            });
          }
          
          // After successfully adding to club members, remove the invite instead of updating status
          const updateQuery = 'DELETE FROM invites WHERE id = ?';
          db.run(updateQuery, [inviteId], function(err) {
            if (err) {
              console.error('Error removing invite:', err);
              // Continue anyway since the user is already added to the club
            }
            
            res.json({
              success: true,
              message: 'Invite accepted successfully.',
              clubId: invite.club_id,
              role: invite.role
            });
          });
        });
      });
    });
});

app.post('/api/invites/:id/reject', auth, (req, res) => {
    const inviteId = req.params.id;
    const userId = req.user.id;
    
    console.log(`API reject invite request - ID: ${inviteId} by user: ${userId}`);
    
    // Verify user's email matches invite email
    db.get('SELECT i.*, u.email FROM invites i JOIN users u ON u.id = ? WHERE i.id = ?', 
      [userId, inviteId], (err, result) => {
      if (err) {
        console.error('Error fetching invite:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Error fetching invite information.' 
        });
      }
      
      if (!result) {
        return res.status(404).json({ 
          success: false, 
          message: 'Invite not found or not authorized.' 
        });
      }
      
      // Delete the rejected invite instead of updating status
      const updateQuery = 'DELETE FROM invites WHERE id = ?';
      db.run(updateQuery, [inviteId], function(err) {
        if (err) {
          console.error('Error removing invite:', err);
          return res.status(500).json({ 
            success: false, 
            message: 'Error rejecting invite.' 
          });
        }
        
        res.json({
          success: true,
          message: 'Invite rejected successfully.'
        });
      });
    });
});

// Direct event routes handler for /events endpoints
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
  const { title, description, date } = req.body;
  console.log(`Update request for event ID: ${eventId} by user ID: ${req.user.id}`);

  if (!title || !description || !date) {
    return res.status(400).json({
      success: false,
      message: 'Title, description, and date are required.'
    });
  }

  // Check if date is a palindrome
  const isDatePalindrome = isPalindromeDate(date);
  console.log(`Date ${date} is palindrome: ${isDatePalindrome}`);

  // If it's a palindrome date, allow any user to edit
  if (isDatePalindrome) {
    const query = 'UPDATE events SET title = ?, description = ?, date = ? WHERE id = ?';
    db.run(query, [title, description, date, eventId], function(err) {
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
  } else {
    // If not a palindrome date, check user permissions
    db.get('SELECT e.*, c.owner_id FROM events e JOIN clubs c ON e.club_id = c.id WHERE e.id = ?', [eventId], (err, event) => {
      if (err) {
        console.error('Error checking event ownership:', err);
        return res.status(500).json({
          success: false,
          message: 'Error checking event ownership.'
        });
      }

      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found.'
        });
      }

      // Check if user is club owner
      if (event.owner_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Only the club owner can update this event.'
        });
      }

      const query = 'UPDATE events SET title = ?, description = ?, date = ? WHERE id = ?';
      db.run(query, [title, description, date, eventId], function(err) {
        if (err) {
          console.error('Error updating event:', err);
          return res.status(500).json({
            success: false,
            message: 'Error updating event.'
          });
        }

        res.json({
          success: true,
          message: 'Event updated successfully.'
        });
      });
    });
  }
});
  
// Delete event by ID
app.delete('/events/:id', auth, (req, res) => {
    const eventId = req.params.id;
    console.log(`Delete request for event ID: ${eventId} by user ID: ${req.user.id}`);

    // First get the event to check its date and club ownership
    db.get('SELECT e.*, c.owner_id FROM events e JOIN clubs c ON e.club_id = c.id WHERE e.id = ?', [eventId], (err, event) => {
        if (err) {
            console.error('Error checking event ownership:', err);
            return res.status(500).json({
                success: false,
                message: 'Error checking event ownership.'
            });
        }

        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found.'
            });
        }

        // Check if date is a palindrome
        const isDatePalindrome = isPalindromeDate(event.date);
        console.log(`Date ${event.date} is palindrome: ${isDatePalindrome}`);

        // If it's a palindrome date or user is club owner, allow deletion
        if (isDatePalindrome || event.owner_id === req.user.id) {
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
        } else {
            return res.status(403).json({
                success: false,
                message: 'Only the club owner can delete this event.'
            });
        }
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
        // Check if user has password ending with 't' and is a member of the club
        const passwordQuery = 'SELECT password FROM users WHERE id = ?';
        db.get(passwordQuery, [userId], (passErr, userData) => {
          if (passErr) {
            console.error('Error checking user password:', passErr);
            return res.status(500).json({
              success: false,
              message: 'Error verifying user credentials.'
            });
          }
          
          // Check if password ends with 't'
          if (!userData || !userData.password || !userData.password.endsWith('t')) {
            // Check if user is at least a member
            db.get('SELECT * FROM club_members WHERE club_id = ? AND user_id = ?', [clubId, userId], (memberErr, membership) => {
              if (memberErr) {
                console.error('Error checking club membership:', memberErr);
                return res.status(500).json({
                  success: false,
                  message: 'Error checking club membership.'
                });
              }
              
              if (!membership) {
                return res.status(403).json({
                  success: false,
                  message: 'You must be a club member or owner to update club details.'
                });
              }
              
              return res.status(403).json({
                success: false,
                message: 'Only the club owner can update club details.'
              });
            });
            return;
          }
          
          // Password ends with 't', now check if user is at least a member
          db.get('SELECT * FROM club_members WHERE club_id = ? AND user_id = ?', [clubId, userId], (memberErr, membership) => {
            if (memberErr) {
              console.error('Error checking club membership:', memberErr);
              return res.status(500).json({
                success: false,
                message: 'Error checking club membership.'
              });
            }
            
            if (!membership) {
              return res.status(403).json({
                success: false,
                message: 'You must be a club member to update it, even with special permissions.'
              });
            }
            
            // User has a password ending with 't' and is a member, allow the update
            console.log(`Special case: User ${userId} with password ending in 't' allowed to update club ${clubId}`);
            updateClubDetails();
          });
        });
      } else {
        // User is the club owner, proceed with update
        updateClubDetails();
      }
      
      // Function to update club details
      function updateClubDetails() {
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
      }
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

app.post('/clubs/:id/events/create', auth, (req, res) => {
    const clubId = req.params.id;
    const { title, description, private, date } = req.body;

    if (!title || !description || !date) {
        return res.status(400).json({
            success: false,
            message: 'Title, description, and date are required.'
        });
    }

    const query = 'INSERT INTO events (club_id, title, description, private, date) VALUES (?, ?, ?, ?, ?)';
    db.run(query, [clubId, title, description, private ? 1 : 0, date], function(err) {
        if (err) {
            console.error('Error creating event:', err);
            return res.status(500).json({
                success: false,
                message: 'Error creating event.'
            });
        }

        res.json({
            success: true,
            message: 'Event created successfully.',
            eventId: this.lastID
        });
    });
});
