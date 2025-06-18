import { RequestHandler, Router } from "express";
import { login, register, logout } from "../controllers/auth.controller";

const router = Router();

router.post("/register", register as RequestHandler);
router.post("/login", login as RequestHandler);
router.post("/logout", logout as RequestHandler);
router.get("/", (req, res) => {
  res.json({ message: "Hello World" });
});

export default router;
