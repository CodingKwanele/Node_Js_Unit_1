const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // stores file in 'uploads' folder

const homeController = require('../controllers/homeController');

router.get('/', homeController.getHomePage);

// Use upload.single() for file field
router.post('/api/servicerequests', upload.single('attachment'), homeController.submitRequest);

module.exports = router;
