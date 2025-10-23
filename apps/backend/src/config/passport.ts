import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { User } from "../models/user.model";
import { generateTokens } from "../controllers/auth.controller";
import { UserType } from "@expense-tracker/shared-types/src";

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
			secretOrKey: process.env.JWT_SECRET || "your-secret-key",
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
			callbackURL: "http://localhost:8000/api/auth/google/callback",
		},
		async (_accessToken: string, _refreshToken: string, profile: any, done: any) => {
			try {
				const user = await User.findOne({
					googleId: profile.id,
					/* email: profile.emails[0].value,
          password: bcrypt.hashSync(profile.id, 10), */
				});
				if (user) {
					//console.log("User found");
					const userDoc = user as UserType;
					const { accessToken: access, refreshToken: refresh } = generateTokens(userDoc);
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
						password: bcrypt.hashSync(profile.id, 10),
						name: profile.displayName,
						profilePicture: profile.photos[0].value,
					});
					const newUserDoc = newUser as UserType;
					const { accessToken: access, refreshToken: refresh } = generateTokens(newUserDoc);
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
