import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Camera, Save, Edit3 } from "lucide-react";
import { FormProvider } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { InputField } from "@/components/form-fields/InputField";
import { SelectField } from "@/components/form-fields/SelectField";
import { DateField } from "@/components/form-fields/DateField";
import { useProfileForm, useCountryTimezoneCurrency } from "@/hooks/use-profile";
import { useEffect, useMemo, useCallback } from "react";

const ProfileData: React.FC = () => {
    const { data: countryTimezoneData } = useCountryTimezoneCurrency();

    // Extract currencies and countries from the query data
    const currencies = countryTimezoneData?.map((item) => item.currency) || [];
    const countryList = countryTimezoneData?.map((item) => item.country) || [];
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

    // Get the currently selected country
    const selectedCountry = form.watch("country");

    // Filter currencies based on selected country
    const getCurrenciesForCountry = useCallback(
        (country: string) => {
            if (!country || !countryTimezoneData) return [];

            const countryData = countryTimezoneData.find((item) => item.country === country);
            if (!countryData) return [];

            // Return the currency for this country
            return [countryData.currency].filter((currency) => currency && currency.code);
        },
        [countryTimezoneData]
    );

    // Get timezones for selected country
    const getTimezonesForCountry = useCallback(
        (country: string) => {
            if (!country || !countryTimezoneData) return [];

            const countryData = countryTimezoneData.find((item) => item.country === country);
            if (!countryData) return [];

            // Return the timezones for this country
            return countryData.timezones || [];
        },
        [countryTimezoneData]
    );

    // Get available currencies for the selected country
    const availableCurrencies = useMemo(() => {
        if (!selectedCountry) {
            // If no country is selected, return all currencies
            return currencies
                .filter((currency) => currency.code !== "")
                .sort((a, b) => a.name.localeCompare(b.name))
                .reduce((acc, currency) => {
                    if (!acc.some((c: any) => c.code === currency.code)) {
                        acc.push(currency);
                    }
                    return acc;
                }, [] as any[])
                .map((currency) => ({
                    value: currency.code || "Not Defined",
                    label: `${currency.name} (${currency.code})`,
                }));
        }

        // Return currencies for the selected country
        return getCurrenciesForCountry(selectedCountry).map((currency) => ({
            value: currency.code || "Not Defined",
            label: `${currency.name} (${currency.code})`,
        }));
    }, [selectedCountry, countryTimezoneData, currencies]);

    // Get available timezones for the selected country
    const availableTimezones = useMemo(() => {
        if (!selectedCountry) {
            return [];
        }

        const timezones = getTimezonesForCountry(selectedCountry);
        return timezones.map((timezone) => ({
            value: timezone,
            label: timezone,
        }));
    }, [selectedCountry, countryTimezoneData]);

    // Auto-select currency and timezone when country changes
    useEffect(() => {
        if (selectedCountry && isEditing) {
            // Auto-select currency
            const countryCurrencies = getCurrenciesForCountry(selectedCountry);
            if (countryCurrencies.length > 0) {
                const defaultCurrency = countryCurrencies[0];
                form.setValue("currency", defaultCurrency.code);
            }

            // Auto-select timezone
            const countryTimezones = getTimezonesForCountry(selectedCountry);
            if (countryTimezones.length > 0) {
                const defaultTimezone = countryTimezones[0];
                form.setValue("timezone", defaultTimezone);
            }
        }
    }, [selectedCountry, isEditing, form, getCurrenciesForCountry, getTimezonesForCountry]);

    // Don't render if user data is not available
    if (!user) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Camera className="h-5 w-5" />
                        Personal Information
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-center p-6">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-sm text-muted-foreground">Loading profile data...</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

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
                                    ? undefined // Hide avatar if photo is marked for removal
                                    : form.watch("profilePicture") instanceof File
                                    ? URL.createObjectURL(form.watch("profilePicture") as File)
                                    : form.watch("profilePicture")
                                    ? (form.watch("profilePicture") as string)
                                    : user?.profilePicture
                                    ? user.profilePicture
                                    : undefined
                            }
                            onError={(e) => {
                                e.currentTarget.style.display = "none";
                            }}
                        />
                        <AvatarFallback className="text-lg">{getInitials(form.watch("name") || "")}</AvatarFallback>
                    </Avatar>
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            disabled={!isEditing}
                            onClick={() => {
                                if (isEditing) {
                                    document.getElementById("profilePicture")?.click();
                                }
                            }}
                        >
                            <Camera className="h-4 w-4 mr-2" />
                            Change Photo
                        </Button>
                        <Input
                            id="profilePicture"
                            type="file"
                            onChange={handleProfilePictureChange}
                            className="hidden"
                            disabled={!isEditing}
                        />
                        {isEditing && (form.watch("profilePicture") || user?.profilePicture) && (
                            <Button type="button" variant="outline" onClick={handleRemovePhoto}>
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4 mr-2"
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
                            </Button>
                        )}
                    </div>
                </div>

                {/* Basic Information */}
                <FormProvider {...form}>
                    <form
                        onSubmit={(e) => {
                            console.log("Form submit event triggered, isEditing:", isEditing);
                            if (!isEditing) {
                                console.log("Preventing form submission - not in editing mode");
                                e.preventDefault();
                                return;
                            }
                            form.handleSubmit(onSubmit)(e);
                        }}
                        className="space-y-6"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField name="name" label="Name" disabled={!isEditing} />
                            <InputField name="email" label="Email Address" type="email" disabled={!isEditing} />
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
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                                disabled={!isEditing}
                            />
                            <SelectField
                                name="timezone"
                                label="Timezone"
                                placeholder={selectedCountry ? "Select timezone" : "Select a country first"}
                                options={availableTimezones}
                                disabled={!isEditing || !selectedCountry}
                            />
                            <SelectField
                                name="currency"
                                label="Currency"
                                placeholder={selectedCountry ? "Select currency" : "Select a country first"}
                                options={availableCurrencies}
                                disabled={!isEditing || !selectedCountry}
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                            {isEditing ? (
                                <>
                                    <Button type="submit" disabled={isLoading}>
                                        <Save className="h-4 w-4 mr-2" />
                                        {isLoading ? "Saving..." : "Save Changes"}
                                    </Button>
                                    <Button type="button" variant="outline" onClick={handleCancel} disabled={isLoading}>
                                        Cancel
                                    </Button>
                                </>
                            ) : null}
                        </div>
                    </form>
                </FormProvider>

                {/* Edit Profile Button - Outside the form */}
                {!isEditing && (
                    <div className="flex gap-2">
                        <button
                            type="button"
                            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log("Edit Profile clicked, current isEditing:", isEditing);
                                console.log("Form values:", form.getValues());
                                setIsEditing(true);
                            }}
                        >
                            <Edit3 className="h-4 w-4" />
                            Edit Profile
                        </button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default ProfileData;
