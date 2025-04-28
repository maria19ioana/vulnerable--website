require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

const authRoutes = require('./auth.js');
const clubRoutes = require('./clubs.js');
const inviteRoutes = require('./invites.js');
const auth = require('./middleware');
const db = require('./db');

app.use('/frontend', express.static(path.join(__dirname, '../frontend')));

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

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

app.use('/', authRoutes);
app.use('/', clubRoutes);
app.use('/', inviteRoutes);

app.get('/api/invites', auth, (req, res) => {
  const userId = req.user.id;
  
  console.log(`API invites request for user ID: ${userId}`);
  
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

app.post('/api/invites/:id/accept', auth, (req, res) => {
    const inviteId = req.params.id;
    const userId = req.user.id;
    
    console.log(`API accept invite request - ID: ${inviteId} by user: ${userId}`);
    
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
      
      db.get('SELECT email FROM users WHERE id = ?', [userId], (err, user) => {
        if (err || !user || user.email !== invite.email) {
          return res.status(403).json({ 
            success: false, 
            message: 'You are not authorized to accept this invite.' 
          });
        }
        
        const memberQuery = 'INSERT INTO club_members (club_id, user_id, role) VALUES (?, ?, ?)';
        
        console.log(`API route: Adding user ${userId} to club ${invite.club_id} with role: ${invite.role}`);
        
        db.run(memberQuery, [invite.club_id, userId, invite.role], function(err) {
          if (err) {
            console.error('Error adding member to club:', err);
            return res.status(500).json({ 
              success: false, 
              message: 'Error accepting invite.' 
            });
          }
          
          const updateQuery = 'DELETE FROM invites WHERE id = ?';
          db.run(updateQuery, [inviteId], function(err) {
            if (err) {
              console.error('Error removing invite:', err);
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

app.put('/clubs/:id', auth, (req, res) => {
    const clubId = req.params.id;
    const userId = req.user.id;
    const { name, description, category } = req.body;
    
    console.log(`Direct PUT route - Update request for club ID: ${clubId} by user ID: ${userId}`);
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Club name is required.'
      });
    }
    
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

app.delete('/clubs/:id', auth, (req, res) => {
    const clubId = req.params.id;
    const userId = req.user.id;
    
    console.log(`Direct DELETE route - Delete request for club ID: ${clubId} by user ID: ${userId}`);
    
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
      
      db.run('DELETE FROM clubs WHERE id = ?', [clubId], function(err) {
        if (err) {
          console.error('Error deleting club:', err);
          return res.status(500).json({
            success: false,
            message: 'Error deleting club.'
          });
        }
        
        db.run('DELETE FROM club_members WHERE club_id = ?', [clubId], function(err) {
          if (err) {
            console.error('Error deleting club members:', err);
          }
          
          db.run('DELETE FROM events WHERE club_id = ?', [clubId], function(err) {
            if (err) {
              console.error('Error deleting club events:', err);
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

app.get('/test', (req, res) => {
    res.send('Server is running!');
});

app.get('/cors-test', (req, res) => {
    res.json({ 
        success: true, 
        message: 'CORS is working!',
        origin: req.headers.origin || 'Unknown'
    });
});

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
