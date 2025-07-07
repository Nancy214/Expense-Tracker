import axios from "axios";

const API_URL = "http://localhost:8000/api";

const currencyApi = axios.create({
  baseURL: API_URL,
});

currencyApi.interceptors.request.use(
  (config: any) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: any) => {
    return Promise.reject(error);
  }
);

export const getExchangeRate = async (
  from: string,
  to: string,
  date: string
): Promise<{ rate: number; data: any }> => {
  try {
    const response = await currencyApi.get("/currency/exchange-rate", {
      params: { from, to, date },
    });
    return response.data;
  } catch (error: any) {
    console.error("Get exchange rate error:", error);
    throw error;
  }
};
