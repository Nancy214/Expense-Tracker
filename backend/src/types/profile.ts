import { Types } from "mongoose";

// Profile update request body interface
export interface ProfileUpdateRequest {
    name?: string;
    email?: string;
    phoneNumber?: string;
    dateOfBirth?: string;
    currency?: string;
    country?: string;
    timezone?: string;
}

// Settings update request body interface
export interface SettingsUpdateRequest {
    monthlyReports?: boolean;
    expenseReminders?: boolean;
    billsAndBudgetsAlert?: boolean;
    expenseReminderTime?: string;
}

// Profile response interface
export interface ProfileResponse {
    _id: Types.ObjectId | string;
    name: string;
    email: string;
    profilePicture: string;
    phoneNumber?: string;
    dateOfBirth?: string;
    currency?: string;
    country?: string;
    timezone?: string;
    budget?: boolean;
    budgetType?: string;
    settings: SettingsResponse;
}

// Settings response interface
export interface SettingsResponse {
    userId: Types.ObjectId | string;
    monthlyReports: boolean;
    expenseReminders: boolean;
    billsAndBudgetsAlert: boolean;
    expenseReminderTime: string;
}

// Country timezone currency response interface
export interface CountryTimezoneCurrencyResponse {
    country: string;
    currency: Record<string, unknown>;
    timezones: string[];
}

// Profile picture upload response interface
export interface ProfilePictureUploadResponse {
    profilePicture: string;
    profilePictureUrl: string;
}

// User update data interface
export interface UserUpdateData {
    name?: string;
    email?: string;
    phoneNumber?: string;
    dateOfBirth?: string;
    currency?: string;
    country?: string;
    timezone?: string;
    profilePicture?: string;
}

// Settings data interface
export interface SettingsData {
    monthlyReports?: boolean;
    expenseReminders?: boolean;
    billsAndBudgetsAlert?: boolean;
    expenseReminderTime?: string;
}

// Default settings interface
export interface DefaultSettings {
    userId: string;
    monthlyReports: boolean;
    expenseReminders: boolean;
    billsAndBudgetsAlert: boolean;
    expenseReminderTime: string;
}
