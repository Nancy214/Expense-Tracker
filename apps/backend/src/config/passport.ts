import type { UserType } from "@expense-tracker/shared-types";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { ExtractJwt, Strategy as JwtStrategy } from "passport-jwt";
import { Strategy as LocalStrategy } from "passport-local";
import { User } from "../models/user.model";
import { AuthDAO } from "../daos/auth.dao";
import crypto from "crypto";

dotenv.config();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// Local Strategy for username/password login
passport.use(
	new LocalStrategy(
		{
			usernameField: "email",
			passwordField: "password",
		},
		async (email, password, done) => {
			try {
				const user = await User.findOne({ email });
				if (!user) {
					return done(null, false, { message: "Incorrect email." });
				}

				const isValid = await bcrypt.compare(password, user.password);
				if (!isValid) {
					return done(null, false, {
						message: "Incorrect password.",
					});
				}

				return done(null, user);
			} catch (error) {
				return done(error);
			}
		}
	)
);

// JWT Strategy for access token verification
passport.use(
	new JwtStrategy(
		{
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			secretOrKey:
				process.env.JWT_SECRET ||
				(() => {
					throw new Error("JWT_SECRET environment variable is required");
				})(),
		},
		async (jwtPayload, done) => {
			try {
				const user = await User.findById(jwtPayload.id);
				if (!user) {
					return done(null, false);
				}
				return done(null, user);
			} catch (error) {
				return done(error, false);
			}
		}
	)
);

// Google Strategy
passport.use(
	new GoogleStrategy(
		{
			clientID: GOOGLE_CLIENT_ID || "",
			clientSecret: GOOGLE_CLIENT_SECRET || "",
			callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:8000/api/auth/google/callback",
		},
		async (_accessToken: string, _refreshToken: string, profile: any, done: any) => {
			try {
				const user = await User.findOne({
					googleId: profile.id,
				});
				if (user) {
					const userDoc = user as UserType;
					const { accessToken: access, refreshToken: refresh } = AuthDAO.generateToken(userDoc, "auth") as {
						accessToken: string;
						refreshToken: string;
					};
					const userWithTokens = {
						...user.toJSON(),
						accessToken: access,
						refreshToken: refresh,
					};
					return done(null, userWithTokens);
				} else {
					const newUser = new User({
						googleId: profile.id,
						email: profile.emails[0].value,
						password: bcrypt.hashSync(crypto.randomBytes(32).toString("hex"), 10),
						name: profile.displayName,
						profilePicture: profile.photos[0].value,
					});
					const newUserDoc = newUser as UserType;
					const { accessToken: access, refreshToken: refresh } = AuthDAO.generateToken(newUserDoc, "auth") as { accessToken: string; refreshToken: string };
					const userWithTokens = {
						...newUser.toJSON(),
						accessToken: access,
						refreshToken: refresh,
					};
					await newUser.save();
					return done(null, userWithTokens);
				}
			} catch (err) {
				return done(err);
			}
		}
	)
);

// Serialize user for session
passport.serializeUser((user: any, done) => {
	done(null, user._id || user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
	try {
		const user = await User.findById(id);
		done(null, user);
	} catch (err) {
		done(err);
	}
});

export default passport;
