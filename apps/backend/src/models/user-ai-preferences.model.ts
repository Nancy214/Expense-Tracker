import mongoose, { Schema } from "mongoose";

const UserAIPreferencesSchema = new Schema(
	{
		userId: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
			unique: true,
		},
		enabled: {
			type: Boolean,
			default: false,
		},
		privacyConsent: {
			type: Boolean,
			default: false,
		},
		consentDate: {
			type: Date,
		},
		dailyMessageLimit: {
			type: Number,
			default: 50,
		},
		messagesUsedToday: {
			type: Number,
			default: 0,
		},
		lastResetDate: {
			type: Date,
			default: Date.now,
		},
	},
	{
		versionKey: false,
	}
);

// Virtual id
UserAIPreferencesSchema.virtual("id").get(function (this: any) {
	return this._id?.toString();
});

export const UserAIPreferences = mongoose.model("UserAIPreferences", UserAIPreferencesSchema);
