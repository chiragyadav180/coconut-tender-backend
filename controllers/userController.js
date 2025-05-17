const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const User = require('../models/userModel');


const validateRegistration = (req, res, next) => {
  const { name, email, password, role, phone, location } = req.body;
  const errors = {};

  if (!name || !validator.isLength(name, { min: 2, max: 50 })) {
    errors.name = 'Name must be between 2-50 characters';
  }

  if (!email || !validator.isEmail(email)) {
    errors.email = 'Please provide a valid email address';
  }

  if (!password || !validator.isStrongPassword(password, {
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1
  })) {
    errors.password = 'Password must be at least 8 characters and contain at least one lowercase, one uppercase, one number, and one symbol';
  }


  const allowedRoles = ['vendor', 'driver', 'admin'];
  if (!role || !allowedRoles.includes(role)) {
    errors.role = 'Please select a valid role (vendor, driver, or admin)';
  }


  if (phone && !validator.isMobilePhone(phone)) {
    errors.phone = 'Please provide a valid phone number';
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }

  next();
};


const register = async (req, res) => {
  try {
    const { name, email, password, role, phone, location } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email is already registered.' });
    }


    const hashedPassword = await bcrypt.hash(password, 10);


    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      phone,
      location
    });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token
    });

  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};



const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = {};

  if (!email || !validator.isEmail(email)) {
    errors.email = 'Please provide a valid email address';
  }

  if (!password) {
    errors.password = 'Password is required';
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }

  next();
};



const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { 
  register, 
  login,
  validateRegistration,
  validateLogin
};