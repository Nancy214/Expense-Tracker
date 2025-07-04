import { Router } from "express";
import { initCurrencies } from "../controllers/currency.controller";

const router = Router();

router.post("/init", initCurrencies);

export default router;
