/**
 * @file: Subscriber.js
 * @description: Defines the Mongoose schema and model for subscribers.
 * @author: Kwanele
 */

// Import the mongoose library
const mongoose = require('mongoose');

// Define the schema for a subscriber
const subscriberSchema = new mongoose.Schema({
    // The name of the subscriber (String type)
    name: String,
    // The email address of the subscriber (String type)
    email: String,
    // The zip code of the subscriber (Number type)
    zipCode: Number,
    // The date the subscriber was added (Date type, defaults to current date/time)
    date: { type: Date, default: Date.now }
});

// Export the Mongoose model named 'Subcriber' using the defined schema
module.exports = mongoose.model('Subcriber', subscriberSchema);
