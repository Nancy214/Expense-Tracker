import {
  NextFunction,
  RequestHandler,
  Router,
  Request,
  Response,
} from "express";
import {
  login,
  register,
  logout,
  googleAuthCallback,
} from "../controllers/auth.controller";
import passport from "../config/passport";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();

// Google OAuth routes
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login",
  }),
  googleAuthCallback as RequestHandler
);

router.post("/register", register as RequestHandler);
router.post("/login", login as RequestHandler);
router.post("/logout", logout as RequestHandler);
router.get(
  "/myprofile",
  authenticateToken as RequestHandler,
  ((req, res) => {
    res.json({ message: "Hello World", user: req.user });
  }) as RequestHandler
);

export default router;
