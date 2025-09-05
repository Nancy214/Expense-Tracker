import { z } from "zod";

// Constants for validation
const VALID_FILE_TYPES = ["image/jpeg", "image/png", "image/jpg", "image/webp"] as const;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 255;
const MAX_PHONE_LENGTH = 20;

// Common validation patterns
const emailValidation = z
    .string()
    .min(1, "Email is required")
    .email("Invalid email address")
    .max(MAX_EMAIL_LENGTH, `Email must be less than ${MAX_EMAIL_LENGTH} characters`)
    .toLowerCase()
    .trim();

const nameValidation = z
    .string()
    .min(1, "Name is required")
    .max(MAX_NAME_LENGTH, `Name must be less than ${MAX_NAME_LENGTH} characters`)
    .regex(/^[a-zA-Z\s'-]+$/, "Name can only contain letters, spaces, hyphens, and apostrophes")
    .trim();

const phoneValidation = z
    .string()
    .max(MAX_PHONE_LENGTH, `Phone number must be less than ${MAX_PHONE_LENGTH} characters`)
    .regex(/^[\+]?[1-9][\d]{0,15}$/, "Please enter a valid phone number")
    .optional();

const dateOfBirthValidation = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .refine((date) => {
        const birthDate = new Date(date);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            return age - 1 >= 13; // Must be at least 13 years old
        }
        return age >= 13;
    }, "You must be at least 13 years old")
    .refine((date) => {
        const birthDate = new Date(date);
        const today = new Date();
        return birthDate <= today;
    }, "Birth date cannot be in the future")
    .optional();

const profilePictureValidation = z
    .union([
        z
            .instanceof(File)
            .refine(
                (file) => file.size <= MAX_FILE_SIZE,
                `File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`
            )
            .refine(
                (file) => VALID_FILE_TYPES.includes(file.type as any),
                `File type must be one of: ${VALID_FILE_TYPES.join(", ")}`
            ),
        z.string().url("Profile picture must be a valid URL").optional(),
    ])
    .optional();

const currencyValidation = z
    .string()
    .min(3, "Currency code must be at least 3 characters")
    .max(3, "Currency code must be exactly 3 characters")
    .regex(/^[A-Z]{3}$/, "Currency code must be 3 uppercase letters")
    .optional();

const countryValidation = z
    .string()
    .min(1, "Country is required")
    .max(100, "Country name must be less than 100 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "Country name can only contain letters, spaces, hyphens, and apostrophes")
    .optional();

const timezoneValidation = z
    .string()
    .min(1, "Timezone is required")
    .regex(/^[a-zA-Z_]+\/[a-zA-Z_]+$/, "Timezone must be in format 'Region/City'")
    .optional();

// Enhanced profile schema with comprehensive validation
export const profileSchema = z.object({
    name: nameValidation.optional(),
    email: emailValidation.optional(),
    profilePicture: profilePictureValidation,
    phoneNumber: phoneValidation,
    dateOfBirth: dateOfBirthValidation,
    currency: currencyValidation,
    country: countryValidation,
    timezone: timezoneValidation,
});

// Type inference from schema
export type ProfileFormData = z.infer<typeof profileSchema>;

// Extended profile form data type for API submission
export interface ProfileSubmissionData extends ProfileFormData {
    userId?: string; // Optional since it will be added by the service
}

// Profile form state type for component state management
export interface ProfileFormState {
    name: string;
    email: string;
    profilePicture: File | string | null;
    phoneNumber: string;
    dateOfBirth: string;
    currency: string;
    country: string;
    timezone: string;
    isSubmitting: boolean;
    errors: Partial<Record<keyof ProfileFormData, string>>;
}

// Profile form handlers type
export interface ProfileFormHandlers {
    handleNameChange: (name: string) => void;
    handleEmailChange: (email: string) => void;
    handleProfilePictureChange: (file: File | string | null) => void;
    handlePhoneNumberChange: (phoneNumber: string) => void;
    handleDateOfBirthChange: (dateOfBirth: string) => void;
    handleCurrencyChange: (currency: string) => void;
    handleCountryChange: (country: string) => void;
    handleTimezoneChange: (timezone: string) => void;
    handleSubmit: (data: ProfileFormData) => Promise<void>;
    resetForm: () => void;
}

// Validation result types
export type ProfileValidationResult = z.ZodSafeParseSuccess<ProfileFormData> | z.ZodSafeParseError<ProfileFormData>;

// Error types for better error handling
export type ProfileValidationError = {
    field: string;
    message: string;
};

export type ProfileFormErrors = {
    [key in keyof ProfileFormData]?: string;
};

// Utility type for form field names
export type ProfileFieldNames = keyof ProfileFormData;

// Helper functions
export const validateProfilePicture = (file: File): boolean => {
    return file.size <= MAX_FILE_SIZE && VALID_FILE_TYPES.includes(file.type as any);
};

export const validatePhoneNumber = (phone: string): boolean => {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone) && phone.length <= MAX_PHONE_LENGTH;
};

export const validateDateOfBirth = (date: string): boolean => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) return false;

    const birthDate = new Date(date);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) ? age - 1 : age;

    return actualAge >= 13 && birthDate <= today;
};

export const validateCurrencyCode = (currency: string): boolean => {
    return /^[A-Z]{3}$/.test(currency);
};

export const validateTimezone = (timezone: string): boolean => {
    return /^[a-zA-Z_]+\/[a-zA-Z_]+$/.test(timezone);
};

// Default values with proper typing
export const getDefaultProfileValues = (): ProfileFormData => ({
    name: "",
    email: "",
    profilePicture: undefined,
    phoneNumber: "",
    dateOfBirth: "",
    currency: "",
    country: "",
    timezone: "",
});

// Profile constants export for reuse across components
export const PROFILE_CONSTANTS = {
    VALID_FILE_TYPES,
    MAX_FILE_SIZE,
    MAX_NAME_LENGTH,
    MAX_EMAIL_LENGTH,
    MAX_PHONE_LENGTH,
    MIN_AGE: 13,
    DATE_FORMAT: "YYYY-MM-DD",
} as const;
