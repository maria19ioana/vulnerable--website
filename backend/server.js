const express = require('express');
const cors = require('cors'); // ✅ Import cors
const app = express();

const authRoutes = require('./auth');
const clubRoutes = require('./clubs');
const inviteRoutes = require('./invites');

app.use(cors()); // ✅ Enable CORS for all routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/', authRoutes);
app.use('/', clubRoutes);
app.use('/', inviteRoutes);

app.listen(3001, () => {
  console.log('ClubConnect backend running on http://localhost:3001');
});
