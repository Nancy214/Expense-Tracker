import mongoose from "mongoose";

const countryTimezoneCurrencySchema = new mongoose.Schema({
    country: { type: String, required: true },
    currency: { type: Object, required: true },
    timezones: { type: [String] },
    language: { type: [String] },
    dateFormat: { type: String },
    timeFormat: { type: String },
});

const CountryTimezoneCurrency = mongoose.model(
    "CountryTimezoneCurrency",
    countryTimezoneCurrencySchema,
    "countrytimezonecurrencys"
);

export default CountryTimezoneCurrency;
