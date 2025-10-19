/**
 * @author: Kwanele Dladla
 * @date: 2025-06-09
 * 
 */
let pizza;
function orderPizza()
{
    console.log("Your pizza is being prepared...");
    setTimeout(() => {
        console.log("Your pizza is ready!");
        console.log(`Your Pizza has arrived + ${pizza} `);
    }, 3000); // Simulating a 3-second delay for pizza preparation
}


orderPizza();
console.log("Thank you for your order!"); // This will execute immediately
