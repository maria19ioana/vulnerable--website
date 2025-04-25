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
      console.error(err);
      return res.status(500).send('Error fetching clubs.');
    }

    res.json(clubs);
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

router.post('/clubs/create', auth, (req, res) => {
  const { name } = req.body;
  const userId = req.user.id;

  if (!name) {
    return res.status(400).send('Club name required.');
  }

  const query = 'INSERT INTO clubs (name, owner_id) VALUES (?, ?)';
  db.run(query, [name, userId], function(err) {
    if (err) {
      console.error(err);
      return res.status(500).send('Error creating club.');
    }

    res.send('Club created successfully.');
  });
});

router.post('/events/:id/edit', auth, (req, res) => {
  const { title, description } = req.body;
  const eventId = req.params.id;

  if (!title || !description) {
    return res.status(400).send('Title and description required.');
  }

  // No check if the user owns the event — vulnerable by design
  const query = 'UPDATE events SET title = ?, description = ? WHERE id = ?';
  db.run(query, [title, description, eventId], function(err) {
    if (err) return res.status(500).send('Error editing event.');
    if (this.changes === 0) return res.status(404).send('Event not found.');
    res.send('Event edited successfully.');
  });
});

router.get('/clubs/:id', auth, (req, res) => {
  const clubId = req.params.id;

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

  const rawQuery = `SELECT * FROM clubs WHERE name LIKE '%${searchTerm}%'`; 
  db.all(rawQuery, [], (err, results) => {
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

module.exports = router;
