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

router.get('/user/invites', auth, (req, res) => {
  const userId = req.user.id;
  
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

router.post('/invites/:id/accept', auth, (req, res) => {
  const inviteId = req.params.id;
  const userId = req.user.id;
  
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
      
      console.log(`Adding user ${userId} to club ${invite.club_id} with role: ${invite.role}`);
      
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
            console.error('Error deleting invite:', err);
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

router.post('/invites/:id/reject', auth, (req, res) => {
  const inviteId = req.params.id;
  const userId = req.user.id;
  
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

router.get('/accept-invite', (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).send('Missing token.');
  }

  try {
    const decoded = jwt.decode(token);
    
    if (!decoded) {
      if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.status(400).json({
          success: false,
          message: 'Invalid invite token format.'
        });
      }
      
      return res.redirect('/frontend/accept-invite.html?error=invalid-token');
    }
    
    const { group, email, level, clubName } = decoded;
    
    console.log("Processing invite token without verification:", decoded);
    
    db.get('SELECT * FROM invites WHERE token = ?', [token], (err, existingInvite) => {
      if (err) {
        console.error('Error checking existing invite:', err);
        return res.status(500).json({
          success: false,
          message: 'Error checking invite status.'
        });
      }
      
      if (existingInvite) {
        console.log('Existing invite found, redirecting to accept page');
        
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
        
        return res.redirect(`/frontend/accept-invite.html?token=${token}`);
      }
      
      console.log('Creating new invite from token');
      const query = 'INSERT INTO invites (club_id, email, token, role) VALUES (?, ?, ?, ?)';
      
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
        
        res.redirect(`/frontend/accept-invite.html?token=${token}`);
      });
    });
  } catch (err) {
    console.error('Error processing invite token:', err);
    
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(400).json({
        success: false,
        message: 'Error processing invite token.'
      });
    }
    
    res.redirect('/frontend/accept-invite.html?error=invalid-token');
  }
});

module.exports = router;
