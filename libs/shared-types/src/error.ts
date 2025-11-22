import { z } from "zod";

export const ZApiError = z.object({
	success: z.boolean(),
	message: z.string().optional(),
});

export type ApiError = z.infer<typeof ZApiError>;
