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
    monthlyReports?: boolean;
    expenseReminders?: boolean;
    billsAndBudgetsAlert?: boolean;
    expenseReminderTime?: string;
}

export interface CountryTimezoneCurrencyData {
    _id: string;
    country: string;
    currency: {
        code: string;
        symbol: string;
        name: string;
    };
    timezones: string[];
}
