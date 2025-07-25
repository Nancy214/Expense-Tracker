export interface ProfileData {
    name?: string;
    email?: string;
    phoneNumber?: string;
    dateOfBirth?: string;
    currency?: string;
    country?: string;
    profilePicture?: File | string;
}

export interface SettingsData {
    monthlyReports?: boolean;
    expenseReminders?: boolean;
    billsAndBudgetsAlert?: boolean;
    expenseReminderTime?: string;
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
    budget?: boolean;
    budgetType?: string;
    settings?: SettingsData;
}
