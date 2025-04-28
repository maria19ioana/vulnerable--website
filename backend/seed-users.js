const db = require('./db');

setTimeout(() => {
    console.log('Creating test users...');

    db.run(
        'INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)',
        ['admin', 'password', 'admin'],
        function(err) {
            if (err) {
                console.error('Error creating admin user:', err);
            } else if (this.changes === 1) {
                console.log('Admin user created successfully!');
            } else {
                console.log('Admin user already exists.');
            }
        }
    );

    db.run(
        'INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)',
        ['user', 'password', 'user'],
        function(err) {
            if (err) {
                console.error('Error creating regular user:', err);
            } else if (this.changes === 1) {
                console.log('Regular user created successfully!');
            } else {
                console.log('Regular user already exists.');
            }
        }
    );

    db.run(
        'INSERT OR IGNORE INTO clubs (name, owner_id) VALUES (?, ?)',
        ['Test Club', 1],
        function(err) {
            if (err) {
                console.error('Error creating test club:', err);
            } else if (this.changes === 1) {
                console.log('Test club created successfully!');
            } else {
                console.log('Test club already exists.');
            }
        }
    );

    console.log('Database seeding completed.');
}, 1000); // Wait 1 second for DB to initialize 