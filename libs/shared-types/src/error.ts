import { z } from "zod";

export const ZApiError = z.object({
    response: z
        .object({
            data: z
                .object({
                    message: z.string().optional(),
                })
                .optional(),
        })
        .optional(),
    message: z.string().optional(),
});

export type ApiError = z.infer<typeof ZApiError>;
