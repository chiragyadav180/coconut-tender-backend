const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const protect = async (req, res, next) => {
  try {
    let token;

  
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ error: 'Not authorized, no token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');

    next();
  } catch (error) {
    res.status(401).json({ error: 'Not authorized, token failed' });
  }
};

// Role-based access control
const adminOnly = () => {
    return (req, res, next) => {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ 
          success: false,
          error: 'Admin privileges required',
          solution: 'Please contact your system administrator'
        });
      }
      next();
    };
  };

  const vendorOnly = () => {
    return (req, res, next) => {
      if (req.user.role !== 'vendor') {
        return res.status(403).json({ 
          error: 'Vendor privileges required' 
        });
      }
      next();
    };
  };

  const driverOnly = () => {
    return (req, res, next) => {
      if (req.user.role !== 'driver') {
        return res.status(403).json({ 
          error: 'Driver privileges required' 
        });
      }
      next();
    };
  };

module.exports = { protect, adminOnly,vendorOnly,driverOnly };