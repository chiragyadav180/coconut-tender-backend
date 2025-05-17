const express = require('express');
const router = express.Router();
const { 
  register, 
  login,
  validateRegistration,
  validateLogin
} = require('../controllers/userController');

// Register route with validation middleware
router.post('/register', validateRegistration, register);

// Login route with validation middleware
router.post('/login', validateLogin, login);

module.exports = router;