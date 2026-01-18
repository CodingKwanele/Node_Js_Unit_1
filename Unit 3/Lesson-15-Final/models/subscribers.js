/** 
 * @author : Kwanele Dladla 
 * @description : Mongoose schema and model for subscribers.
 * `
 */

// Import the mongoose library : This tool helps to interact with MongoDB databases
import mongoose from 'mongoose';
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
// Export the Mongoose model named 'Subscriber' using the defined schema
export default mongoose.model('Subscriber', subscriberSchema);
15  