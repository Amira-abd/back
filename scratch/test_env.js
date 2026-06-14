import dotenv from 'dotenv';
import path from 'path';
import connectDB from './src/config/db.js';
import User from './src/models/User.js';
import Verification from './src/models/userVerification.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

console.log("Starting backend dry-run test...");

try {
  console.log("Checking model imports...");
  console.log("User model:", typeof User);
  console.log("Verification model:", typeof Verification);
  
  console.log("Importing userController...");
  const userController = await import('./src/controllers/userController.js');
  console.log("userController methods:", Object.keys(userController));

  console.log("Importing authController...");
  const authController = await import('./src/controllers/authController.js');
  console.log("authController methods:", Object.keys(authController));

  console.log("Dry run imports successful! Connecting to DB to test query...");
  
  await connectDB();
  console.log("Connected! Finding one user...");
  const user = await User.findOne({});
  console.log("User found:", user ? user.email : "No users in database");
  
  console.log("Dry-run test finished successfully! No runtime import errors.");
  process.exit(0);
} catch (err) {
  console.error("❌ Dry-run test failed with error:", err);
  process.exit(1);
}
