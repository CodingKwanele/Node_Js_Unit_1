/**
 * @author : Kwanele Dladla
 * @date : 2025-06-09
 * 
 */

function fetchData(callback) {
    console.log("Fetching data...");
    setTimeout(() => {
        const data = { id: 1, name: "John Doe" }; // Simulated data
        console.log("Data fetched successfully!");
        callback(data); // Call the callback function with the fetched data
    }, 2000); // Simulating a 2-second delay for data fetching
}

function processData(data) {
    console.log("Processing data...");
    setTimeout(() => {
        console.log(`Processed Data: ID = ${data.id}, Name = ${data.name}`);
    }, 1000); // Simulating a 1-second delay for data processing
}
fetchData(processData)
console.log("This message will be logged immediately after fetching data."); // This will execute immediately