import { Request, Response } from "express";
import { Settings, User } from "../models/user.model";
//import { uploadToS3 } from "../middleware/upload";
import { AuthRequest, TokenPayload } from "../types/auth";
import dotenv from "dotenv";
import { s3Client } from "../config/s3Client";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import bcrypt from "bcrypt";

dotenv.config();
const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME || "";
const AWS_REGION = process.env.AWS_REGION || "";

export const getProfile = async (req: Request, res: Response) => {
  try {
    const user = req.user as TokenPayload;
    const userId = user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const userDoc = await User.findById(userId).select("-password");
    if (!userDoc) {
      return res.status(404).json({ message: "User not found" });
    }

    const settingsDoc = await Settings.findById(userId);
    if (!settingsDoc) {
      return res.status(404).json({ message: "Settings not found" });
    }

    res.json({
      success: true,
      user: {
        _id: userDoc._id,
        name: userDoc.name,
        email: userDoc.email,
        profilePicture: userDoc.profilePicture,
        phoneNumber: userDoc.phoneNumber,
        dateOfBirth: userDoc.dateOfBirth,
        currency: userDoc.currency,
        budget: userDoc.budget,
        budgetType: userDoc.budgetType,
        settings: settingsDoc,
      },
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const user = req.user as TokenPayload;
    const userId = user?.id;
    let profilePictureName = "";

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const { name, email, phoneNumber, dateOfBirth, currency } = req.body;

    // Check if email is being changed and if it's already taken
    if (email) {
      const existingUser = await User.findOne({ email, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;
    if (currency !== undefined) updateData.currency = currency;

    if (req.file) {
      profilePictureName = bcrypt.hashSync(req.file.originalname, 10);
      const uploadCommand = new PutObjectCommand({
        Bucket: AWS_BUCKET_NAME,
        Key: profilePictureName,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      });

      await s3Client.send(uploadCommand);
      //console.log(response);
    }

    /* const settingsDoc = await Settings.findById(userId);
    if (!settingsDoc) {
      return res.status(404).json({ message: "Settings not found" });
    } */

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        profilePicture: profilePictureName,
        phoneNumber: updatedUser.phoneNumber,
        dateOfBirth: updatedUser.dateOfBirth,
        currency: updatedUser.currency,
        budget: updatedUser.budget,
        budgetType: updatedUser.budgetType,
        //settings: settingsDoc,
      },
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  try {
    const user = req.user as TokenPayload;
    const userId = user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const {
      emailNotifications,
      pushNotifications,
      monthlyReports,
      budgetAlerts,
      expenseReminders,
    } = req.body;

    const settingsData: any = {};
    if (emailNotifications !== undefined)
      settingsData.emailNotifications = emailNotifications;
    if (pushNotifications !== undefined)
      settingsData.pushNotifications = pushNotifications;
    if (monthlyReports !== undefined)
      settingsData.monthlyReports = monthlyReports;
    if (budgetAlerts !== undefined) settingsData.budgetAlerts = budgetAlerts;
    if (expenseReminders !== undefined)
      settingsData.expenseReminders = expenseReminders;

    // Use findByIdAndUpdate with upsert to create if doesn't exist, update if exists
    const settingsDoc = await Settings.findByIdAndUpdate(
      userId,
      { ...settingsData },
      {
        new: true,
        runValidators: true,
        upsert: true, // Create if doesn't exist
        setDefaultsOnInsert: true, // Apply schema defaults when creating
      }
    );

    res.json({
      success: true,
      message: "Settings updated successfully",
      settings: settingsDoc,
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getSettings = async (req: Request, res: Response) => {
  try {
    const user = req.user as TokenPayload;
    const userId = user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const settingsDoc = await Settings.findById(userId);
    if (!settingsDoc) {
      // Return default settings structure without creating in database
      const defaultSettings = {
        userId,
        emailNotifications: false,
        pushNotifications: false,
        monthlyReports: false,
        budgetAlerts: false,
        expenseReminders: false,
      };
      return res.json({ success: true, settings: defaultSettings });
    }

    res.json({ success: true, settings: settingsDoc });
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
