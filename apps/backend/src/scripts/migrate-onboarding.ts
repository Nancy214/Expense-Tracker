/**
 * Migration script to set hasCompletedOnboarding: true for all existing users
 * This ensures existing users are not forced through onboarding
 *
 * Run this script once after deploying the onboarding feature:
 * npx ts-node src/scripts/migrate-onboarding.ts
 */

import mongoose from "mongoose";
import { User } from "../models/user.model";
import dotenv from "dotenv";

dotenv.config();

const migrateExistingUsers = async () => {
	try {
		// Connect to MongoDB
		await mongoose.connect(
			process.env.MONGODB_URI ||
				(() => {
					throw new Error("MONGODB_URI environment variable is required");
				})()
		);

		console.log("Connected to MongoDB");

		// Update all existing users to have hasCompletedOnboarding: true
		const result = await User.updateMany(
			{
				hasCompletedOnboarding: { $exists: false }, // Only update users without this field
			},
			{
				$set: {
					hasCompletedOnboarding: true,
					onboardingCompletedAt: new Date(),
				},
			}
		);

		console.log(`Migration completed successfully!`);
		console.log(`Updated ${result.modifiedCount} existing users`);
		console.log(`All existing users will bypass onboarding and go directly to dashboard`);

		// Close connection
		await mongoose.connection.close();
		console.log("Database connection closed");
	} catch (error) {
		console.error("Migration failed:", error);
		process.exit(1);
	}
};

// Run migration
migrateExistingUsers();
