import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { data, useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Calendar,
  Settings,
  LogOut,
  Camera,
  Save,
  Edit3,
  Shield,
  Bell,
  Palette,
  Globe,
  Phone,
  MapPin,
  Briefcase,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { getExpenses } from "@/services/expense.service";
import { getBudgets } from "@/services/budget.service";
import { format } from "date-fns";
import { getCurrencyOptions } from "@/services/auth.service";
import {
  updateProfile,
  updateSettings,
  getSettings,
} from "@/services/profile.service";
import { ProfileData } from "@/types/profile";

const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [currencyOptions, setCurrencyOptions] = useState<
    { code: string; name: string }[]
  >([]);

  const [stats, setStats] = useState({
    totalExpenses: 0,
    totalAmount: 0,
    budgetsCount: 0,
    daysActive: 0,
    averageExpense: 0,
    largestExpense: 0,
    recurringExpenses: 0,
  });

  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    profilePicture: user?.profilePicture || (undefined as File | undefined),
    phoneNumber: user?.phoneNumber || "",
    dateOfBirth: user?.dateOfBirth || "",
    currency: user?.currency || "INR",
  });
  const validFileTypes: string[] = ["image/jpeg", "image/png", "image/jpg"];

  const [settings, setSettings] = useState({
    emailNotifications: false,
    pushNotifications: false,
    monthlyReports: false,
    budgetAlerts: false,
    expenseReminders: false,
  });

  useEffect(() => {
    fetchAccountStats();
    fetchCurrencyOptions();
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchSettings();
    }
  }, [user?.id]);

  const fetchCurrencyOptions = async () => {
    const response = await getCurrencyOptions();
    const data = response.map((currency: any) => ({
      code: currency.code,
      name: currency.name,
    }));
    setCurrencyOptions(data);
    //console.log(data);
  };

  const fetchSettings = async () => {
    const response = await getSettings(user?.id || "");
    setSettings({
      emailNotifications: response.emailNotifications ?? false,
      pushNotifications: response.pushNotifications ?? false,
      monthlyReports: response.monthlyReports ?? false,
      budgetAlerts: response.budgetAlerts ?? false,
      expenseReminders: response.expenseReminders ?? false,
    });
  };

  const handleProfilePictureChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      if (validFileTypes.includes(file.type)) {
        setProfileData({
          ...profileData,
          profilePicture: file,
        });
      } else {
        setError("Please upload a valid image file (JPEG, PNG, or JPG)");
      }
    }
  };

  const handleProfileDataChange = (
    field: keyof typeof profileData,
    value: string | File
  ) => {
    setProfileData({
      ...profileData,
      [field]: value,
    });
  };

  const handleSettingsChange = (
    field: keyof typeof settings,
    value: boolean | string
  ) => {
    setSettings({
      ...settings,
      [field]: value,
    });
  };

  const fetchAccountStats = async () => {
    try {
      const [expenses, budgets] = await Promise.all([
        getExpenses(),
        getBudgets(),
      ]);

      const totalAmount = expenses.reduce(
        (sum, expense) => sum + expense.amount,
        0
      );
      const recurringExpenses = expenses.filter(
        (expense) => expense.isRecurring
      ).length;
      const largestExpense =
        expenses.length > 0 ? Math.max(...expenses.map((e) => e.amount)) : 0;

      setStats({
        totalExpenses: expenses.length,
        totalAmount,
        budgetsCount: budgets.length,
        daysActive: 30,
        averageExpense: expenses.length > 0 ? totalAmount / expenses.length : 0,
        largestExpense,
        recurringExpenses,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login", { replace: true });
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      // Call the profile service to update profile data
      const updatedProfile = await updateProfile(profileData as ProfileData);

      // Update local state with the response from server
      setProfileData({
        name: updatedProfile.name,
        email: updatedProfile.email,
        profilePicture:
          updatedProfile.profilePicture || (undefined as File | undefined),
        phoneNumber: updatedProfile.phoneNumber || "",
        dateOfBirth: updatedProfile.dateOfBirth || "",
        currency: updatedProfile.currency || "INR",
      });

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      // Call the profile service to update settings
      const updatedSettings = await updateSettings(settings);

      // Update local state with the response from server, providing defaults for optional properties
      setSettings({
        emailNotifications: updatedSettings?.emailNotifications ?? false,
        pushNotifications: updatedSettings?.pushNotifications ?? false,
        monthlyReports: updatedSettings?.monthlyReports ?? false,
        budgetAlerts: updatedSettings?.budgetAlerts ?? false,
        expenseReminders: updatedSettings?.expenseReminders ?? false,
      });

      toast({
        title: "Settings saved",
        description: "Your settings have been saved successfully.",
      });
    } catch (error) {
      console.error("Error updating settings:", error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex min-h-svh w-full p-6 md:p-10">
      <div className="w-full max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Profile & Settings</h1>
          <p className="text-gray-600 mt-1">
            Manage your account information and preferences
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Information */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Profile Picture */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage
                      src={
                        typeof profileData.profilePicture === "string"
                          ? profileData.profilePicture
                          : profileData.profilePicture instanceof File
                          ? URL.createObjectURL(profileData.profilePicture)
                          : ""
                      }
                    />
                    <AvatarFallback className="text-lg">
                      {getInitials(profileData.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <Label
                      htmlFor="profilePicture"
                      className="flex items-center gap-2 cursor-pointer border border-gray-300 rounded-md px-3 py-2 hover:bg-gray-50 transition-colors"
                    >
                      <Camera className="h-4 w-4" />
                      Change Photo
                    </Label>
                    <Input
                      id="profilePicture"
                      type="file"
                      onChange={handleProfilePictureChange}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={profileData.name}
                      onChange={(e) =>
                        handleProfileDataChange("name", e.target.value)
                      }
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) =>
                        handleProfileDataChange("email", e.target.value)
                      }
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={profileData.phoneNumber}
                      onChange={(e) =>
                        handleProfileDataChange("phoneNumber", e.target.value)
                      }
                      disabled={!isEditing}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dob">Date of Birth</Label>
                    <Input
                      id="dob"
                      type="date"
                      value={profileData.dateOfBirth}
                      onChange={(e) =>
                        handleProfileDataChange("dateOfBirth", e.target.value)
                      }
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select
                      defaultValue="USD"
                      value={profileData.currency}
                      onValueChange={(value) =>
                        handleProfileDataChange("currency", value)
                      }
                      disabled={!isEditing}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencyOptions.map((currency) => (
                          <SelectItem key={currency.code} value={currency.code}>
                            {currency.code} ({currency.name})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <Button onClick={handleSaveProfile} disabled={isLoading}>
                        <Save className="h-4 w-4 mr-2" />
                        {isLoading ? "Saving..." : "Save Changes"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setIsEditing(false)}
                        disabled={isLoading}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button onClick={() => setIsEditing(true)}>
                      <Edit3 className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Account Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Account Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {stats.totalExpenses}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total Expenses
                    </div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      ${stats.totalAmount.toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total Spent
                    </div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {stats.budgetsCount}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Active Budgets
                    </div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {stats.daysActive}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Days Active
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-xl font-bold text-orange-600">
                      ${stats.averageExpense.toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Average Expense
                    </div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-xl font-bold text-red-600">
                      ${stats.largestExpense.toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Largest Expense
                    </div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-xl font-bold text-cyan-600">
                      {stats.recurringExpenses}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Recurring Expenses
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Settings Sidebar */}
          <div className="space-y-6">
            {/* Enhanced Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Notifications & Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-xs text-muted-foreground">
                      Receive email updates about your expenses
                    </p>
                  </div>
                  <Switch
                    checked={settings.emailNotifications}
                    onCheckedChange={(checked) =>
                      handleSettingsChange("emailNotifications", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Push Notifications</Label>
                    <p className="text-xs text-muted-foreground">
                      Get notified about budget alerts
                    </p>
                  </div>
                  <Switch
                    checked={settings.pushNotifications}
                    onCheckedChange={(checked) =>
                      handleSettingsChange("pushNotifications", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Monthly Reports</Label>
                    <p className="text-xs text-muted-foreground">
                      Receive monthly expense summaries
                    </p>
                  </div>
                  <Switch
                    checked={settings.monthlyReports}
                    onCheckedChange={(checked) =>
                      handleSettingsChange("monthlyReports", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Budget Alerts</Label>
                    <p className="text-xs text-muted-foreground">
                      Get notified when approaching budget limits
                    </p>
                  </div>
                  <Switch
                    checked={settings.budgetAlerts}
                    onCheckedChange={(checked) =>
                      handleSettingsChange("budgetAlerts", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Expense Reminders</Label>
                    <p className="text-xs text-muted-foreground">
                      Remind me to log expenses
                    </p>
                  </div>
                  <Switch
                    checked={settings.expenseReminders}
                    onCheckedChange={(checked) =>
                      handleSettingsChange("expenseReminders", checked)
                    }
                  />
                </div>

                <Button
                  onClick={handleSaveSettings}
                  className="w-full"
                  disabled={isLoading}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? "Saving..." : "Save Settings"}
                </Button>
              </CardContent>
            </Card>

            {/* Account Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Account Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate("/change-password")}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Change Password
                </Button>

                <Button
                  variant="destructive"
                  className="w-full justify-start"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Log Out
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
