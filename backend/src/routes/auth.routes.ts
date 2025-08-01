import { RequestHandler, Router } from "express";
import passport from "../config/passport";
import { authenticateToken } from "../middleware/auth.middleware";
import {
    login,
    register,
    logout,
    googleAuthCallback,
    forgotPassword,
    resetPassword,
    changePassword,
} from "../controllers/auth.controller";
import { upload } from "../config/multer";

const router = Router();

// Google OAuth routes
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get(
    "/google/callback",
    passport.authenticate("google", {
        failureRedirect: "/login",
    }),
    googleAuthCallback as RequestHandler
);

router.post("/register", upload.single("profilePicture"), register as RequestHandler);
router.post("/login", login as RequestHandler);
router.post("/logout", logout as RequestHandler);
router.post("/forgot-password", forgotPassword as RequestHandler);
router.post("/reset-password", resetPassword as RequestHandler);
router.put("/change-password", authenticateToken as RequestHandler, changePassword as RequestHandler);
router.get(
    "/profile",
    authenticateToken as RequestHandler,
    ((req, res) => {
        res.json({ message: "Hello World", user: req.user });
    }) as RequestHandler
);

export default router;
