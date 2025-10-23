import { z } from "zod";

const VALID_FILE_TYPES = ["image/jpeg", "image/png", "image/jpg", "image/webp"] as const;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 255;
const MAX_PHONE_LENGTH = 20;

export const ZProfileData = z.object({
	name: z
		.string()
		.min(1, "Name is required")
		.max(MAX_NAME_LENGTH, `Name must be less than ${MAX_NAME_LENGTH} characters`)
		.regex(/^[a-zA-Z\s'-]+$/, "Name can only contain letters, spaces, hyphens, and apostrophes")
		.trim(),
	email: z
		.email("Invalid email address")
		.max(MAX_EMAIL_LENGTH, `Email must be less than ${MAX_EMAIL_LENGTH} characters`)
		.toLowerCase()
		.trim(),
	phoneNumber: z
		.string()
		.max(MAX_PHONE_LENGTH, `Phone number must be less than ${MAX_PHONE_LENGTH} characters`)
		.regex(/^[+]?[0-9][\d]{0,15}$/, "Please enter a valid phone number")
		.optional(),
	dateOfBirth: z
		.string()
		.min(1, "Birth date is required")
		.regex(/^\d{1,2}\/\d{1,2}\/\d{4}$/, "Date must be in DD/MM/YYYY format")
		.refine((date) => {
			// Parse DD/MM/YYYY format correctly
			const [day, month, year] = date.split("/").map(Number);
			const birthDate = new Date(year, month - 1, day); // month is 0-indexed
			const today = new Date();
			const age = today.getFullYear() - birthDate.getFullYear();
			const monthDiff = today.getMonth() - birthDate.getMonth();

			if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
				return age - 1 >= 13; // Must be at least 13 years old
			}
			return age >= 13;
		}, "You must be at least 13 years old")
		.refine((date) => {
			// Parse DD/MM/YYYY format correctly
			const [day, month, year] = date.split("/").map(Number);
			const birthDate = new Date(year, month - 1, day); // month is 0-indexed
			const today = new Date();
			return birthDate <= today;
		}, "Birth date cannot be in the future"),
	currency: z
		.string()
		.min(1, "Currency is required")
		.regex(/^[A-Z]{3}$/, "Choose a valid currency"),
	country: z
		.string()
		.min(1, "Country is required")
		.regex(/^[a-zA-Z\s'-]+$/, "Choose a valid country"),
	timezone: z
		.string()
		.min(1, "Timezone is required")
		.refine((timezone) => {
			// Accept both UTC offset format (UTC+04:00) and Region/City format (Asia/Dubai)
			const utcOffsetRegex = /^UTC[+-]\d{2}:\d{2}$/;
			const regionCityRegex = /^[a-zA-Z_]+\/[a-zA-Z_]+$/;
			return utcOffsetRegex.test(timezone) || regionCityRegex.test(timezone);
		}, "Choose a valid timezone"),
	// Accept a string or File. Use custom guard so this file remains isomorphic.
	profilePicture: z
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
			z.url("PP must be of valid image type and size").optional(),
			z.literal(""), // Allow empty string
		])
		.optional(),
});

export type ProfileData = z.infer<typeof ZProfileData>;

export const ZSettingsData = z.object({
	monthlyReports: z.boolean().optional(),
	expenseReminders: z.boolean().optional(),
	billsAndBudgetsAlert: z.boolean().optional(),
	expenseReminderTime: z.string().optional(),
});

export type SettingsData = z.infer<typeof ZSettingsData>;

export const ZCountryTimezoneCurrencyData = z.object({
	_id: z.string(),
	country: z.string(),
	currency: z.object({
		code: z.string(),
		symbol: z.string(),
		name: z.string(),
	}),
	timezones: z.array(z.string()),
});

export type CountryTimezoneCurrencyData = z.infer<typeof ZCountryTimezoneCurrencyData>;
