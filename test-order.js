// Simple test script to verify order creation
// Run with: node test-order.js

const testOrder = {
  tableNumber: "5",
  customerName: "John Doe",
  customerEmail: "john@example.com",
  customerPhone: "+1234567890",
  items: [
    {
      productId: "507f1f77bcf86cd799439011", // Replace with actual menu item ID
      name: "Burger Deluxe",
      description: "Juicy beef burger with cheese and fries",
      price: 15.99,
      image: "burger.jpg",
      quantity: 2,
      specialInstructions: "No onions please",
      totalPrice: 31.98
    },
    {
      productId: "507f1f77bcf86cd799439012", // Replace with actual menu item ID
      name: "Coca Cola",
      description: "Refreshing soft drink",
      price: 2.99,
      image: "coke.jpg",
      quantity: 1,
      specialInstructions: null,
      totalPrice: 2.99
    }
  ],
  totalAmount: 34.97
};

console.log("Test Order Data:");
console.log(JSON.stringify(testOrder, null, 2));
console.log("\nTo test the API, send a POST request to:");
console.log("http://localhost:8000/api/v1/order");
console.log("\nWith the above JSON data in the request body.");