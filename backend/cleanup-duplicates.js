const db = require('./db');

// Script to remove duplicate users
console.log('Starting duplicate user cleanup...');

// First, identify duplicates by username
db.all(`SELECT username, COUNT(*) as count 
        FROM users 
        GROUP BY username 
        HAVING count > 1`, [], (err, duplicates) => {
  
  if (err) {
    console.error('Error finding duplicates:', err);
    process.exit(1);
  }
  
  console.log(`Found ${duplicates.length} usernames with duplicates`);
  
  if (duplicates.length === 0) {
    console.log('No duplicates to clean up.');
    process.exit(0);
  }
  
  // For each duplicate username, keep only the record with the lowest ID
  const cleanupPromises = duplicates.map(dup => {
    return new Promise((resolve, reject) => {
      console.log(`Cleaning up duplicates for username: ${dup.username}`);
      
      // Get all records for this username
      db.all(`SELECT id FROM users WHERE username = ? ORDER BY id`, [dup.username], (err, users) => {
        if (err) {
          console.error(`Error fetching users with username ${dup.username}:`, err);
          return reject(err);
        }
        
        // Keep the first one (lowest ID), delete the rest
        const keepId = users[0].id;
        const deleteIds = users.slice(1).map(u => u.id);
        
        console.log(`Keeping user ID ${keepId}, deleting IDs: ${deleteIds.join(', ')}`);
        
        // Delete duplicates
        if (deleteIds.length > 0) {
          const placeholders = deleteIds.map(() => '?').join(',');
          db.run(`DELETE FROM users WHERE id IN (${placeholders})`, deleteIds, function(err) {
            if (err) {
              console.error(`Error deleting duplicate users:`, err);
              return reject(err);
            }
            
            console.log(`Deleted ${this.changes} duplicate records for username ${dup.username}`);
            resolve();
          });
        } else {
          resolve();
        }
      });
    });
  });
  
  // Run all cleanups
  Promise.all(cleanupPromises)
    .then(() => {
      console.log('Duplicate cleanup completed successfully!');
      process.exit(0);
    })
    .catch(err => {
      console.error('Error during cleanup:', err);
      process.exit(1);
    });
}); 