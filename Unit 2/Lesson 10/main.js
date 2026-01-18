/**
 * @author Kwanele Dladla
 * Main application entry point
 */

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Import controller
const homeController = require('./homecontrollers/homeController');

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use('/', homeController);


// 404 handler (comes after all routes)
app.use((req, res) => {
  res.status(404).render('404', {
    title: 'Page Not Found',
    message: 'The page you are looking for does not exist.'
  });
});

// 500 handler (last)
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  res.status(500).render('500', {
    title: 'Server Error',
    message: 'Something went wrong on our end. Please try again later.'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Views directory: ${path.join(__dirname, 'views')}`);
  console.log(`Static files: ${path.join(__dirname, 'public')}`);
});
