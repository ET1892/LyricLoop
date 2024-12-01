const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const mongoose = require('mongoose');

// User Schema
const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, unique: true },
  password: String,
});

const User = mongoose.model('User', userSchema);

// Redirect to signup on root route
router.get('/', (req, res) => {
  res.redirect('/signup');
});

// Signup page
router.get('/signup', (req, res) => {
  res.render('signup');
});

// Handle signup form submission
router.post('/signup', async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  try {
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save new user
    const newUser = new User({ firstName, lastName, email, password: hashedPassword });
    await newUser.save();

    console.log('User registered:', email);
    res.redirect('/login');
  } catch (err) {
    console.error('Error during signup:', err.message);
    res.status(400).send('User already exists or invalid data');
  }
});

// Login page
router.get('/login', (req, res) => {
  res.render('login');
});

// Handle login form submission
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find user
    const user = await User.findOne({ email });
    if (!user) return res.status(400).send('Invalid email or password');

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).send('Invalid email or password');

    console.log('User logged in:', email);
    res.redirect('/featured');
  } catch (err) {
    console.error('Error during login:', err.message);
    res.status(500).send('Server error');
  }
});

// Logout route (optional, if you implement sessions or JWTs)
router.get('/logout', (req, res) => {
  // Placeholder for logout logic
  res.redirect('/login');
});

module.exports = router;
