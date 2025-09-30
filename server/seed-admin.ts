import { storage } from "./storage";

async function seedAdmin() {
  try {
    // Check if admin user already exists
    const existingAdmin = await storage.findUserByEmail("admin@plasticclever.schools");
    
    if (existingAdmin) {
      console.log("Admin user already exists!");
      process.exit(0);
    }

    // Hash the password
    const passwordHash = await storage.hashPassword("admin1234");

    // Create admin user
    const adminUser = await storage.createUserWithPassword({
      email: "admin@plasticclever.schools",
      passwordHash,
      emailVerified: true,
      firstName: "Admin",
      lastName: "User",
      role: "admin",
      isAdmin: true,
      profileImageUrl: null,
    });

    console.log("✅ Admin user created successfully!");
    console.log("Email: admin@plasticclever.schools");
    console.log("Password: admin1234");
    console.log("User ID:", adminUser.id);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating admin user:", error);
    process.exit(1);
  }
}

seedAdmin();
