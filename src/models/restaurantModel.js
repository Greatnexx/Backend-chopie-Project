import mongoose from "mongoose";

const restaurantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    subdomain: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    subscription: {
      plan: {
        type: String,
        enum: ["basic", "premium", "enterprise"],
        default: "basic",
      },
      status: {
        type: String,
        enum: ["active", "inactive", "suspended"],
        default: "active",
      },
      expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    },
    branding: {
      name: {
        type: String,
        default: function() { return this.name; },
      },
      logo: {
        type: String,
        default: null,
      },
      primaryColor: {
        type: String,
        default: "#ef4444", // red-500
      },
      secondaryColor: {
        type: String,
        default: "#f97316", // orange-500
      },
      accentColor: {
        type: String,
        default: "#eab308", // yellow-500
      },
      fontFamily: {
        type: String,
        default: "Inter",
      },
    },
    settings: {
      allowOnlineOrdering: {
        type: Boolean,
        default: true,
      },
      requireTableNumber: {
        type: Boolean,
        default: true,
      },
      enableVipTables: {
        type: Boolean,
        default: true,
      },
    },
    operatingHours: {
      monday: {
        open: { type: String, default: '09:00' },
        close: { type: String, default: '22:00' },
        closed: { type: Boolean, default: false }
      },
      tuesday: {
        open: { type: String, default: '09:00' },
        close: { type: String, default: '22:00' },
        closed: { type: Boolean, default: false }
      },
      wednesday: {
        open: { type: String, default: '09:00' },
        close: { type: String, default: '22:00' },
        closed: { type: Boolean, default: false }
      },
      thursday: {
        open: { type: String, default: '09:00' },
        close: { type: String, default: '22:00' },
        closed: { type: Boolean, default: false }
      },
      friday: {
        open: { type: String, default: '09:00' },
        close: { type: String, default: '23:00' },
        closed: { type: Boolean, default: false }
      },
      saturday: {
        open: { type: String, default: '09:00' },
        close: { type: String, default: '23:00' },
        closed: { type: Boolean, default: false }
      },
      sunday: {
        open: { type: String, default: '10:00' },
        close: { type: String, default: '21:00' },
        closed: { type: Boolean, default: false }
      }
    },
    contactInfo: {
      phone: { type: String, default: '' },
      email: { type: String, default: '' },
      website: { type: String, default: '' },
      socialMedia: {
        facebook: { type: String, default: '' },
        instagram: { type: String, default: '' },
        twitter: { type: String, default: '' }
      }
    },
    deliverySettings: {
      enabled: { type: Boolean, default: true },
      radius: { type: Number, default: 5 },
      minOrder: { type: Number, default: 20 },
      deliveryFee: { type: Number, default: 3.99 }
    },
    // Financial settings for Transaction Admin
    paymentMethods: {
      cash: { type: Boolean, default: true },
      transfer: { type: Boolean, default: true }
    },
    taxRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    currency: {
      type: String,
      default: 'NGN'
    },
    receiptSettings: {
      showTax: { type: Boolean, default: true },
      showServiceCharge: { type: Boolean, default: false },
      footerText: { type: String, default: 'Thank you for dining with us!' }
    },
  },
  { timestamps: true }
);

const Restaurant = mongoose.model("Restaurant", restaurantSchema);
export default Restaurant;