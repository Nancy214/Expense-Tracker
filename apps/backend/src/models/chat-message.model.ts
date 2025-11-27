import mongoose, { Schema } from "mongoose";

const ChatMessageSchema = new Schema(
	{
		userId: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
			index: true,
		},
		role: {
			type: String,
			enum: ["user", "assistant", "system"],
			required: true,
		},
		content: {
			type: String,
			required: true,
		},
		timestamp: {
			type: Date,
			default: Date.now,
			index: true,
		},
		metadata: {
			model: {
				type: String,
			},
			tokensUsed: {
				type: Number,
			},
			responseTime: {
				type: Number,
			},
			promptTokens: {
				type: Number,
			},
			completionTokens: {
				type: Number,
			},
		},
	},
	{
		versionKey: false,
	}
);

// Compound index for efficient queries by user and time
ChatMessageSchema.index({ userId: 1, timestamp: -1 });

// Virtual id
ChatMessageSchema.virtual("id").get(function (this: any) {
	return this._id?.toString();
});

export const ChatMessage = mongoose.model("ChatMessage", ChatMessageSchema);
