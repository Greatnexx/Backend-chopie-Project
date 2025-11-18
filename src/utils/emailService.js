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

// Email configuration test removed to prevent startup delays

export const sendOrderConfirmationEmail = async (order) => {
  try {
    const itemsList = order.items.map(item => 
      `<tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 12px; font-weight: 500;">${item.name}</td>
        <td style="padding: 12px; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; text-align: right; font-weight: 600;">$${item.totalPrice.toFixed(2)}</td>
      </tr>${item.specialInstructions ? `<tr><td colspan="3" style="padding: 0 12px 8px; font-size: 12px; color: #666; font-style: italic;">Note: ${item.specialInstructions}</td></tr>` : ''}`
    ).join('');

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: order.customerEmail,
      subject: `🍽️ Order Confirmed - #${order.orderNumber} | Chopie Restaurant`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Order Confirmation</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f9fa;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">🍽️ Chopie Restaurant</h1>
              <p style="color: #fee2e2; margin: 8px 0 0; font-size: 16px;">Order Confirmation</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px;">
              <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
                <h2 style="color: #15803d; margin: 0 0 8px; font-size: 20px;">✅ Order Confirmed!</h2>
                <p style="color: #166534; margin: 0; font-size: 14px;">Dear ${order.customerName}, your order has been successfully placed and is being prepared.</p>
              </div>
              
              <!-- Order Details -->
              <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
                <h3 style="color: #1e293b; margin: 0 0 16px; font-size: 18px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">📋 Order Details</h3>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span style="color: #64748b; font-weight: 500;">Order Number:</span>
                  <span style="color: #1e293b; font-weight: 600; background: #fee2e2; padding: 4px 8px; border-radius: 4px;">#${order.orderNumber}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span style="color: #64748b; font-weight: 500;">Table:</span>
                  <span style="color: #1e293b; font-weight: 600;">${order.tableNumber}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span style="color: #64748b; font-weight: 500;">Estimated Time:</span>
                  <span style="color: #059669; font-weight: 600;">⏱️ 20-25 minutes</span>
                </div>
              </div>
              
              <!-- Items Table -->
              <div style="margin-bottom: 24px;">
                <h3 style="color: #1e293b; margin: 0 0 16px; font-size: 18px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">🛒 Your Order</h3>
                <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                  <thead>
                    <tr style="background: #f1f5f9;">
                      <th style="padding: 12px; text-align: left; font-weight: 600; color: #475569;">Item</th>
                      <th style="padding: 12px; text-align: center; font-weight: 600; color: #475569;">Qty</th>
                      <th style="padding: 12px; text-align: right; font-weight: 600; color: #475569;">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsList}
                    <tr style="background: #fef2f2; border-top: 2px solid #ef4444;">
                      <td colspan="2" style="padding: 16px; font-weight: 600; font-size: 16px; color: #1e293b;">Total Amount</td>
                      <td style="padding: 16px; text-align: right; font-weight: 700; font-size: 18px; color: #ef4444;">$${order.totalAmount.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <!-- Action Button -->
              <div style="text-align: center; margin-bottom: 24px;">
                <a href="${process.env.FRONTEND_URL}/trackorder" style="display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(239, 68, 68, 0.3); transition: all 0.3s ease;">📱 Track Your Order</a>
              </div>
              
              <!-- Footer Message -->
              <div style="background: #fffbeb; border: 1px solid #fbbf24; padding: 16px; border-radius: 8px; text-align: center;">
                <p style="color: #92400e; margin: 0; font-weight: 500;">🙏 Thank you for choosing Chopie Restaurant!</p>
                <p style="color: #b45309; margin: 8px 0 0; font-size: 14px;">We're preparing your delicious meal with love and care.</p>
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

    await transporter.sendMail(mailOptions);
    console.log('Order confirmation email sent successfully');
  } catch (error) {
    console.error('Email sending failed:', error);
  }
};

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
      subject: `🎉 Welcome to Chopie Restaurant Team - ${user.role}`,
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
              <p style="color: #fee2e2; margin: 8px 0 0; font-size: 16px;">Staff Account Created</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px;">
              <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 20px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
                <h2 style="color: #15803d; margin: 0 0 8px; font-size: 22px;">🎉 Welcome to the Team!</h2>
                <p style="color: #166534; margin: 0; font-size: 16px;">Dear ${user.name}, your restaurant staff account has been successfully created.</p>
              </div>
              
              <!-- Credentials Card -->
              <div style="background: #f8fafc; border: 2px solid #e2e8f0; padding: 24px; border-radius: 12px; margin-bottom: 24px;">
                <h3 style="color: #1e293b; margin: 0 0 20px; font-size: 20px; text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px;">🔐 Your Login Credentials</h3>
                
                <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 16px;">
                  <div style="display: flex; align-items: center; margin-bottom: 12px;">
                    <span style="color: #64748b; font-weight: 500; width: 80px;">📧 Email:</span>
                    <span style="color: #1e293b; font-weight: 600; background: #f1f5f9; padding: 6px 12px; border-radius: 6px; font-family: monospace;">${user.email}</span>
                  </div>
                  <div style="display: flex; align-items: center; margin-bottom: 12px;">
                    <span style="color: #64748b; font-weight: 500; width: 80px;">🔑 Password:</span>
                    <span style="color: #dc2626; font-weight: 700; background: #fef2f2; padding: 6px 12px; border-radius: 6px; font-family: monospace; border: 1px solid #fecaca;">${user.password}</span>
                  </div>
                  <div style="display: flex; align-items: center;">
                    <span style="color: #64748b; font-weight: 500; width: 80px;">👤 Role:</span>
                    <span style="color: white; font-weight: 600; background: ${roleColor}; padding: 6px 12px; border-radius: 6px; font-size: 14px;">${user.role}</span>
                  </div>
                </div>
                
                <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 16px; border-radius: 8px;">
                  <p style="color: #92400e; margin: 0; font-weight: 500; font-size: 14px;">⚠️ <strong>Important Security Notice:</strong></p>
                  <p style="color: #b45309; margin: 8px 0 0; font-size: 14px;">Please change your password immediately after your first login for security purposes.</p>
                </div>
              </div>
              
              <!-- Action Button -->
              <div style="text-align: center; margin-bottom: 24px;">
                <a href="${process.env.FRONTEND_URL}/restaurant/login" style="display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(239, 68, 68, 0.3);">🚀 Login to Dashboard</a>
              </div>
              
              <!-- Role Permissions -->
              <div style="background: #f0f9ff; border: 1px solid #0ea5e9; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
                <h4 style="color: #0c4a6e; margin: 0 0 12px; font-size: 16px;">📋 Your Role: ${user.role}</h4>
                <p style="color: #075985; margin: 0; font-size: 14px; line-height: 1.5;">You have been assigned specific permissions based on your role. Contact your administrator if you need additional access or have any questions about your responsibilities.</p>
              </div>
              
              <!-- Welcome Message -->
              <div style="background: #fffbeb; border: 1px solid #fbbf24; padding: 20px; border-radius: 8px; text-align: center;">
                <p style="color: #92400e; margin: 0 0 8px; font-weight: 600; font-size: 16px;">🤝 Welcome to Chopie Restaurant!</p>
                <p style="color: #b45309; margin: 0; font-size: 14px; line-height: 1.5;">We're excited to have you join our team. Together, we'll create amazing dining experiences for our customers!</p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background: #1f2937; padding: 20px; text-align: center;">
              <p style="color: #9ca3af; margin: 0; font-size: 14px;">© 2024 Chopie Restaurant. All rights reserved.</p>
              <p style="color: #6b7280; margin: 8px 0 0; font-size: 12px;">This is an automated message, please do not reply.</p>
              <p style="color: #6b7280; margin: 4px 0 0; font-size: 12px;">Need help? Contact your administrator.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('User credentials email sent successfully');
  } catch (error) {
    console.error('Email sending failed:', error);
  }
};