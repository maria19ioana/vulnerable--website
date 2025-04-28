const express = require('express');
const router = express.Router();
const db = require('./db'); 
const jwt = require('./jwt'); 
const auth = require('./middleware');
const bcrypt = require('bcrypt');

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

// Add a variable to track in-progress registrations
const pendingRegistrations = new Set();

router.post('/register', (req, res) => {
  const { username, email, password } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  // Check if a registration for this username is already in progress
  const registrationKey = `${username.toLowerCase()}`;
  if (pendingRegistrations.has(registrationKey)) {
    return res.status(409).json({ 
      success: false, 
      message: 'A registration for this username is already in progress. Please wait or try a different username.' 
    });
  }

  // Mark this registration as in progress
  pendingRegistrations.add(registrationKey);
  
  // Check if username already exists
  const userExistsQuery = "SELECT * FROM users WHERE username = ?";
  db.get(userExistsQuery, [username], (err, existingUser) => {
    if (err) {
      console.error('Error checking for existing user:', err);
      pendingRegistrations.delete(registrationKey);
      return res.status(500).json({ success: false, message: 'Server error during registration' });
    }
    
    if (existingUser) {
      pendingRegistrations.delete(registrationKey);
      return res.status(409).json({ success: false, message: 'Username already exists' });
    }
    
    // Hash the password
    const saltRounds = 10;
    bcrypt.hash(password, saltRounds, (hashErr, hashedPassword) => {
      if (hashErr) {
        console.error('Error hashing password:', hashErr);
        pendingRegistrations.delete(registrationKey);
        return res.status(500).json({ success: false, message: 'Error hashing password' });
      }
      
      // Insert new user with hashed password
      const insertQuery = "INSERT INTO users (username, email, password) VALUES (?, ?, ?)";
      db.run(insertQuery, [username, email, hashedPassword], function(insertErr) {
        // Registration complete, remove from pending set
        pendingRegistrations.delete(registrationKey);
        
        if (insertErr) {
          console.error('Error inserting new user:', insertErr);
          
          // Check if it's a uniqueness constraint error
          if (insertErr.code === 'SQLITE_CONSTRAINT') {
            return res.status(409).json({ 
              success: false, 
              message: 'Username already exists. Please choose another username.' 
            });
          }
          
          return res.status(500).json({ 
            success: false,
            message: 'Server error during registration' 
          });
        }
        
        // Generate a token for immediate login
        const token = jwt.sign({ 
          id: this.lastID, 
          username: username 
        });
        
        res.status(201).json({ 
          success: true,
          message: 'User registered successfully',
          userId: this.lastID,
          token: token
        });
      });
    });
  });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Missing username or password' });
  }

  const query = "SELECT * FROM users WHERE username = ?";
  db.get(query, [username], (err, user) => {
    if (err) {
      console.error('Error during login:', err);
      return res.status(500).json({ success: false, message: 'Server error during login' });
    }
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    // Compare submitted password with stored hash
    bcrypt.compare(password, user.password, (compareErr, match) => {
      if (compareErr) {
        console.error('Error comparing passwords:', compareErr);
        return res.status(500).json({ success: false, message: 'Error during authentication' });
      }
      
      if (!match) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
      
      // Generate JWT token
      const token = jwt.sign({ 
        id: user.id, 
        username: user.username 
      });
      
      res.json({ 
        success: true,
        token, 
        user: { 
          id: user.id, 
          username: user.username, 
          email: user.email 
        } 
      });
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

  // Get the user's email from the database
  const query = 'SELECT email FROM users WHERE id = ?';
  db.get(query, [req.user.id], (err, result) => {
    if (err) {
      console.error('Error fetching user email:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Error fetching user profile.' 
      });
    }
    
    if (result && result.email) {
      user.email = result.email;
    }
    
    res.json(user);
  });
});

// Update user's email
router.post('/update-email', auth, (req, res) => {
  const userId = req.user.id;
  const { email, password } = req.body;
  
  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Email is required.'
    });
  }
  
  if (!password) {
    return res.status(400).json({
      success: false,
      message: 'Password is required to verify identity.'
    });
  }
  
  // Get the user with their hashed password
  const query = 'SELECT * FROM users WHERE id = ?';
  db.get(query, [userId], (err, user) => {
    if (err) {
      console.error('Error fetching user:', err);
      return res.status(500).json({
        success: false,
        message: 'Error fetching user data.'
      });
    }
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }
    
    // Verify password using bcrypt compare
    bcrypt.compare(password, user.password, (compareErr, match) => {
      if (compareErr) {
        console.error('Error comparing passwords:', compareErr);
        return res.status(500).json({
          success: false,
          message: 'Error verifying password.'
        });
      }
      
      if (!match) {
        return res.status(401).json({
          success: false,
          message: 'Invalid password.'
        });
      }
      
      // Password verified, update the email
      const updateQuery = 'UPDATE users SET email = ? WHERE id = ?';
      db.run(updateQuery, [email, userId], function(updateErr) {
        if (updateErr) {
          console.error('Error updating email:', updateErr);
          return res.status(500).json({
            success: false,
            message: 'Error updating email.'
          });
        }
        
        return res.json({
          success: true,
          message: 'Email updated successfully.'
        });
      });
    });
  });
});

// Update user's password - NEW PASSWORD FIELD VULNERABLE TO SQL INJECTION FOR EDUCATIONAL PURPOSES
router.post('/update-password', auth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;
  
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Missing current or new password' });
  }
  
  // First get the user with a secure query
  const getUserQuery = "SELECT * FROM users WHERE id = ?";
  db.get(getUserQuery, [userId], (err, user) => {
    if (err) {
      console.error('Error fetching user:', err);
      return res.status(500).json({ message: 'Server error during password update' });
    }
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Verify current password
    bcrypt.compare(currentPassword, user.password, (compareErr, match) => {
      if (compareErr) {
        console.error('Error comparing passwords:', compareErr);
        return res.status(500).json({ message: 'Error verifying current password' });
      }
      
      if (!match) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }
      
      // VULNERABLE: Direct string concatenation of new password in SQL query
      // DO NOT DO THIS IN PRODUCTION CODE - For educational purposes only
      const updateQuery = "UPDATE users SET password = '" + newPassword + "' WHERE id = " + userId;
      
      console.log('[DEBUG] Executing update:', updateQuery); // Log for demonstration
      
      db.exec(updateQuery, function(updateErr) {
        if (updateErr) {
          console.error('Error updating password:', updateErr);
          return res.status(500).json({ message: 'Server error during password update' });
        }
        
        res.json({ message: 'Password updated successfully' });
      });
    });
  });
});

module.exports = router;
