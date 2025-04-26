const express = require('express');
const router = express.Router();
const db = require('./db'); 
const jwt = require('./jwt'); 
const auth = require('./middleware');

router.get('/test-auth', (req, res) => {
  res.send('Auth route working!');
});

// Test login endpoint for debugging
router.post('/test-login', (req, res) => {
  console.log('Test login received:', req.body);
  // Create a dummy test user and sign a valid JWT
  const testUser = { id: 1, username: 'testuser', role: 'user' };
  const token = jwt.sign(testUser);
  console.log('Generated test token for test-login:', token);
  res.json({
    success: true,
    message: 'Test login successful',
    token: token
  });
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
  console.log('Login request received:', req.body);
  
  const { username, password } = req.body;

  if (!username || !password) {
    console.log('Login failed: Missing username or password');
    return res.status(400).json({ 
      success: false,
      message: 'Username and password required.' 
    });
  }

  const query = 'SELECT * FROM users WHERE username = ? AND password = ?';
  db.get(query, [username, password], (err, user) => {
    if (err) {
      console.error('Database error during login:', err);
      return res.status(500).json({
        success: false,
        message: 'Error logging in. Database error.'
      });
    }

    if (!user) {
      console.log('Login failed: Invalid credentials for user', username);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.'
      });
    }

    console.log('Login successful for user:', username);
    const token = jwt.sign(user);
    res.json({ 
      success: true,
      token,
      username: user.username,
      role: user.role
    });
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
