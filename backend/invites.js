const express = require('express');
const router = express.Router();
const db = require('./db');
const jwt = require('./jwt'); 
const auth = require('./middleware');
const { sendInviteEmail } = require('./utils/email');

router.post('/clubs/:id/invite', auth, (req, res) => {
  const clubId = req.params.id;
  const { email, role } = req.body; 

  if (!email) {
    return res.status(400).send('Email is required.');
  }

  db.get('SELECT name FROM clubs WHERE id = ?', [clubId], async (err, club) => {
    if (err || !club) {
      console.error('Error fetching club:', err);
      return res.status(404).json({
        success: false,
        message: 'Club not found or error occurred.'
      });
    }

    const level = role || 'member';
    const token = jwt.signInvite({ 
      group: clubId, 
      email, 
      level, 
      clubName: club.name 
    });

    const query = 'INSERT INTO invites (club_id, email, token, role) VALUES (?, ?, ?, ?)';
    db.run(query, [clubId, email, token, level], async function(err) {
      if (err) {
        console.error(err);
        return res.status(500).send('Error creating invite.');
      }

      const inviteId = this.lastID;
      const inviteLink = `http://localhost:3000/accept-invite?token=${token}`;
      
      try {
        await sendInviteEmail({
          email,
          clubName: club.name,
          inviteLink,
          role: level
        });
        
        console.log(`Invitation email sent to ${email} for club ${club.name}`);
        
        res.json({ 
          success: true, 
          message: 'Invite created and email sent successfully',
          inviteId,
          inviteLink 
        });
      } catch (emailErr) {
        console.error('Error sending invitation email:', emailErr);
        
        // Still return success since the invite was created in the database
        res.json({ 
          success: true, 
          message: 'Invite created but email could not be sent. Provide this link manually:',
          inviteId,
          inviteLink 
        });
      }
    });
  });
});

// New endpoint to get invites for the authenticated user
router.get('/user/invites', auth, (req, res) => {
  const userId = req.user.id;
  
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

// New endpoint to accept an invite
router.post('/invites/:id/accept', auth, (req, res) => {
  const inviteId = req.params.id;
  const userId = req.user.id;
  
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
      console.log(`Adding user ${userId} to club ${invite.club_id} with role: ${invite.role}`);
      
      db.run(memberQuery, [invite.club_id, userId, invite.role], function(err) {
        if (err) {
          console.error('Error adding member to club:', err);
          return res.status(500).json({ 
            success: false, 
            message: 'Error accepting invite.' 
          });
        }
        
        // Update invite status to accepted
        const updateQuery = 'DELETE FROM invites WHERE id = ?';
        db.run(updateQuery, [inviteId], function(err) {
          if (err) {
            console.error('Error deleting invite:', err);
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

// New endpoint to reject an invite
router.post('/invites/:id/reject', auth, (req, res) => {
  const inviteId = req.params.id;
  const userId = req.user.id;
  
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
    
    // Update invite status to rejected
    const updateQuery = 'DELETE FROM invites WHERE id = ?';
    db.run(updateQuery, [inviteId], function(err) {
      if (err) {
        console.error('Error deleting invite:', err);
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

// Updated route to handle email invite acceptance
router.get('/accept-invite', (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).send('Missing token.');
  }

  try {
    // SECURITY VULNERABILITY: Using jwt.decode instead of jwt.verify
    // This will not verify the signature, allowing for token forgery
    const decoded = jwt.decode(token);
    
    if (!decoded) {
      // For API requests, return JSON error
      if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.status(400).json({
          success: false,
          message: 'Invalid invite token format.'
        });
      }
      
      // For browser requests, redirect to an error page
      return res.redirect('/frontend/accept-invite.html?error=invalid-token');
    }
    
    const { group, email, level, clubName } = decoded;
    
    // Trust the contents blindly (for testing Invite Abuse)
    console.log("Processing invite token without verification:", decoded);
    
    // Check if the token is for an invite that already exists
    db.get('SELECT * FROM invites WHERE token = ?', [token], (err, existingInvite) => {
      if (err) {
        console.error('Error checking existing invite:', err);
        return res.status(500).json({
          success: false,
          message: 'Error checking invite status.'
        });
      }
      
      // If invite already exists, redirect to the accept page
      if (existingInvite) {
        console.log('Existing invite found, redirecting to accept page');
        
        // For API requests, return JSON
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
          return res.json({
            success: true,
            message: 'Please log in to accept this invite',
            inviteId: existingInvite.id,
            clubId: existingInvite.club_id,
            email: email,
            role: existingInvite.role,
            clubName: clubName
          });
        }
        
        // For browser requests, redirect to the acceptance page
        return res.redirect(`/frontend/accept-invite.html?token=${token}`);
      }
      
      // If invite doesn't exist yet, create it
      console.log('Creating new invite from token');
      const query = 'INSERT INTO invites (club_id, email, token, role) VALUES (?, ?, ?, ?)';
      
      // Log the role value to troubleshoot
      console.log(`Creating invite with role: ${level}`);
      
      db.run(query, [group, email, token, level], function(err) {
        if (err) {
          console.error('Error creating invite from token:', err);
          return res.status(500).json({
            success: false,
            message: 'Error creating invite from token.'
          });
        }

        const inviteId = this.lastID;
        
        // For API requests, return JSON
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
          return res.json({
            success: true,
            message: 'Invite created. Please log in to accept.',
            inviteId: inviteId,
            clubId: group,
            email: email,
            role: level,
            clubName: clubName
          });
        }
        
        // For browser requests, redirect to the acceptance page
        res.redirect(`/frontend/accept-invite.html?token=${token}`);
      });
    });
  } catch (err) {
    console.error('Error processing invite token:', err);
    
    // For API requests, return JSON error
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(400).json({
        success: false,
        message: 'Error processing invite token.'
      });
    }
    
    // For browser requests, redirect to an error page or show an error message
    res.redirect('/frontend/accept-invite.html?error=invalid-token');
  }
});

module.exports = router;
