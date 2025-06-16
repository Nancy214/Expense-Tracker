import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import passport from "passport";
import { User } from "../models/user.model";
import { AuthRequest, AuthResponse } from "../types/auth";
import bcrypt from "bcrypt";

// Generate tokens
const generateTokens = (user: any): AuthResponse => {
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

  return {
    accessToken: `Bearer ${accessToken}`,
    refreshToken: `Bearer ${refreshToken}`,
  };
};

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Create new user
    const user = new User({ email, password: await bcrypt.hash(password, 10) });
    await user.save();

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Save refresh token
    //user.refreshToken = refreshToken;
    //await user.save();

    res.status(201).json({
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        //email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Error registering user" });
  }
};

export const login = (req: AuthRequest, res: Response, next: any) => {
  passport.authenticate(
    "local",
    { successRedirect: "/", failureRedirect: "/login", session: false },
    (err: any, user: any, info: any) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info.message });
      }

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user);

      // Save refresh token
      user.refreshToken = refreshToken;
      //user.save();

      res.json({
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          //email: user.email,
        },
      });
    }
  )(req, res, next);
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
    const { refreshToken } = req.body;
    const user = await User.findOne({ refreshToken });

    if (user) {
      ///user.refreshToken = undefined;
      //await user.save();
      localStorage.removeItem("refreshToken");
    }

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error logging out" });
  }
};
