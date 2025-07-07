import { RequestHandler, Router } from "express";
import {
  getExchangeRate,
  initCurrencies,
} from "../controllers/currency.controller";

const router = Router();

router.post("/init", initCurrencies);
router.get("/exchange-rate", getExchangeRate as RequestHandler);

export default router;
