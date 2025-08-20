import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Camera, Save, Edit3 } from "lucide-react";
import { FormProvider } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputField } from "@/components/form-fields/InputField";
import { SelectField } from "@/components/form-fields/SelectField";
import { DateField } from "@/components/form-fields/DateField";
import { CountryTimezoneCurrency } from "@/services/profile.service";
import { useProfileForm } from "@/hooks/useProfileForm";

interface ProfileDataProps {
    currencies: CountryTimezoneCurrency["currency"][];
    countryList: string[];
}

const ProfileData: React.FC<ProfileDataProps> = ({ currencies, countryList }) => {
    const {
        form,
        isEditing,
        isLoading,
        photoRemoved,
        handleProfilePictureChange,
        handleRemovePhoto,
        onSubmit,
        handleCancel,
        setIsEditing,
        user,
    } = useProfileForm();

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
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
                                    ? getInitials(form.watch("name")) // Hide avatar if photo is marked for removal
                                    : form.watch("profilePicture") instanceof File
                                    ? URL.createObjectURL(form.watch("profilePicture") as File)
                                    : form.watch("profilePicture")
                                    ? (form.watch("profilePicture") as string)
                                    : user?.profilePicture
                                    ? user.profilePicture
                                    : getInitials(form.watch("name"))
                            }
                            onError={(e) => {
                                e.currentTarget.style.display = "none";
                            }}
                        />
                        <AvatarFallback className="text-lg">{getInitials(form.watch("name"))}</AvatarFallback>
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
                        {isEditing && (form.watch("profilePicture") || user?.profilePicture) && (
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
                <FormProvider {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField name="name" label="Name" required disabled={!isEditing} />
                            <InputField
                                name="email"
                                label="Email Address"
                                type="email"
                                required
                                disabled={!isEditing}
                            />
                            <InputField
                                name="phoneNumber"
                                label="Phone Number"
                                type="tel"
                                placeholder="+1 (555) 123-4567"
                                disabled={!isEditing}
                            />
                            <DateField
                                name="dateOfBirth"
                                label="Date of Birth"
                                placeholder="Pick a date"
                                disabled={!isEditing}
                            />
                            <SelectField
                                name="currency"
                                label="Currency"
                                placeholder="Select currency"
                                options={
                                    currencies && currencies.length > 0
                                        ? currencies
                                              .filter((currency) => currency.code !== "")
                                              .sort((a, b) => a.name.localeCompare(b.name))
                                              .reduce((acc, currency) => {
                                                  if (!acc.some((c) => c.code === currency.code)) {
                                                      acc.push(currency);
                                                  }
                                                  return acc;
                                              }, [] as CountryTimezoneCurrency["currency"][])
                                              .map((currency) => ({
                                                  value: currency.code || "Not Defined",
                                                  label: `${currency.name} (${currency.code})`,
                                              }))
                                        : [{ value: "INR", label: "INR" }]
                                }
                                required
                                disabled={!isEditing}
                            />
                            <SelectField
                                name="country"
                                label="Country"
                                placeholder="Select a country"
                                options={
                                    countryList.length > 0
                                        ? countryList.map((country) => ({
                                              value: country,
                                              label: country,
                                          }))
                                        : []
                                }
                                required
                                disabled={!isEditing}
                            />
                        </div>
                    </form>
                </FormProvider>

                {/* Action Buttons */}
                <div className="flex gap-2">
                    {isEditing ? (
                        <>
                            <Button type="submit" disabled={isLoading}>
                                <Save className="h-4 w-4 mr-2" />
                                {isLoading ? "Saving..." : "Save Changes"}
                            </Button>
                            <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
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
