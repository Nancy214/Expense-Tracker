export interface ProfileData {
  name?: string;
  email?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  currency?: string;
  profilePicture?: File;
}

export interface SettingsData {
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  monthlyReports?: boolean;
  budgetAlerts?: boolean;
  expenseReminders?: boolean;
}

export interface ProfileResponse {
  _id: string;
  name: string;
  email: string;
  profilePicture?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  currency?: string;
  budget?: boolean;
  budgetType?: string;
  settings?: SettingsData;
}
