const express = require('express');
const router = express.Router();
const db = require('./db');
const jwt = require('./jwt'); 
const auth = require('./middleware');

router.post('/clubs/:id/invite', auth, (req, res) => {
  const clubId = req.params.id;
  const { email, role } = req.body; 

  if (!email) {
    return res.status(400).send('Email is required.');
  }

  const level = role || 'member';
  const token = jwt.sign({ group: clubId, email, level });

  const query = 'INSERT INTO invites (club_id, email, token, role) VALUES (?, ?, ?, ?)';
  db.run(query, [clubId, email, token, level], function(err) {
    if (err) {
      console.error(err);
      return res.status(500).send('Error creating invite.');
    }

    const inviteLink = `http://localhost:3001/accept-invite?token=${token}`;
    res.json({ inviteLink });
  });
});

router.get('/accept-invite', (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).send('Missing token.');
  }

  try {
    const { group, email, level } = jwt.verify(token);

    const query = 'INSERT INTO invites (club_id, email, role) VALUES (?, ?, ?)';
    db.run(query, [group, email, level], function(err) {
      if (err) return res.status(500).send('Error accepting invite.');

      res.json({
        message: 'Invite accepted.',
        clubId: group,
        role: level
      });
    });

  } catch (err) {
    console.error(err);
    return res.status(400).send('Invalid invite token.');
  }
});

module.exports = router;
