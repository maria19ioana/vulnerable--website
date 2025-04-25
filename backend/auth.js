const express = require('express');
const router = express.Router();
const db = require('./db'); 
const jwt = require('./jwt'); 
const auth = require('./middleware');

router.get('/test-auth', (req, res) => {
  res.send('Auth route working!');
});

router.post('/register', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send('Username and password required.');
  }

  const query = 'INSERT INTO users (username, password, role) VALUES (?, ?, ?)';
  db.run(query, [username, password, 'user'], function(err) {
    if (err) {
      console.error(err);
      return res.status(500).send('Error creating user.');
    }

    res.send('User registered successfully!');
  });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send('Username and password required.');
  }

  const query = 'SELECT * FROM users WHERE username = ? AND password = ?';
  db.get(query, [username, password], (err, user) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error logging in.');
    }

    if (!user) {
      return res.status(401).send('Invalid credentials.');
    }

    const token = jwt.sign(user);
    res.json({ token });
  });
});

router.get('/profile', auth, (req, res) => {
  let user = {
    id: req.user.id,
    username: req.user.username,
    role: req.user.role || 'user'
  };

  if (req.query.user_role) {
    user.role = req.query.user_role; 
  }

  res.json(user);
});

module.exports = router;
