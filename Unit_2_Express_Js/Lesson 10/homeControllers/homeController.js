/**
 * Home Controller
 * Handles all routes for the application
 */

const express = require('express');
const router = express.Router();

// Home page route
router.get('/', (req, res) => {
  res.render('index', {
    title: 'Welcome to My App',
    name: 'Guest',
    message: 'Hello, World!',
    features: ['Fast', 'Reliable', 'Easy to use']
  });
});


// About page route
router.get('/about', (req, res) => {
  res.render('about', {
    title: 'About Us',
    description: 'This is a sample application built with Node.js and Express.',
    year: new Date().getFullYear()
  });
});

// Contact page route
router.get('/contact', (req, res) => {
  res.render('contact', {
    title: 'Contact Us',
    email: 'contact@example.com'
  });
});

// Handle POST requests (example form submission)
router.post('/contact', (req, res) => {
  const { name, email, message } = req.body;
  
  // Here you would typically save to database or send email
  console.log('Contact form submission:', { name, email, message });
  
  res.render('contact-success', {
    title: 'Message Sent',
    name: name
  });
});
// Name route parameter example
router.get('/name/:myName', (req, res) => {
  const paramsName = req.params.myName;

  res.render('index', {
    name: paramsName,
    title: 'Welcome to My App',
    message: 'Hello, World!',
    features: ['Fast', 'Reliable', 'Easy to use']
  });
});


// Dynamic route example
router.get('/users/:id', (req, res) => {
  const userId = req.params.id;
  res.render('user', {
    title: `User Profile - ${userId}`,
    userId: userId
  });
});

module.exports = router;