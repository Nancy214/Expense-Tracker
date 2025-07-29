import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { getCountryTimezoneCurrency, CountryTimezoneCurrency } from "@/services/profile.service";
import ProfileData from "@/app-components/pages/ProfilePage/ProfileData";
import SettingsData from "@/app-components/pages/ProfilePage/SettingsData";

const ProfilePage: React.FC = () => {
    const { user, logout } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [currencies, setCurrencies] = useState<CountryTimezoneCurrency["currency"][]>([]);
    const [countryList, setCountryList] = useState<string[]>([]);

    useEffect(() => {
        fetchCountryTimezoneCurrency();
    }, []);

    const fetchCountryTimezoneCurrency = async () => {
        const response = await getCountryTimezoneCurrency();
        const countriesOptions = response.map((item) => item.country);
        setCountryList(countriesOptions);

        const currenciesOptions = response.map((item) => item.currency);
        setCurrencies(currenciesOptions);
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

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-full">
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
