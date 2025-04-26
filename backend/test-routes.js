const express = require('express');
const app = express();

// Import routes
const authRoutes = require('./auth.js');

// Print all routes
console.log('Listing all registered routes in auth.js:');
authRoutes.stack.forEach(route => {
  if (route.route) {
    const path = route.route.path;
    const methods = Object.keys(route.route.methods).filter(method => route.route.methods[method]);
    console.log(`${methods.join(', ').toUpperCase()} ${path}`);
  }
});

console.log('\nTest complete.'); 