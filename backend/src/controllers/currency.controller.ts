import { Request, Response } from "express";
import Currency from "../models/currency.model";
import axios from "axios";

export const initCurrencies = async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`https://api.fxratesapi.com/currencies`);
    const data: any = response.data;
    console.log(typeof data);
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
