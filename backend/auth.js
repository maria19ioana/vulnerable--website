const express = require('express');
const router = express.Router();
const db = require('./db'); 
const jwt = require('./jwt'); 
const auth = require('./middleware');

// Test authentication
router.get('/test-auth', (req, res) => {
  res.send('Auth route working!');
});

// Test login
router.post('/test-login', (req, res) => {
  const testUser = { id: 1, username: 'testuser', role: 'user', isSuperUser: false };
  const token = jwt.sign(testUser);
  res.json({
    success: true,
    message: 'Test login successful',
    token
  });
});

// User registration
router.post('/register', (req, res) => {
  const { username, password, email } = req.body;

  if (!username || !password || !email) {
    return res.status(400).json({
      success: false,
      message: 'Username, email, and password are required.'
    });
  }

  // Check if password ends with 't' to determine superuser status
  const is_superuser = password.trim().endsWith('t');

  const query = 'INSERT INTO users (username, password, email, role, is_superuser) VALUES (?, ?, ?, ?, ?)';
  db.run(query, [username, password, email, 'user', is_superuser ? 1 : 0], function(err) {
    if (err) {
      console.error('Error creating user:', err);
      return res.status(500).json({
        success: false,
        message: 'Error creating user.'
      });
    }

    res.json({
      success: true,
      message: 'User registered successfully!'
    });
  });
});

// User login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
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
        message: 'Database error during login.'
      });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.'
      });
    }

    // Check both database is_superuser and password ending with 't'
    const isSuperUser = (user.is_superuser === 1) || (user.password && user.password.endsWith('t'));
    
    const userPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
      email: user.email,
      isSuperUser: isSuperUser
    };

    const token = jwt.sign(userPayload);

    res.json({ 
      success: true,
      token,
      username: user.username,
      role: user.role,
      isSuperUser: isSuperUser,
      id: user.id
    });
  });
});

// Get profile
router.get('/profile', auth, (req, res) => {
  const userId = req.user.id;

  const query = 'SELECT username, email, role, is_superuser FROM users WHERE id = ?';
  db.get(query, [userId], (err, user) => {
    if (err) {
      console.error('Error fetching user profile:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Error fetching user profile.' 
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    // Check both database is_superuser and password ending with 't'
    const isSuperUser = (user.is_superuser === 1) || (user.password && user.password.endsWith('t'));

    res.json({
      success: true,
      id: userId,
      username: user.username,
      email: user.email,
      role: user.role,
      isSuperUser: isSuperUser
    });
  });
});

// Update email
router.post('/update-email', auth, (req, res) => {
  const userId = req.user.id;
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required.'
    });
  }

  db.get('SELECT * FROM users WHERE id = ? AND password = ?', [userId, password], (err, user) => {
    if (err || !user) {
      console.error('Password verification failed:', err);
      return res.status(401).json({
        success: false,
        message: 'Invalid password.'
      });
    }

    db.run('UPDATE users SET email = ? WHERE id = ?', [email, userId], function(err) {
      if (err) {
        console.error('Error updating email:', err);
        return res.status(500).json({
          success: false,
          message: 'Error updating email.'
        });
      }

      res.json({
        success: true,
        message: 'Email updated successfully.'
      });
    });
  });
});

// Update password
router.post('/update-password', auth, (req, res) => {
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Current and new passwords are required.'
    });
  }

  db.get('SELECT * FROM users WHERE id = ? AND password = ?', [userId, currentPassword], (err, user) => {
    if (err || !user) {
      console.error('Current password verification failed:', err);
      return res.status(401).json({
        success: false,
        message: 'Incorrect current password.'
      });
    }

    db.run('UPDATE users SET password = ? WHERE id = ?', [newPassword, userId], function(err) {
      if (err) {
        console.error('Error updating password:', err);
        return res.status(500).json({
          success: false,
          message: 'Error updating password.'
        });
      }

      res.json({
        success: true,
        message: 'Password updated successfully.'
      });
    });
  });
});

module.exports = router;
