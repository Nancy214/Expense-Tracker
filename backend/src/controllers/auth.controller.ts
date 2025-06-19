import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import passport from "passport";
import { User } from "../models/user.model";
import {
  AuthResponse,
  UserGoogleType,
  UserLocalType,
  UserType,
} from "../types/auth";

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
    const { email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log("User already exists");
      return res.status(400).json({ message: "User already exists" });
    }

    // Create new user
    const user = new User({ email, password });
    await user.save();

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Save refresh token
    //user.refreshToken = refreshToken;
    //await user.save();

    res.status(201).json({
      accessToken,
      refreshToken,
    });
  } catch (error) {
    res.status(500).json({ message: "Error registering user" });
  }
};

export const login = (req: Request, res: Response, next: any) => {
  passport.authenticate(
    "local",
    { session: false },
    (err: Error, user: UserLocalType | UserGoogleType, info: Error) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info.message });
      }

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user);

      // Save refresh token
      //user.refreshToken = refreshToken;
      //user.save();

      res.status(200).json({
        user,
        accessToken,
        refreshToken,
      });
    }
  )(req, res, next);
};

export const googleAuthCallback = async (req: Request, res: Response) => {
  const user = req.user as any;
  // Redirect to frontend with tokens as URL parameters
  const tokens = encodeURIComponent(
    JSON.stringify({
      accessToken: user.accessToken,
      refreshToken: user.refreshToken,
      user: user,
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
