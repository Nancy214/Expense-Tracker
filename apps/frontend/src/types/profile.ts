export interface ProfileData {
    name?: string;
    email?: string;
    phoneNumber?: string;
    dateOfBirth?: string;
    currency?: string;
    country?: string;
    timezone?: string;
    profilePicture?: File | string;
}

export interface SettingsData {
    monthlyReports: boolean;
    expenseReminders: boolean;
    billsAndBudgetsAlert: boolean;
    expenseReminderTime: string;
}

export interface ProfileResponse {
    _id: string;
    name: string;
    email: string;
    profilePicture?: string;
    phoneNumber?: string;
    dateOfBirth?: string;
    currency?: string;
    country?: string;
    timezone?: string;
    budget?: boolean;
    budgetType?: string;
    settings?: SettingsData;
}

// New types for enhanced profile functionality
export interface CountryData {
    _id: string;
    country: string;
    currency: {
        code: string;
        symbol: string;
        name: string;
    };
    timezones: string[];
}

export interface CurrencyOption {
    value: string;
    label: string;
}

export interface TimezoneOption {
    value: string;
    label: string;
}

export interface ProfileFormData {
    name: string;
    email: string;
    phoneNumber: string;
    dateOfBirth: string;
    country: string;
    timezone: string;
    currency: string;
    profilePicture: File | string | null;
}

export interface UserSettings {
    monthlyReports: boolean;
    expenseReminders: boolean;
    billsAndBudgetsAlert: boolean;
    expenseReminderTime: string;
}
