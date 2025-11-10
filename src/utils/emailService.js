import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Test email configuration
const testEmailConfig = async () => {
  try {
    console.log('EMAIL_USER:', process.env.EMAIL_USER);
    console.log('EMAIL_PASS exists:', !!process.env.EMAIL_PASS);
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('Missing email credentials in environment variables');
      return;
    }
    
    await transporter.verify();
    console.log('Email configuration is valid');
  } catch (error) {
    console.error('Email configuration error:', error.message);
  }
};

testEmailConfig();

export const sendOrderConfirmationEmail = async (order) => {
  try {
    const itemsList = order.items.map(item => 
      `${item.name} x${item.quantity} - $${item.totalPrice.toFixed(2)}${item.specialInstructions ? ` (${item.specialInstructions})` : ''}`
    ).join('\n');

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: order.customerEmail,
      subject: `Order Confirmation - #${order.orderNumber}`,
      html: `
        <h2>Order Confirmation</h2>
        <p>Dear ${order.customerName},</p>
        <p>Your order has been confirmed! Here are the details:</p>
        
        <h3>Order Details:</h3>
        <p><strong>Order Number:</strong> ${order.orderNumber}</p>
        <p><strong>Table:</strong> ${order.tableNumber}</p>
        <p><strong>Total:</strong> $${order.totalAmount.toFixed(2)}</p>
        
        <h3>Items:</h3>
        <pre>${itemsList}</pre>
        
        <p>Track your order at: <a href="${process.env.FRONTEND_URL}/trackorder">Track Order</a></p>
        <p>Estimated preparation time: 20-25 minutes</p>
        
        <p>Thank you for choosing Chopie!</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('Order confirmation email sent successfully');
  } catch (error) {
    console.error('Email sending failed:', error);
    // Don't throw error to prevent order creation from failing
  }
};

export const sendUserCredentialsEmail = async (user) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Your Chopie Restaurant Account',
      html: `
        <h2>Welcome to Chopie Restaurant System</h2>
        <p>Dear ${user.name},</p>
        <p>Your account has been created with the following credentials:</p>
        
        <h3>Login Details:</h3>
        <p><strong>Email:</strong> ${user.email}</p>
        <p><strong>Password:</strong> ${user.password}</p>
        <p><strong>Role:</strong> ${user.role}</p>
        
        <p>Please login at: <a href="${process.env.FRONTEND_URL}/restaurant/login">Restaurant Login</a></p>
        <p><strong>Important:</strong> Please change your password after first login.</p>
        
        <p>Welcome to the team!</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('User credentials email sent successfully');
  } catch (error) {
    console.error('Email sending failed:', error);
    // Don't throw error to prevent user creation from failing
  }
};