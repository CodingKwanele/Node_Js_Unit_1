/**
 * @author: Kwanele Dladla
 * @description: This project demonstrates connecting a Node.js application to a MongoDB database.
 */

// Import the MongoClient class from the mongodb package
const { MongoClient } = require('mongodb');

// Define the MongoDB connection URL (local instance)
const databaseUrl = 'mongodb://127.0.0.1:27017';  
// Specify the database name to use
const dbName = 'recipe_db';

/**
 * Connects to MongoDB, fetches all documents from the 'contacts' collection,
 * and prints them to the console.
 */
async function connectAndFetch() {
    let client;
    
    try {
        // Connect to MongoDB server using the connection URL and options
        client = await MongoClient.connect(databaseUrl, { 
            useNewUrlParser: true, 
            useUnifiedTopology: true 
        });
        
        console.log('Connected to the database server');
        
        // Select the database by name
        const db = client.db(dbName);
        // Fetch all documents from the 'contacts' collection and convert to array
        const result = await db.collection('contacts').find().toArray();
        
        // Output the fetched documents to the console
        console.log(result);
        
    } catch (error) {
        // Handle any errors that occur during the database operations
        console.error('Database operation failed:', error.message);
    } finally {
        // Ensure the client connection is closed, even if an error occurs
        if (client) {
            await client.close();
        }
    }
}

// Call the function to execute the database operations
connectAndFetch();