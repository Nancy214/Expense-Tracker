import { type RequestHandler, Router } from "express";
import { getExchangeRate } from "../controllers/currency.controller";

const router = Router();

router.get("/exchange-rate", getExchangeRate as RequestHandler);

export default router;
