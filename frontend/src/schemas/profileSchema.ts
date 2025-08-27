import { z } from "zod";

// Profile schema
export const profileSchema = z.object({
    name: z.string().optional(),
    email: z.string().email("Invalid email address").optional(),
    profilePicture: z.union([z.instanceof(File), z.string()]).optional(),
    phoneNumber: z.string().optional(),
    dateOfBirth: z.string().optional(),
    currency: z.string().optional(),
    country: z.string().optional(),
});

// Type inference
export type ProfileFormData = z.infer<typeof profileSchema>;

// Helper functions
export const validateProfilePicture = (file: File): boolean => {
    const validFileTypes = ["image/jpeg", "image/png", "image/jpg"];
    return validFileTypes.includes(file.type);
};
