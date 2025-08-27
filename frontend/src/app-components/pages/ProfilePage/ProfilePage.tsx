import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useCountryTimezoneCurrency } from "@/hooks/use-profile";
import ProfileData from "@/app-components/pages/ProfilePage/ProfileData";
import SettingsData from "@/app-components/pages/ProfilePage/SettingsData";

const ProfilePage: React.FC = () => {
    const { user, logout } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();

    const { data: countryTimezoneData, isLoading, error } = useCountryTimezoneCurrency();

    // Extract currencies and countries from the query data
    const currencies = countryTimezoneData?.map((item) => item.currency) || [];
    const countryList = countryTimezoneData?.map((item) => item.country) || [];

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

    if (isLoading) {
        return (
            <div className="p-4 md:p-6 lg:p-4 space-y-6 max-w-full">
                <div className="mb-6">
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Profile & Settings</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Manage your account information and preferences
                    </p>
                </div>
                <div className="flex items-center justify-center p-6">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-sm text-muted-foreground">Loading profile data...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 md:p-6 lg:p-4 space-y-6 max-w-full">
                <div className="mb-6">
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Profile & Settings</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Manage your account information and preferences
                    </p>
                </div>
                <div className="flex items-center justify-center p-6">
                    <div className="text-center">
                        <p className="text-sm text-red-600">Failed to load profile data. Please refresh the page.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 lg:p-4 space-y-6 max-w-full">
            <div className="mb-6">
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Profile & Settings</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your account information and preferences</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Profile Information */}
                <div className="lg:col-span-2 space-y-6">
                    <ProfileData currencies={currencies} countryList={countryList} />
                </div>

                {/* Settings Sidebar */}
                <div className="space-y-6">
                    <SettingsData onLogout={handleLogout} />
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
