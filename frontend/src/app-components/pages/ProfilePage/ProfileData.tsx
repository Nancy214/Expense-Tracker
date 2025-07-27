import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Camera, Save, Edit3 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    updateProfile,
    removeProfilePicture,
    getCountryTimezoneCurrency,
    CountryTimezoneCurrency,
} from "@/services/profile.service";
import { ProfileData as ProfileDataType } from "@/types/profile";

interface ProfileDataProps {
    currencies: CountryTimezoneCurrency["currency"][];
    countryList: string[];
}

const ProfileData: React.FC<ProfileDataProps> = ({ currencies, countryList }) => {
    const { user, updateUser } = useAuth();
    const { toast } = useToast();

    const [isEditing, setIsEditing] = useState(false);
    const [isProfileLoading, setIsProfileLoading] = useState(false);
    const [error, setError] = useState("");

    const [profileData, setProfileData] = useState<{
        name: string;
        email: string;
        profilePicture: File | string;
        phoneNumber: string;
        dateOfBirth: string;
        currency: string;
        country: string;
    }>({
        name: user?.name || "",
        email: user?.email || "",
        profilePicture: user?.profilePicture || "",
        phoneNumber: user?.phoneNumber || "",
        dateOfBirth: user?.dateOfBirth || "",
        currency: user?.currency || "INR",
        country: user?.country || "",
    });

    const validFileTypes: string[] = ["image/jpeg", "image/png", "image/jpg"];
    const [photoRemoved, setPhotoRemoved] = useState(false);

    // Update profile data when user data changes
    useEffect(() => {
        if (user && !isEditing) {
            setProfileData({
                name: user.name || "",
                email: user.email || "",
                profilePicture: user.profilePicture || "",
                phoneNumber: user.phoneNumber || "",
                dateOfBirth: user.dateOfBirth || "",
                currency: user.currency || "INR",
                country: user.country || "",
            });
        }
    }, [user, isEditing]);

    const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    const handleProfileDataChange = (field: keyof typeof profileData, value: string | File | undefined) => {
        setProfileData({
            ...profileData,
            [field]: value,
        });
    };

    const handleSaveProfile = async () => {
        setIsProfileLoading(true);
        if (!profileData.country) {
            toast({
                title: "Country is required",
                description: "Please select your country.",
                variant: "destructive",
            });
            setIsProfileLoading(false);
            return;
        }
        try {
            // If photo was removed, call backend to delete it first
            if (photoRemoved) {
                await removeProfilePicture();
            }
            const updatedProfile = await updateProfile(profileData as ProfileDataType);
            setProfileData({
                name: updatedProfile.user.name,
                email: updatedProfile.user.email,
                profilePicture: updatedProfile.user.profilePicture || "",
                phoneNumber: updatedProfile.user.phoneNumber || "",
                dateOfBirth: updatedProfile.user.dateOfBirth || "",
                currency: updatedProfile.user.currency || "INR",
                country: updatedProfile.user.country || "",
            });
            localStorage.setItem("user", JSON.stringify(updatedProfile.user));
            updateUser(updatedProfile.user);
            toast({
                title: "Profile updated",
                description: "Your profile has been updated successfully.",
            });
            setIsEditing(false);
            setPhotoRemoved(false); // Reset after save
        } catch (error) {
            console.error("Error updating profile:", error);
            toast({
                title: "Error",
                description: "Failed to update profile. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsProfileLoading(false);
        }
    };

    const handleCancelEdit = () => {
        setProfileData({
            name: user?.name || "",
            email: user?.email || "",
            profilePicture: user?.profilePicture || "",
            phoneNumber: user?.phoneNumber || "",
            dateOfBirth: user?.dateOfBirth || "",
            currency: user?.currency || "INR",
            country: user?.country || "",
        });
        setPhotoRemoved(false); // Reset flag
        setIsEditing(false);
    };

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    // Remove profile picture handler
    const handleRemovePhoto = () => {
        setProfileData({ ...profileData, profilePicture: "" });
        setPhotoRemoved(true);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    Personal Information
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Profile Picture */}
                <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20">
                        <AvatarImage
                            src={
                                photoRemoved
                                    ? getInitials(profileData.name) // Hide avatar if photo is marked for removal
                                    : profileData.profilePicture instanceof File
                                    ? URL.createObjectURL(profileData.profilePicture)
                                    : profileData.profilePicture
                                    ? profileData.profilePicture
                                    : user?.profilePicture
                                    ? user.profilePicture
                                    : getInitials(profileData.name)
                            }
                            onError={(e) => {
                                e.currentTarget.style.display = "none";
                            }}
                        />
                        <AvatarFallback className="text-lg">{getInitials(profileData.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex items-center">
                        <Label
                            htmlFor="profilePicture"
                            className={`flex items-center gap-2 border border-gray-300 rounded-md px-3 py-2 transition-colors ${
                                isEditing ? "cursor-pointer hover:bg-gray-50" : "cursor-not-allowed opacity-50"
                            }`}
                            aria-disabled={!isEditing}
                            tabIndex={isEditing ? 0 : -1}
                            onClick={(e) => {
                                if (!isEditing) e.preventDefault();
                            }}
                        >
                            <Camera className="h-4 w-4" />
                            Change Photo
                        </Label>
                        <Input
                            id="profilePicture"
                            type="file"
                            onChange={handleProfilePictureChange}
                            className="hidden"
                            disabled={!isEditing}
                        />
                        {isEditing && (profileData.profilePicture || user?.profilePicture) && (
                            <Label
                                tabIndex={0}
                                role="button"
                                className="flex items-center gap-2 border border-gray-300 rounded-md px-3 py-2 ms-2 transition-colors cursor-pointer hover:bg-gray-50"
                                onClick={handleRemovePhoto}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V5a2 2 0 012-2h2a2 2 0 012 2v2"
                                    />
                                </svg>
                                Remove Photo
                            </Label>
                        )}
                    </div>
                </div>

                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Name *</Label>
                        <Input
                            id="name"
                            value={profileData.name}
                            onChange={(e) => handleProfileDataChange("name", e.target.value)}
                            disabled={!isEditing}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email Address *</Label>
                        <Input
                            id="email"
                            type="email"
                            value={profileData.email}
                            onChange={(e) => handleProfileDataChange("email", e.target.value)}
                            disabled={!isEditing}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                            id="phone"
                            type="tel"
                            value={profileData.phoneNumber}
                            onChange={(e) => handleProfileDataChange("phoneNumber", e.target.value)}
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
                            onChange={(e) => handleProfileDataChange("dateOfBirth", e.target.value)}
                            disabled={!isEditing}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="currency">Currency</Label>
                        <Select
                            defaultValue="INR"
                            value={profileData.currency}
                            onValueChange={(value) => handleProfileDataChange("currency", value)}
                            disabled={!isEditing}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {currencies && currencies.length > 0 ? (
                                    currencies
                                        .filter((currency) => currency.code !== "")
                                        .sort((a, b) => a.name.localeCompare(b.name))
                                        .reduce((acc, currency) => {
                                            if (!acc.some((c) => c.code === currency.code)) {
                                                acc.push(currency);
                                            }
                                            return acc;
                                        }, [] as CountryTimezoneCurrency["currency"][])
                                        .map((currency, index) => (
                                            <SelectItem
                                                key={`${index}-${currency.code}`}
                                                value={currency.code || "Not Defined"}
                                            >
                                                {currency.name} ({currency.code})
                                            </SelectItem>
                                        ))
                                ) : (
                                    <SelectItem value="INR">INR</SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="country">Country *</Label>
                        <Select
                            value={profileData.country}
                            onValueChange={(value) => handleProfileDataChange("country", value)}
                            disabled={!isEditing}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a country" />
                            </SelectTrigger>
                            <SelectContent>
                                {countryList.length === 0 ? (
                                    <div className="px-2 py-2 text-sm text-gray-500">No countries found</div>
                                ) : (
                                    countryList.map((country) => (
                                        <SelectItem key={country} value={country}>
                                            {country}
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                    {isEditing ? (
                        <>
                            <Button onClick={handleSaveProfile} disabled={isProfileLoading}>
                                <Save className="h-4 w-4 mr-2" />
                                {isProfileLoading ? "Saving..." : "Save Changes"}
                            </Button>
                            <Button variant="outline" onClick={handleCancelEdit} disabled={isProfileLoading}>
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
    );
};

export default ProfileData;
