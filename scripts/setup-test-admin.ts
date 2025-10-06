import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

async function setupTestAdmin() {
  try {
    const testAdminEmail = "admin@admin.com";
    const testAdminPassword = "admin1234";

    // Check if admin already exists
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.email, testAdminEmail))
      .limit(1);

    if (existingAdmin.length > 0) {
      console.log("✓ Test admin account already exists:", testAdminEmail);
      
      // Update to ensure it's an admin
      await db
        .update(users)
        .set({ isAdmin: true })
        .where(eq(users.email, testAdminEmail));
      
      console.log("✓ Verified admin status");
      return;
    }

    // Create new admin account
    const passwordHash = await bcrypt.hash(testAdminPassword, 10);
    const userId = `test-admin-${Date.now()}`;

    await db.insert(users).values({
      id: userId,
      email: testAdminEmail,
      passwordHash,
      firstName: "Test",
      lastName: "Admin",
      emailVerified: true,
      isAdmin: true,
      role: "admin",
    });

    console.log("✓ Test admin account created successfully!");
    console.log("  Email:", testAdminEmail);
    console.log("  Password:", testAdminPassword);
    console.log("\nYou can now log in to test admin features.");
  } catch (error) {
    console.error("Error setting up test admin:", error);
    process.exit(1);
  }

  process.exit(0);
}

setupTestAdmin();
