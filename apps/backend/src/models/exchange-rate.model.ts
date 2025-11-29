import mongoose from "mongoose";

const exchangeRateSchema = new mongoose.Schema(
	{
		sourceCurrency: {
			type: String,
			required: true,
		},
		targetCurrency: {
			type: String,
			required: true,
		},
		exchangeRate: {
			type: Number,
			required: true,
		},
		date: {
			type: Date,
			required: true,
		},
	},
	{
		versionKey: false,
	}
);

const ExchangeRate = mongoose.model("ExchangeRate", exchangeRateSchema, "exchangerate");

export default ExchangeRate;
