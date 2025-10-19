/**
 * @file: index.js
 * @description: Main entry file for saving user input into MongoDB using Subscriber model.
 * @author: Kwanele Dladla S
 */

const readline = require('readline'); // Import readline for user input
const mongoose = require('mongoose'); // Import mongoose for MongoDB interaction
const Subscriber = require('./Subcriber'); // Import Subscriber model

mongoose.set("strictQuery", false); // Avoid strict query warnings

mongoose.connect("mongodb://127.0.0.1:27017/recipe_db")
  .then(() => console.log(" MongoDB connected successfully"))
  .catch((err) => console.error(" MongoDB connection error:", err));


// Set up readline
const rl = readline.createInterface({
    input: process.stdin, // Set input stream to standard input
    output: process.stdout, // Set output stream to standard output
});

// Helper function for questions
function ask(question) {
    return new Promise(resolve => rl.question(question, resolve)); // Return a promise that resolves with user input
}

async function main() {
    try {
        await new Promise(resolve => mongoose.connection.once('open', resolve)); // Wait for MongoDB connection to open

        const name = await ask('Name: '); // Ask user for name
        const email = await ask('Email: '); // Ask user for email
        const zipCode = await ask('Zip Code: '); // Ask user for zip code

        const subscriber = new Subscriber({
            name, // Set name field
            email, // Set email field
            zipCode: Number(zipCode), // Convert zip code to number and set field
        });

        const doc = await subscriber.save(); // Save subscriber to MongoDB
        console.log(' Subscriber saved:', doc); // Log success message and saved document
    } catch (err) {
        console.error(' Error:', err); // Log error if any occurs
    } finally {
        rl.close(); // Close readline interface
        mongoose.disconnect(); // Disconnect from MongoDB
    }
}

main(); // Run main function
