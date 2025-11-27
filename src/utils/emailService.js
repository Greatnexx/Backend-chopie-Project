import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create transporter with better configuration for immediate delivery
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  // pool: true, // Use connection pooling
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  rateLimit: 14,
  connectionTimeout: 10000,
  greetingTimeout: 5000,
  socketTimeout: 15000,
  tls: {
    rejectUnauthorized: false
  }
});

// Email queue for retry mechanism
const emailQueue = [];
let isProcessingQueue = false;

// export const testEmailConfiguration = async () => {
//   try {
//     if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
//       throw new Error('EMAIL_USER or EMAIL_PASS environment variables not set');
//     }
    
//     await transporter.verify();
//     console.log('✅ Email service configured successfully');
//     return true;
//   } catch (error) {
//     console.error('❌ Email configuration failed:', error.message);
//     return false;
//   }
// };

const processEmailQueue = async () => {
  if (isProcessingQueue || emailQueue.length === 0) return;
  
  isProcessingQueue = true;
  
  while (emailQueue.length > 0) {
    const emailTask = emailQueue.shift();
    try {
      await transporter.sendMail(emailTask.mailOptions);
    } catch (error) {
      if (emailTask.retries > 0) {
        emailTask.retries--;
        emailQueue.push(emailTask);
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  isProcessingQueue = false;
};

const sendEmailImmediate = async (mailOptions, retries = 3) => {
  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    emailQueue.push({ mailOptions, retries });
    setTimeout(processEmailQueue, 1000);
    throw error;
  }
};

// Start queue processor
setInterval(processEmailQueue, 5000); // Process queue every 5 seconds

export const sendUserCredentialsEmail = async (user) => {
  try {
    const roleColors = {
      'SuperAdmin': '#8b5cf6',
      'TransactionAdmin': '#3b82f6', 
      'MenuManager': '#10b981',
      'SubUser': '#6b7280'
    };
    
    const roleColor = roleColors[user.role] || '#6b7280';

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: `Welcome to Chopie Restaurant Team - ${user.role}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Chopie Restaurant</title>
        </head>
        <body style="margin: 0; padding: 20px; font-family: Verdana, Arial, sans-serif; background-color: #f5f5f5; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border: 1px solid #ddd;">
            <!-- Header -->
            <div style="background: #333; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Chopie Restaurant</h1>
              <p style="color: #ccc; margin: 5px 0 0; font-size: 14px;">Staff Account Created</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 20px;">
              <div style="border-left: 3px solid #333; padding: 15px; margin-bottom: 20px; background: #f9f9f9;">
                <h2 style="margin: 0 0 5px; font-size: 18px;">Welcome to the Team!</h2>
                <p style="margin: 0; font-size: 14px;">Dear ${user.name}, your restaurant staff account has been successfully created.</p>
              </div>
              
              <!-- Credentials Card -->
              <div style="border: 1px solid #ddd; padding: 15px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 15px; font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 10px;">Your Login Credentials</h3>
                
                <div style="margin-bottom: 15px;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span>Email:</span>
                    <span style="font-weight: bold; font-family: monospace;">${user.email}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span>Password:</span>
                    <span style="font-weight: bold; font-family: monospace;">${user.password}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <span>Role:</span>
                    <span style="font-weight: bold;">${user.role}</span>
                  </div>
                </div>
                
                <div style="border: 1px solid #ddd; padding: 10px; background: #f9f9f9;">
                  <p style="margin: 0; font-weight: bold; font-size: 12px;">Important Security Notice:</p>
                  <p style="margin: 5px 0 0; font-size: 12px;">Please change your password immediately after your first login for security purposes.</p>
                </div>
              </div>
              
              <!-- Action Button -->
              <div style="text-align: center; margin-bottom: 20px;">
                <a href="${process.env.FRONTEND_URL}/restaurant/login" style="display: inline-block; background: #333; color: white; padding: 12px 24px; text-decoration: none; font-size: 14px;">Login to Dashboard</a>
              </div>
              
              <!-- Role Permissions -->
              <div style="border: 1px solid #ddd; padding: 15px; margin-bottom: 20px;">
                <h4 style="margin: 0 0 10px; font-size: 14px;">Your Role: ${user.role}</h4>
                <p style="margin: 0; font-size: 12px;">You have been assigned specific permissions based on your role. Contact your administrator if you need additional access or have any questions.</p>
              </div>
              
              <!-- Welcome Message -->
              <div style="border: 1px solid #ddd; padding: 15px; text-align: center;">
                <p style="margin: 0 0 5px; font-weight: bold; font-size: 14px;">Welcome to Chopie Restaurant!</p>
                <p style="margin: 0; font-size: 12px;">We're excited to have you join our team. Together, we'll create amazing dining experiences for our customers!</p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background: #f5f5f5; padding: 15px; text-align: center; border-top: 1px solid #ddd;">
              <p style="margin: 0; font-size: 12px; color: #666;">© 2024 Chopie Restaurant. All rights reserved.</p>
              <p style="margin: 5px 0 0; font-size: 11px; color: #999;">Need help? Contact your administrator.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await sendEmailImmediate(mailOptions);
  } catch (error) {
    // Silent fail for user credentials email
  }
};

export const sendPasswordResetEmail = async (email, resetToken) => {
  try {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: '🔐 Password Reset Request | Chopie Restaurant',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f9fa;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">🍽️ Chopie Restaurant</h1>
              <p style="color: #fee2e2; margin: 8px 0 0; font-size: 16px;">Password Reset Request</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px;">
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
                <h2 style="color: #92400e; margin: 0 0 8px; font-size: 22px;">🔐 Password Reset Requested</h2>
                <p style="color: #b45309; margin: 0; font-size: 16px;">We received a request to reset your password for your Chopie Restaurant account.</p>
              </div>
              
              <!-- Reset Instructions -->
              <div style="background: #f8fafc; padding: 24px; border-radius: 8px; margin-bottom: 24px;">
                <h3 style="color: #1e293b; margin: 0 0 16px; font-size: 18px;">📝 Reset Instructions</h3>
                <p style="color: #64748b; margin: 0 0 16px; line-height: 1.6;">Click the button below to reset your password. This link will expire in 1 hour for security reasons.</p>
                
                <div style="text-align: center; margin: 24px 0;">
                  <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(239, 68, 68, 0.3);">🔑 Reset Password</a>
                </div>
                
                <p style="color: #64748b; margin: 16px 0 0; font-size: 14px; line-height: 1.6;">If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="color: #3b82f6; margin: 8px 0 0; font-size: 14px; word-break: break-all; background: #f1f5f9; padding: 8px; border-radius: 4px; font-family: monospace;">${resetUrl}</p>
              </div>
              
              <!-- Security Notice -->
              <div style="background: #fee2e2; border: 1px solid #ef4444; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
                <h4 style="color: #dc2626; margin: 0 0 12px; font-size: 16px;">🛡️ Security Notice</h4>
                <ul style="color: #b91c1c; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6;">
                  <li>This reset link will expire in 1 hour</li>
                  <li>If you didn't request this reset, please ignore this email</li>
                  <li>Never share your password with anyone</li>
                  <li>Contact support if you have any concerns</li>
                </ul>
              </div>
              
              <!-- Footer Message -->
              <div style="background: #fffbeb; border: 1px solid #fbbf24; padding: 16px; border-radius: 8px; text-align: center;">
                <p style="color: #92400e; margin: 0; font-weight: 500;">🔒 Your Account Security Matters</p>
                <p style="color: #b45309; margin: 8px 0 0; font-size: 14px;">We're committed to keeping your account safe and secure.</p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background: #1f2937; padding: 20px; text-align: center;">
              <p style="color: #9ca3af; margin: 0; font-size: 14px;">© 2024 Chopie Restaurant. All rights reserved.</p>
              <p style="color: #6b7280; margin: 8px 0 0; font-size: 12px;">This is an automated message, please do not reply.</p>
              <p style="color: #6b7280; margin: 4px 0 0; font-size: 12px;">Need help? Contact our support team.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await sendEmailImmediate(mailOptions);
  } catch (error) {
    // Silent fail for password reset email
  }
};

export const sendWelcomeEmail = async (customerEmail, customerName) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: customerEmail,
      subject: '🎉 Welcome to Chopie Restaurant Family!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Chopie Restaurant</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f9fa;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">🍽️ Chopie Restaurant</h1>
              <p style="color: #fee2e2; margin: 8px 0 0; font-size: 16px;">Welcome to Our Family!</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px;">
              <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 20px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
                <h2 style="color: #15803d; margin: 0 0 8px; font-size: 22px;">🎉 Welcome ${customerName}!</h2>
                <p style="color: #166534; margin: 0; font-size: 16px;">Thank you for joining the Chopie Restaurant family. We're excited to serve you delicious meals!</p>
              </div>
              
              <!-- Features -->
              <div style="background: #f8fafc; padding: 24px; border-radius: 8px; margin-bottom: 24px;">
                <h3 style="color: #1e293b; margin: 0 0 20px; font-size: 18px; text-align: center;">🌟 What You Can Enjoy</h3>
                
                <div style="display: grid; gap: 16px;">
                  <div style="display: flex; align-items: center; padding: 12px; background: white; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <span style="font-size: 24px; margin-right: 12px;">🍕</span>
                    <div>
                      <h4 style="margin: 0; color: #1e293b; font-size: 14px;">Delicious Menu</h4>
                      <p style="margin: 4px 0 0; color: #64748b; font-size: 12px;">Fresh ingredients, amazing flavors</p>
                    </div>
                  </div>
                  
                  <div style="display: flex; align-items: center; padding: 12px; background: white; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <span style="font-size: 24px; margin-right: 12px;">⚡</span>
                    <div>
                      <h4 style="margin: 0; color: #1e293b; font-size: 14px;">Quick Service</h4>
                      <p style="margin: 4px 0 0; color: #64748b; font-size: 12px;">Fast and efficient order processing</p>
                    </div>
                  </div>
                  
                  <div style="display: flex; align-items: center; padding: 12px; background: white; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <span style="font-size: 24px; margin-right: 12px;">📱</span>
                    <div>
                      <h4 style="margin: 0; color: #1e293b; font-size: 14px;">Order Tracking</h4>
                      <p style="margin: 4px 0 0; color: #64748b; font-size: 12px;">Real-time updates on your orders</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Action Button -->
              <div style="text-align: center; margin-bottom: 24px;">
                <a href="${process.env.FRONTEND_URL}/menu" style="display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(239, 68, 68, 0.3);">🍽️ Explore Our Menu</a>
              </div>
              
              <!-- Welcome Message -->
              <div style="background: #fffbeb; border: 1px solid #fbbf24; padding: 20px; border-radius: 8px; text-align: center;">
                <p style="color: #92400e; margin: 0 0 8px; font-weight: 600; font-size: 16px;">🤝 We're Here to Serve You!</p>
                <p style="color: #b45309; margin: 0; font-size: 14px; line-height: 1.5;">Our team is dedicated to providing you with the best dining experience. Enjoy your meals!</p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background: #1f2937; padding: 20px; text-align: center;">
              <p style="color: #9ca3af; margin: 0; font-size: 14px;">© 2024 Chopie Restaurant. All rights reserved.</p>
              <p style="color: #6b7280; margin: 8px 0 0; font-size: 12px;">This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await sendEmailImmediate(mailOptions);
  } catch (error) {
    // Silent fail for welcome email
  }
};

export const sendOrderConfirmationEmail = async (customerEmail, customerName, orderDetails) => {
  try {
    const { orderNumber, tableNumber, items, totalAmount } = orderDetails;
    
    const itemsList = items.map(item => 
      `<div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
        <span style="color: #374151;">${item.name} x${item.quantity}</span>
        <span style="color: #1f2937; font-weight: 600;">$${item.totalPrice.toFixed(2)}</span>
      </div>`
    ).join('');

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: customerEmail,
      subject: `🍽️ Order Confirmation - ${orderNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Order Confirmation</title>
        </head>
        <body style="margin: 0; padding: 20px; font-family: Verdana, Arial, sans-serif; background-color: #f5f5f5; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border: 1px solid #ddd;">
            <!-- Header -->
            <div style="background: #333; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Chopie Restaurant</h1>
              <p style="color: #ccc; margin: 5px 0 0; font-size: 14px;">Order Confirmation</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 20px;">
              <div style="border-left: 3px solid #333; padding: 15px; margin-bottom: 20px; background: #f9f9f9;">
                <h2 style="margin: 0 0 5px; font-size: 18px;">Order Confirmed!</h2>
                <p style="margin: 0; font-size: 14px;">Thank you ${customerName}! Your order has been received and is being prepared.</p>
              </div>
              
              <!-- Order Details -->
              <div style="border: 1px solid #ddd; padding: 15px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 15px; font-size: 16px;">Order Details</h3>
                
                <div style="margin-bottom: 15px;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span>Order Number:</span>
                    <span style="font-weight: bold;">${orderNumber}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span>Table Number:</span>
                    <span style="font-weight: bold;">${tableNumber}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <span>Order Time:</span>
                    <span style="font-weight: bold;">${new Date().toLocaleTimeString()}</span>
                  </div>
                </div>
                
                <h4 style="margin: 15px 0 10px; font-size: 14px;">Items Ordered</h4>
                <div style="border: 1px solid #ddd; padding: 10px;">
                  ${itemsList}
                  <div style="display: flex; justify-content: space-between; padding: 10px 0 5px; border-top: 1px solid #ddd; margin-top: 10px;">
                    <span style="font-weight: bold; font-size: 14px;">Total Amount:</span>
                    <span style="font-weight: bold; font-size: 16px;">$${totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              <!-- Estimated Time -->
              <div style="border: 1px solid #ddd; padding: 15px; margin-bottom: 20px; text-align: center;">
                <h4 style="margin: 0 0 5px; font-size: 14px;">Estimated Preparation Time</h4>
                <p style="margin: 0; font-size: 16px; font-weight: bold;">20-25 minutes</p>
                <p style="margin: 5px 0 0; font-size: 12px;">We'll notify you when your order is ready!</p>
              </div>
              
              <!-- Track Order Button -->
              <div style="text-align: center; margin-bottom: 20px;">
                <a href="${process.env.FRONTEND_URL}/trackorder" style="display: inline-block; background: #333; color: white; padding: 12px 24px; text-decoration: none; font-size: 14px;">Track Your Order</a>
              </div>
              
              <!-- Thank You Message -->
              <div style="border: 1px solid #ddd; padding: 15px; text-align: center;">
                <p style="margin: 0 0 5px; font-weight: bold; font-size: 14px;">Thank You for Choosing Us!</p>
                <p style="margin: 0; font-size: 12px;">We appreciate your business and look forward to serving you delicious food!</p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background: #f5f5f5; padding: 15px; text-align: center; border-top: 1px solid #ddd;">
              <p style="margin: 0; font-size: 12px; color: #666;">© 2024 Chopie Restaurant. All rights reserved.</p>
              <p style="margin: 5px 0 0; font-size: 11px; color: #999;">This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await sendEmailImmediate(mailOptions);
    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const sendOrderStatusUpdateEmail = async (order, newStatus) => {
  try {
    const statusMessages = {
      preparing: {
        title: '👨🍳 Your Order is Being Prepared!',
        message: 'Great news! Our kitchen team has started preparing your delicious meal.',
        estimatedTime: '5-10 minutes'
      },
      completed: {
        title: '🎉 Your Order is Ready!',
        message: 'Your order has been completed and is ready for pickup at your table.',
        estimatedTime: 'Ready now'
      }
    };

    const statusInfo = statusMessages[newStatus] || {
      title: '📋 Order Status Update',
      message: `Your order status has been updated to: ${newStatus}`,
      estimatedTime: 'Please check with staff'
    };

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: order.customerEmail,
      subject: `🍽️ Order Update - ${order.orderNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Order Status Update</title>
        </head>
        <body style="margin: 0; padding: 20px; font-family: Verdana, Arial, sans-serif; background-color: #f5f5f5; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border: 1px solid #ddd;">
            <div style="background: #333; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Chopie Restaurant</h1>
              <p style="color: #ccc; margin: 5px 0 0; font-size: 14px;">Order Status Update</p>
            </div>
            
            <div style="padding: 20px;">
              <div style="border-left: 3px solid #333; padding: 15px; margin-bottom: 20px; background: #f9f9f9;">
                <h2 style="margin: 0 0 5px; font-size: 18px;">${statusInfo.title}</h2>
                <p style="margin: 0; font-size: 14px;">Hi ${order.customerName}! ${statusInfo.message}</p>
              </div>
              
              <div style="border: 1px solid #ddd; padding: 15px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 15px; font-size: 16px;">Order Details</h3>
                <div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span>Order Number:</span>
                    <span style="font-weight: bold;">${order.orderNumber}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span>Table Number:</span>
                    <span style="font-weight: bold;">${order.tableNumber}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span>Status:</span>
                    <span style="font-weight: bold; text-transform: capitalize;">${newStatus}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <span>Estimated Time:</span>
                    <span style="font-weight: bold;">${statusInfo.estimatedTime}</span>
                  </div>
                </div>
              </div>
              
              <div style="text-align: center; margin-bottom: 20px;">
                <a href="${process.env.FRONTEND_URL}/trackorder" style="display: inline-block; background: #333; color: white; padding: 12px 24px; text-decoration: none; font-size: 14px;">Track Your Order</a>
              </div>
            </div>
            
            <div style="background: #f5f5f5; padding: 15px; text-align: center; border-top: 1px solid #ddd;">
              <p style="margin: 0; font-size: 12px; color: #666;">© 2024 Chopie Restaurant. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await sendEmailImmediate(mailOptions);
    return { success: true, message: 'Status update email sent successfully' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};