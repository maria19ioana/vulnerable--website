const { encrypt, decrypt } = require('./utils/encryption');
const express = require('express');
const router = express.Router();
const db = require('./db');
const auth = require('./middleware'); 

router.get('/dashboard', auth, (req, res) => {
  const userId = req.user.id;
  

  const query = 'SELECT * FROM clubs WHERE owner_id = ?';
  db.all(query, [userId], (err, clubs) => {
    if (err) {
      console.error('Error fetching clubs for dashboard:', err);
      return res.status(500).json({
        success: false,
        message: 'Error fetching clubs.',
        error: err.message
      });
    }
    
    const eventsQuery = 'SELECT COUNT(*) as eventCount, club_id FROM events GROUP BY club_id';
    db.all(eventsQuery, [], (eventsErr, eventCounts) => {
      if (eventsErr) {
        console.error('Error fetching event counts:', eventsErr);
        return res.json({
          success: true,
          clubs: clubs,
          eventCounts: [],
          totalEvents: 0
        });
      }
      
      const eventCountMap = {};
      let totalEvents = 0;
      
      eventCounts.forEach(count => {
        eventCountMap[count.club_id] = count.eventCount;
        totalEvents += count.eventCount;
      });
      
      clubs.forEach(club => {
        club.eventCount = eventCountMap[club.id] || 0;
      });
      
      res.json({
        success: true,
        clubs: clubs,
        eventCounts: eventCountMap,
        totalEvents: totalEvents
      });
    });
  });
});

router.get('/clubs/:club_id/events/view/:enc_event_id', auth, (req, res) => {
  try {
    const eventId = decrypt(req.params.enc_event_id);
    const query = 'SELECT * FROM events WHERE id = ?';
    db.get(query, [eventId], (err, event) => {
      if (err) return res.status(500).send('Error fetching event.');
      if (!event) return res.status(404).send('Event not found.');
      res.json(event);
    });
  } catch (e) {
    return res.status(400).send('Invalid encrypted ID.');
  }
});

router.post('/clubs', auth, (req, res) => {
  const { name, description, category } = req.body;
  
  if (!name) {
    return res.status(400).json({ success: false, message: 'Club name is required' });
  }
  
  const ownerId = req.user.id;
  const query = `INSERT INTO clubs (name, description, category, owner_id)
                 VALUES (?, ?, ?, ?)`;
                 
  db.run(query, [name, description, category, ownerId], function(err) {
  if (err) {
    console.error('Error creating club:', err);
    return res.status(500).json({ success: false, message: 'Error creating club' });
  }
  
  const clubId = this.lastID;
  
  const memberQuery = `INSERT INTO club_members (club_id, user_id, join_date, role) 
                       VALUES (?, ?, datetime('now'), 'owner')`;
  
  db.run(memberQuery, [clubId, ownerId], function(err) {
    if (err) {
      console.error('Error adding owner as club member:', err);
      return res.status(500).json({ success: false, message: 'Error adding owner as club member' });
    }
    
    res.status(201).json({
      success: true,
      message: 'Club created successfully',
      id: clubId
    });
  });
});
});

router.post('/events/:id/edit', auth, (req, res) => {
  const { title, description } = req.body;
  const eventId = req.params.id;

  if (!title || !description) {
    return res.status(400).send('Title and description required.');
  }

  const query = 'UPDATE events SET title = ?, description = ? WHERE id = ?';
  db.run(query, [title, description, eventId], function(err) {
    if (err) return res.status(500).send('Error editing event.');
    if (this.changes === 0) return res.status(404).send('Event not found.');
    res.send('Event edited successfully.');
  });
});

router.get('/clubs/:id', auth, (req, res) => {
  let clubId = req.params.id;

  try {
    const decoded = Buffer.from(clubId, 'base64').toString('utf-8');
    if (!isNaN(decoded)) {
      clubId = decoded; 
    }
  } catch (err) {
    console.error('Failed to decode Base64 club ID:', err);
  }

  const query = 'SELECT * FROM clubs WHERE id = ?';
  db.get(query, [clubId], (err, club) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error fetching club.');
    }

    if (!club) {
      return res.status(404).send('Club not found.');
    }

    res.json(club);
  });
});

router.get('/search', (req, res) => {
  const searchTerm = req.query.query;

  if (!searchTerm) {
    return res.status(400).send('Search query required.');
  }

  const safeQuery = 'SELECT * FROM clubs WHERE name LIKE ?';
  db.all(safeQuery, [`%${searchTerm}%`], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Database error.');
    }

    res.json(results);
  });
});

router.post('/clubs/:id/events/create', auth, (req, res) => {
  const clubId = req.params.id;
  const { title, description, private } = req.body;

  if (!title || !description) {
    return res.status(400).send('Title and description required.');
  }

  const query = 'INSERT INTO events (club_id, title, description, private) VALUES (?, ?, ?, ?)';
  db.run(query, [clubId, title, description, private ? 1 : 0], function(err) {
    if (err) {
      console.error(err);
      return res.status(500).send('Error creating event.');
    }

    res.send('Event created successfully.');
  });
});

router.post('/events/:id/delete', auth, (req, res) => {
  const eventId = req.params.id;

  const query = 'DELETE FROM events WHERE id = ?';
  db.run(query, [eventId], function(err) {
    if (err) {
      console.error(err);
      return res.status(500).send('Error deleting event.');
    }

    if (this.changes === 0) {
      return res.status(404).send('Event not found.');
    }

    res.send('Event deleted successfully.');
  });
});

router.get('/clubs/:club_id/events/:event_id', auth, (req, res) => {
  const eventId = req.params.event_id;

  const query = 'SELECT * FROM events WHERE id = ?';
  db.get(query, [eventId], (err, event) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error fetching event.');
    }

    if (!event) {
      return res.status(404).send('Event not found.');
    }

    res.json(event);
  });
});

router.get('/clubs', auth, (req, res) => {
  const userId = req.user.id;
  const query = 'SELECT id, name FROM clubs WHERE owner_id = ?';
  db.all(query, [userId], (err, clubs) => {
    if (err) {
      console.error('Error fetching clubs for dropdown:', err);
      return res.status(500).json({ success: false, message: 'Error fetching clubs.' });
    }
    res.json(clubs);
  });
});

router.get('/clubs/:id/events', auth, (req, res) => {
  const clubId = req.params.id;  
  const query = 'SELECT * FROM events WHERE club_id = ?';
  db.all(query, [clubId], (err, events) => {
    if (err) {
      console.error('Error fetching events for club:', err);
      return res.status(500).json({ success: false, message: 'Error fetching events.' });
    }
    res.json(events);
  });
});

router.get('/debug-auth', auth, (req, res) => {
  res.json({
    success: true,
    message: 'Your token is valid',
    user: req.user
  });
});

router.get('/clubs/:id/members', auth, (req, res) => {
  const clubId = req.params.id;  
  const query = `
    SELECT cm.*, u.username, u.role as user_role 
    FROM club_members cm
    JOIN users u ON cm.user_id = u.id
    WHERE cm.club_id = ?
  `;
  
  db.all(query, [clubId], (err, members) => {
    if (err) {
      console.error('Error fetching members for club:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Error fetching club members.' 
      });
    }
    
    res.json({
      success: true,
      members: members
    });
  });
});

router.get('/clubs/:id/membership', auth, (req, res) => {
  const clubId = req.params.id;
  const userId = req.user.id;
    
  const query = 'SELECT * FROM club_members WHERE club_id = ? AND user_id = ?';
  db.get(query, [clubId, userId], (err, membership) => {
    if (err) {
      console.error('Error checking club membership:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Error checking club membership.' 
      });
    }
    
    if (membership) {
      res.json({
        success: true,
        isMember: true,
        membership: membership
      });
    } else {
      res.json({
        success: true,
        isMember: false
      });
    }
  });
});

router.post('/clubs/:id/join', auth, (req, res) => {
  const clubId = req.params.id;
  const userId = req.user.id;
  
  console.log(`Join request for club ID: ${clubId} by user ID: ${userId}`);
  
  db.get('SELECT * FROM clubs WHERE id = ?', [clubId], (err, club) => {
    if (err) {
      console.error('Error checking club existence:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Error checking if club exists.' 
      });
    }
    
    if (!club) {
      return res.status(404).json({ 
        success: false, 
        message: 'Club not found.' 
      });
    }
    
    db.get('SELECT * FROM club_members WHERE club_id = ? AND user_id = ?', [clubId, userId], (err, existingMembership) => {
      if (err) {
        console.error('Error checking existing membership:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Error checking existing membership.' 
        });
      }
      
      if (existingMembership) {
        return res.status(400).json({ 
          success: false, 
          message: 'User is already a member of this club.' 
        });
      }
      
      const query = 'INSERT INTO club_members (club_id, user_id, join_date, role) VALUES (?, ?, datetime("now"), "member")';
      db.run(query, [clubId, userId], function(err) {
        if (err) {
          console.error('Error adding club membership:', err);
          return res.status(500).json({ 
            success: false, 
            message: 'Error adding club membership.' 
          });
        }
        
        console.log(`User ${userId} joined club ${clubId} successfully`);
        res.status(201).json({ 
          success: true, 
          message: 'Successfully joined the club.',
          membershipId: this.lastID
        });
      });
    });
  });
});

router.post('/clubs/:id/leave', auth, (req, res) => {
  const clubId = req.params.id;
  const userId = req.user.id;
  
  console.log(`Leave request for club ID: ${clubId} by user ID: ${userId}`);
  
  db.get('SELECT * FROM clubs WHERE id = ? AND owner_id = ?', [clubId, userId], (err, ownedClub) => {
    if (err) {
      console.error('Error checking club ownership:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Error checking club ownership.' 
      });
    }
    
    if (ownedClub) {
      return res.status(400).json({ 
        success: false, 
        message: 'Club owners cannot leave their own clubs. Transfer ownership first or delete the club.' 
      });
    }
    
    db.get('SELECT * FROM club_members WHERE club_id = ? AND user_id = ?', [clubId, userId], (err, membership) => {
      if (err) {
        console.error('Error checking membership:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Error checking membership.' 
        });
      }
      
      if (!membership) {
        return res.status(400).json({ 
          success: false, 
          message: 'User is not a member of this club.' 
        });
      }
      
      db.run('DELETE FROM club_members WHERE club_id = ? AND user_id = ?', [clubId, userId], function(err) {
        if (err) {
          console.error('Error removing club membership:', err);
          return res.status(500).json({ 
            success: false, 
            message: 'Error removing club membership.' 
          });
        }
        
        console.log(`User ${userId} left club ${clubId} successfully`);
        res.json({ 
          success: true, 
          message: 'Successfully left the club.' 
        });
      });
    });
  });
});

router.get('/all-events', auth, (req, res) => {
  console.log('All events endpoint called by user ID:', req.user.id);
  const query = 'SELECT * FROM events';
  db.all(query, [], (err, events) => {
    if (err) {
      console.error('Error fetching all events:', err);
      return res.status(500).json({
        success: false,
        message: 'Error fetching events'
      });
    }
    console.log(`Found ${events.length} events`);
    res.json(events);
  });
});

router.get('/events/:id', auth, (req, res) => {
  const eventId = req.params.id;
  console.log(`Event details request for event ID: ${eventId} by user ID: ${req.user.id}`);

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

router.put('/events/:id', auth, (req, res) => {
  const eventId = req.params.id;
  const { title, description } = req.body;
  console.log(`Update request for event ID: ${eventId} by user ID: ${req.user.id}`);

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

router.delete('/events/:id', auth, (req, res) => {
  const eventId = req.params.id;
  console.log(`Delete request for event ID: ${eventId} by user ID: ${req.user.id}`);

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

router.put('/clubs/:id', auth, (req, res) => {
  const clubId = req.params.id;
  const userId = req.user.id;
  const { name, description, category } = req.body;
  
  console.log(`Update request for club ID: ${clubId} by user ID: ${userId}`);
  
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
    
    if (club.owner_id !== userId && !req.user.isSuperUser) {
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

router.all('/clubs/:id/update', auth, (req, res) => {
  const clubId = req.params.id;
  const userId = req.user.id;
  
  if (req.method !== 'POST' && req.method !== 'PUT') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed. Use POST or PUT.'
    });
  }
  
  const { name, description, category } = req.body;
  
  console.log(`Alternative update route - Update request for club ID: ${clubId} by user ID: ${userId}`);
  
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
    
    if (club.owner_id !== userId && !req.user.isSuperUser) {
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

router.delete('/clubs/:id', auth, (req, res) => {
  const clubId = req.params.id;
  const userId = req.user.id;
  
  console.log(`Delete request for club ID: ${clubId} by user ID: ${userId}`);
  
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
    
    if (club.owner_id !== userId && !req.user.isSuperUser) {
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

router.post('/clubs/:id/delete', auth, (req, res) => {
  const clubId = req.params.id;
  const userId = req.user.id;
  
  console.log(`Alternative delete route - Delete request for club ID: ${clubId} by user ID: ${userId}`);
  
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
    
    if (club.owner_id !== userId && !req.user.isSuperUser) {
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

router.get('/user/memberships', auth, (req, res) => {
  const userId = req.user.id;
  
  console.log(`Getting all memberships for user ID: ${userId}`);
  
  const query = `
    SELECT cm.*, c.name as club_name 
    FROM club_members cm
    JOIN clubs c ON cm.club_id = c.id
    WHERE cm.user_id = ?
  `;
  
  db.all(query, [userId], (err, memberships) => {
    if (err) {
      console.error('Error fetching user memberships:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Error fetching user memberships.' 
      });
    }
    
    
    res.json({
      success: true,
      memberships: memberships
    });
  });
});

module.exports = router;