import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import passport from "passport";
import axios from "axios";
import { User } from "../models/user.model";
import {
  AuthResponse,
  UserGoogleType,
  UserLocalType,
  UserType,
} from "../types/auth";
import bcrypt from "bcrypt";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import { s3Client } from "../config/s3Client";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import sgMail from "@sendgrid/mail";

dotenv.config();
const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME || "";
const AWS_REGION = process.env.AWS_REGION || "";

// Generate tokens
export const generateTokens = (user: any) => {
  const accessToken = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET || "your-secret-key",
    { expiresIn: "15m" }
  );

  const refreshToken = jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key",
    { expiresIn: "7d" }
  );

  return { accessToken, refreshToken };
};

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    let profilePictureName = "";

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log("User already exists");
      return res.status(400).json({ message: "User already exists" });
    }
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
    //console.log(profilePictureUrl);

    const user = new User({
      email,
      password: bcrypt.hashSync(password, 10),
      name,
      profilePicture: profilePictureName,
    });
    //console.log(user);

    await user.save();

    // Generate tokens
    //const { accessToken, refreshToken } = generateTokens(user);

    // Save refresh token
    //user.refreshToken = refreshToken;
    //await user.save();

    res.status(200).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ message: error });
  }
};

export const login = (req: Request, res: Response, next: any) => {
  passport.authenticate(
    "local",
    { session: false },
    async (err: Error, user: UserLocalType | UserGoogleType, info: Error) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info.message });
      }

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user);

      let profilePictureUrl = "";
      if (user.profilePicture) {
        const getCommand = new GetObjectCommand({
          Bucket: AWS_BUCKET_NAME,
          Key: user.profilePicture,
        });
        profilePictureUrl = await getSignedUrl(s3Client, getCommand, {
          expiresIn: 30,
        });
      }

      // Save refresh token
      //user.refreshToken = refreshToken;
      //user.save();

      res.status(200).json({
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          email: user.email,
          name: user.name || "",
          profilePicture: profilePictureUrl,
        },
      });
    }
  )(req, res, next);
};

export const googleAuthCallback = async (req: Request, res: Response) => {
  const user = req.user as any;
  // Redirect to frontend with tokens as URL parameters
  const tokens = encodeURIComponent(
    JSON.stringify({
      accessToken: user?.accessToken,
      refreshToken: user?.refreshToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name || "",
        profilePicture: user.profilePicture || "",
      },
    })
  );
  res.redirect(`http://localhost:3000/auth/google/callback?tokens=${tokens}`);
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token required" });
    }

    // Verify refresh token
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key"
    ) as { id: string };

    // Find user
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    // Generate new tokens
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      generateTokens(user);

    // Update refresh token
    //user.refreshToken = newRefreshToken;
    //await user.save();

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    res.status(401).json({ message: "Invalid refresh token" });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    // Clear any auth cookies
    res.clearCookie("connect.sid"); // Clear session cookie
    res.clearCookie("accessToken"); // Clear JWT token if using cookies

    // Only try session operations if session exists
    if (req.session) {
      // Try to destroy session first
      req.session.destroy((err) => {
        if (err) {
          console.error("Error destroying session:", err);
        }
      });
    }

    // Try Passport logout if available and session exists
    if (req.logout && req.session) {
      req.logout((err) => {
        if (err) {
          console.error("Error during Passport logout:", err);
        }
      });
    }

    // Send success response
    res.status(200).json({
      success: true,
      message: "Successfully logged out",
    });
  } catch (error) {
    console.error("Logout error:", error);
    // Even if there's an error, we still want to send a success response
    // since the client will clear tokens anyway
    res.status(200).json({
      success: true,
      message: "Successfully logged out",
    });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    // Check if user exists in our database
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        message: "No account found with this email address.",
      });
    }

    // Generate a stateless reset token with user info embedded
    const resetToken = jwt.sign(
      {
        id: user._id,
        email: user.email,
        type: "password_reset",
        timestamp: Date.now(),
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "10m" }
    );

    // Create the reset URL
    const resetUrl = `${
      process.env.FRONTEND_URL || "http://localhost:3000"
    }/reset-password?token=${resetToken}`;

    // Send email using SendGrid
    // const sgMail = require("@sendgrid/mail");
    sgMail.setApiKey(process.env.SENDGRID_API_KEY || "");

    const msg = {
      to: email,
      from: "nancypro2000@gmail.com", //process.env.SENDGRID_FROM_EMAIL || "noreply@yourapp.com",
      subject: "Password Reset Request",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>Hello ${user.name || "there"},</p>
          <p>You requested a password reset for your account. Click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <p>This link will expire in 10 minutes.</p>
          <p>If you didn't request this password reset, please ignore this email.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            This is an automated email. Please do not reply to this message.
          </p>
        </div>
      `,
    };

    await sgMail.send(msg);

    res.status(200).json({
      message:
        "Password reset email sent successfully. Please check your email.",
    });
  } catch (error: any) {
    console.error("Error sending reset email:", error);

    res.status(500).json({
      message: "Failed to send reset email. Please try again later.",
    });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;
  console.log(token, newPassword);

  if (!token || !newPassword) {
    return res.status(400).json({
      message: "Token and new password are required",
    });
  }

  try {
    // Verify the reset token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    ) as {
      id: string;
      email: string;
      type: string;
      timestamp: number;
    };
    console.log(decoded);
    // Verify it's a password reset token
    if (decoded.type !== "password_reset") {
      return res.status(400).json({
        message: "Invalid token type",
      });
    }

    // Check if token is not too old (additional security)
    const tokenAge = Date.now() - decoded.timestamp;
    const maxAge = 600000; // 10 minutes in milliseconds (matching JWT expiration)
    if (tokenAge > maxAge) {
      return res.status(400).json({
        message: "Reset token has expired",
      });
    }

    // Find user by ID and email
    const user = await User.findOne({
      _id: decoded.id,
      email: decoded.email,
    });

    if (!user) {
      return res.status(400).json({
        message: "User not found",
      });
    }

    // Hash the new password
    const hashedPassword = bcrypt.hashSync(newPassword, 10);

    // Update user's password using findOneAndUpdate to avoid validation issues
    const updatedUser = await User.findOneAndUpdate(
      { _id: decoded.id },
      { password: hashedPassword },
      { new: true, runValidators: false }
    );

    if (!updatedUser) {
      return res.status(500).json({
        message: "Failed to update password",
      });
    }

    res.status(200).json({
      message: "Password reset successfully",
    });
  } catch (error: any) {
    console.error("Password reset error:", error);

    if (error.name === "JsonWebTokenError") {
      return res.status(400).json({
        message: "Invalid reset token",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(400).json({
        message: "Reset token has expired",
      });
    }

    res.status(500).json({
      message: "Failed to reset password. Please try again.",
    });
  }
};
