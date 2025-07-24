import { Request, Response } from "express";
import Currency from "../models/currency.model";
import axios from "axios";

export const initCurrencies = async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`https://api.fxratesapi.com/currencies`);
    const data: any = response.data;
    const currencies = Object.entries(data).map(([code, name]) => ({
      code,
      name: data[code].name,
    }));
    //console.log(currencies);

    if ((await Currency.countDocuments()) === 0) {
      await Currency.insertMany(currencies);
      res.status(200).json({ message: "Currencies initialized" });
    } else {
      res.status(200).json({ message: "Currencies already initialized" });
    }
  } catch (error) {
    res.status(500).json({ message: "Failed to initialize currencies" });
  }
};

export const getExchangeRate = async (req: Request, res: Response) => {
  try {
    const { from, to, date } = req.query;

    if (!from || !to) {
      return res.status(400).json({
        message: "From currency, to currency, and date are required",
      });
    }

    const response = await axios.get(
      `https://api.fxratesapi.com/convert?from=${from}&to=${to}&date=${date}&amount=1`
    );

    res.status(200).json({
      success: true,
      rate: response.data.info.rate,
      data: response.data,
    });
  } catch (error: any) {
    console.error("Exchange rate error:", error);
    res.status(500).json({
      message: "Failed to fetch exchange rate. Please try again.",
    });
  }
};
