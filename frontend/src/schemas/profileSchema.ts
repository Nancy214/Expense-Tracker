import { z } from "zod";

// Profile schema
export const profileSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    profilePicture: z.union([z.instanceof(File), z.string()]).optional(),
    phoneNumber: z.string().optional(),
    dateOfBirth: z.string().optional(),
    currency: z.string().min(1, "Currency is required"),
    country: z.string().min(1, "Country is required"),
});

// Type inference
export type ProfileFormData = z.infer<typeof profileSchema>;

// Helper functions
export const validateProfilePicture = (file: File): boolean => {
    const validFileTypes = ["image/jpeg", "image/png", "image/jpg"];
    return validFileTypes.includes(file.type);
};
