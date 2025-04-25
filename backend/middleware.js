const jwt = require('./jwt');

function auth(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).send('Authorization header missing.');
  }

  const token = authHeader.split(' ')[1]; 

  if (!token) {
    return res.status(401).send('Token missing.');
  }

  try {
    const user = jwt.verify(token);
    req.user = user; 
    next(); 
  } catch (err) {
    console.error(err);
    return res.status(401).send('Invalid token.');
  }
}

module.exports = auth;
