import passport from "../config/passport";
import { Router } from "express";

const otherAuthRoutes = Router();

otherAuthRoutes.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
otherAuthRoutes.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    res.json({
      message: "Hello World",
      isAuthenticated: req.isAuthenticated(),
    });
  }
);

export default otherAuthRoutes;
