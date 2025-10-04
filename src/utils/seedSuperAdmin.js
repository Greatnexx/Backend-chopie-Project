import RestaurantUser from "../models/restaurantUserModel.js";

export const seedSuperAdmin = async () => {
  try {
    const existingSuperAdmin = await RestaurantUser.findOne({ role: "SuperAdmin" });
    
    if (!existingSuperAdmin) {
      await RestaurantUser.create({
        name: "Super Admin",
        email: "superadmin@chopie.com",
        password: "SuperAdmin123!",
        role: "SuperAdmin",
        isActive: true
      });
      console.log("SuperAdmin created successfully!");
      console.log("Login: superadmin@chopie.com / SuperAdmin123!");
    }
  } catch (error) {
    console.error("SuperAdmin seeding failed:", error);
  }
};