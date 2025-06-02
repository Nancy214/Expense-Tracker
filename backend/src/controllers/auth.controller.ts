import { RequestHandler, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model";
import { UserType } from "../types/auth";
import { LoginRequest } from "../types/auth";

// Generate Tokens
const generateAccessToken = (user: UserType): string => {
  return jwt.sign(
    { id: user._id, email: user.email },
    process.env.ACCESS_TOKEN_SECRET || "",
    {
      expiresIn: "15m",
    }
  );
};

const generateRefreshToken = (user: UserType): string => {
  return jwt.sign(
    { id: user._id, email: user.email },
    process.env.REFRESH_TOKEN_SECRET || ""
  );
};

export const register: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as LoginRequest;

    // Check if user exists
    const existingUser = (await User.findOne({ email })) as UserType | null;
    if (existingUser) {
      res.status(400).json({ message: "User already exists" });
      return;
    }

    // Hash password
    const hashedPassword: string = await bcrypt.hash(password, 10);

    // Create new user
    const user: UserType = new User({
      email,
      password: hashedPassword,
    });

    await user.save();

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token
    user.refreshToken = refreshToken;
    await user.save();

    res.status(201).json({ accessToken, refreshToken });
  } catch (error) {
    res.status(500).json({
      message: "Error creating user",
      error: (error as Error).message,
    });
  }
};

export const login: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as LoginRequest;

    // Find user
    const user = (await User.findOne({ email })) as UserType | null;
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      res.status(401).json({ message: "Invalid password" });
      return;
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token
    user.refreshToken = refreshToken;
    await user.save();

    res.json({ accessToken, refreshToken });
  } catch (error) {
    res.status(500).json({
      message: "Error logging in",
      error: (error as Error).message,
    });
  }
};
