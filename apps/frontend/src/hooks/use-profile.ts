import { useQuery, useMutation, useQueryClient, UseQueryResult } from "@tanstack/react-query";
import { useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
    getProfile,
    updateProfile,
    removeProfilePicture,
    getCountryTimezoneCurrency,
    updateSettings,
} from "@/services/profile.service";
import { profileSchema, ProfileFormData } from "@/schemas/profileSchema";
import { SettingsData, ProfileResponse, ProfileData } from "../../../../libs/shared-types/src/profile-frontend";
import { User } from "@expense-tracker/shared-types/src/auth-frontend";
import { AxiosError } from "axios";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

// API Response Types
interface CountryTimezoneCurrencyResponse {
    _id: string;
    country: string;
    currency: {
        code: string;
        symbol: string;
        name: string;
    };
    timezones: string[];
}

interface DeleteProfilePictureResponse {
    success: boolean;
    message: string;
}

// Mutation Function Types

// Utility Types
type ProfileDataUnion = User | ProfileResponse | null;
type FileValidationResult = {
    isValid: boolean;
    errorMessage?: string;
};

// Hook Return Types
interface ProfileMutationsReturn {
    updateProfile: (data: ProfileData) => Promise<ProfileResponse>;
    removeProfilePicture: () => Promise<DeleteProfilePictureResponse>;
    updateSettings: (variables: { settings: SettingsData; userId: string }) => Promise<SettingsData>;
    isUpdatingProfile: boolean;
    isRemovingPicture: boolean;
    isUpdatingSettings: boolean;
    updateProfileError: Error | null;
    removePictureError: Error | null;
    updateSettingsError: Error | null;
}

interface ProfileFormReturn {
    form: UseFormReturn<ProfileFormData>;
    error: string;
    isEditing: boolean;
    isLoading: boolean;
    photoRemoved: boolean;
    handleProfilePictureChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleRemovePhoto: () => void;
    onSubmit: (data: ProfileFormData) => Promise<void>;
    handleCancel: () => void;
    setIsEditing: (editing: boolean) => void;
    user: ProfileDataUnion;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validates a profile picture file
 * @param file - The file to validate
 * @returns Validation result with success status and optional error message
 */
const validateProfilePictureFile = (file: File): FileValidationResult => {
    const validTypes: string[] = ["image/jpeg", "image/jpg", "image/png"];
    const maxSizeInMB: number = 5;
    const maxSizeInBytes: number = maxSizeInMB * 1024 * 1024;

    if (!validTypes.includes(file.type)) {
        return {
            isValid: false,
            errorMessage: "Please upload a valid image file (JPEG, PNG, or JPG)",
        };
    }

    if (file.size > maxSizeInBytes) {
        return {
            isValid: false,
            errorMessage: `File size must be less than ${maxSizeInMB}MB`,
        };
    }

    return { isValid: true };
};

// Query keys
const PROFILE_QUERY_KEYS = {
    profile: ["profile"] as const,
    countryTimezoneCurrency: ["country-timezone-currency"] as const,
    settings: (userId: string) => ["settings", userId] as const,
} as const;

// ============================================================================
// QUERY HOOKS
// ============================================================================

export function useProfile(): UseQueryResult<ProfileResponse, AxiosError> {
    const { isAuthenticated } = useAuth();
    const { user } = useAuth();
    const userId = user?.id;

    return useQuery<ProfileResponse, AxiosError>({
        queryKey: PROFILE_QUERY_KEYS.profile,
        queryFn: () => getProfile(userId || ""),
        staleTime: 0, // Always consider data stale to ensure fresh profile picture URLs
        gcTime: 5 * 60 * 1000, // Cache for 5 minutes
        refetchOnWindowFocus: true, // Refetch on window focus to get fresh profile picture URLs
        enabled: isAuthenticated && !!userId, // Only run the query if authenticated and userId exists
    });
}

export function useCountryTimezoneCurrency(): UseQueryResult<CountryTimezoneCurrencyResponse[], AxiosError> {
    return useQuery<CountryTimezoneCurrencyResponse[], AxiosError>({
        queryKey: PROFILE_QUERY_KEYS.countryTimezoneCurrency,
        queryFn: getCountryTimezoneCurrency,
        staleTime: 30 * 60 * 1000, // Consider data fresh for 30 minutes (country data rarely changes)
        gcTime: 60 * 60 * 1000, // Cache for 1 hour
        refetchOnWindowFocus: false, // Don't refetch on window focus
        enabled: true, // Always enabled since endpoint is now public
    });
}

export function useSettings(userId: string): UseQueryResult<SettingsData, AxiosError> {
    const { isAuthenticated } = useAuth();
    const { data: profileData } = useProfile();

    return useQuery<SettingsData, AxiosError>({
        queryKey: PROFILE_QUERY_KEYS.settings(userId),
        queryFn: () =>
            Promise.resolve(
                profileData?.settings || {
                    userId: userId,
                    monthlyReports: false,
                    expenseReminders: true,
                    billsAndBudgetsAlert: false,
                    expenseReminderTime: "18:00",
                }
            ),
        staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
        gcTime: 10 * 60 * 1000, // Cache for 10 minutes
        refetchOnWindowFocus: false, // Don't refetch on window focus
        enabled: isAuthenticated && !!userId && !!profileData, // Only run the query if authenticated, userId exists, and profile data is available
    });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export function useProfileMutations(): ProfileMutationsReturn {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { updateUser } = useAuth();

    const updateProfileMutation = useMutation<ProfileResponse, AxiosError, ProfileData>({
        mutationFn: updateProfile,
        onSuccess: (data: ProfileResponse) => {
            toast({
                title: "Success",
                description: "Profile updated successfully",
            });

            // Convert ProfileResponse to User type for auth context
            const userForAuth: User = {
                id: data._id,
                email: data.email,
                name: data.name,
                profilePicture: data.profilePicture,
                phoneNumber: data.phoneNumber,
                dateOfBirth: data.dateOfBirth,
                currency: data.currency,
                country: data.country,
                timezone: data.timezone,
                settings: data.settings
                    ? {
                          monthlyReports: data.settings.monthlyReports ?? false,
                          expenseReminders: data.settings.expenseReminders ?? true,
                          billsAndBudgetsAlert: data.settings.billsAndBudgetsAlert ?? false,
                          expenseReminderTime: data.settings.expenseReminderTime ?? "18:00",
                      }
                    : undefined,
            };

            // Update local storage and auth context
            localStorage.setItem("user", JSON.stringify(userForAuth));
            updateUser(userForAuth);

            // Invalidate and refetch profile query to ensure fresh data
            queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEYS.profile });
            queryClient.refetchQueries({ queryKey: PROFILE_QUERY_KEYS.profile });
        },
        onError: (error: AxiosError) => {
            const errorMessage =
                (error.response?.data as { message?: string })?.message ||
                "Failed to update profile. Please try again.";
            toast({
                title: "Error",
                description: errorMessage,
                variant: "destructive",
            });
        },
    });

    const removeProfilePictureMutation = useMutation<DeleteProfilePictureResponse, AxiosError, void>({
        mutationFn: removeProfilePicture,
        onSuccess: () => {
            toast({
                title: "Success",
                description: "Profile picture removed successfully",
            });

            // Invalidate and refetch profile query to ensure fresh data
            queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEYS.profile });
            queryClient.refetchQueries({ queryKey: PROFILE_QUERY_KEYS.profile });
        },
        onError: (error: AxiosError) => {
            const errorMessage =
                (error.response?.data as { message?: string })?.message ||
                "Failed to remove profile picture. Please try again.";
            toast({
                title: "Error",
                description: errorMessage,
                variant: "destructive",
            });
        },
    });

    const updateSettingsMutation = useMutation<SettingsData, AxiosError, { settings: SettingsData; userId: string }>({
        mutationFn: ({ settings }: { settings: SettingsData; userId: string }) => updateSettings(settings),
        onSuccess: (_, variables: { settings: SettingsData; userId: string }) => {
            toast({
                title: "Success",
                description: "Settings updated successfully",
            });

            // Invalidate both profile and settings queries since settings are now part of profile
            queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEYS.profile });
            queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEYS.settings(variables.userId) });
        },
        onError: (error: AxiosError) => {
            const errorMessage =
                (error.response?.data as { message?: string })?.message ||
                "Failed to update settings. Please try again.";
            toast({
                title: "Error",
                description: errorMessage,
                variant: "destructive",
            });
        },
    });

    return {
        updateProfile: updateProfileMutation.mutateAsync,
        removeProfilePicture: removeProfilePictureMutation.mutateAsync,
        updateSettings: updateSettingsMutation.mutateAsync,
        isUpdatingProfile: updateProfileMutation.isPending,
        isRemovingPicture: removeProfilePictureMutation.isPending,
        isUpdatingSettings: updateSettingsMutation.isPending,
        updateProfileError: updateProfileMutation.error,
        removePictureError: removeProfilePictureMutation.error,
        updateSettingsError: updateSettingsMutation.error,
    };
}

// ============================================================================
// FORM HOOK
// ============================================================================

export function useProfileForm(): ProfileFormReturn {
    const { user, updateUser } = useAuth();
    const { data: profileData } = useProfile();
    const { updateProfile, removeProfilePicture, isUpdatingProfile, isRemovingPicture } = useProfileMutations();
    const { toast } = useToast();
    const [error, setError] = useState<string>("");
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [photoRemoved, setPhotoRemoved] = useState<boolean>(false);
    const [isUpdatingSuccessfully, setIsUpdatingSuccessfully] = useState<boolean>(false);
    const lastUpdatedProfileId = useRef<string | null>(null);

    // Use profile data from query if available, otherwise fall back to auth context
    // Prioritize fresh API data over potentially stale localStorage data
    const currentProfileData = profileData || user;

    const form = useForm<ProfileFormData>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            name: currentProfileData?.name || "",
            email: currentProfileData?.email || "",
            profilePicture: currentProfileData?.profilePicture || "",
            phoneNumber: currentProfileData?.phoneNumber || "",
            dateOfBirth: currentProfileData?.dateOfBirth || "",
            currency: currentProfileData?.currency || "",
            country: currentProfileData?.country || "",
            timezone: currentProfileData?.timezone || "",
        },
    });

    // Reset form when profile data changes, but only when not editing and not in the middle of a successful update
    useEffect((): void => {
        if (currentProfileData && !isEditing && !isUpdatingSuccessfully) {
            form.reset({
                name: currentProfileData.name || "",
                email: currentProfileData.email || "",
                profilePicture: currentProfileData.profilePicture || "",
                phoneNumber: currentProfileData.phoneNumber || "",
                dateOfBirth: currentProfileData.dateOfBirth || "",
                currency: currentProfileData.currency || "",
                country: currentProfileData.country || "",
                timezone: currentProfileData.timezone || "",
            });
            setPhotoRemoved(false);
        }
    }, [currentProfileData, form, isEditing, isUpdatingSuccessfully]);

    // Additional effect to handle when profileData becomes available after initial load
    useEffect((): void => {
        if (profileData && !isEditing && !isUpdatingSuccessfully) {
            // Force form reset when fresh profile data becomes available
            form.reset({
                name: profileData.name || "",
                email: profileData.email || "",
                profilePicture: profileData.profilePicture || "",
                phoneNumber: profileData.phoneNumber || "",
                dateOfBirth: profileData.dateOfBirth || "",
                currency: profileData.currency || "",
                country: profileData.country || "",
                timezone: profileData.timezone || "",
            });
            setPhotoRemoved(false);
        }
    }, [profileData, form, isEditing, isUpdatingSuccessfully]);

    // Update AuthContext with fresh profile data to keep localStorage in sync
    useEffect((): void => {
        if (profileData && profileData._id !== lastUpdatedProfileId.current) {
            const userForAuth = {
                id: profileData._id,
                email: profileData.email,
                name: profileData.name,
                profilePicture: profileData.profilePicture,
                phoneNumber: profileData.phoneNumber,
                dateOfBirth: profileData.dateOfBirth,
                currency: profileData.currency,
                country: profileData.country,
                timezone: profileData.timezone,
                settings: profileData.settings
                    ? {
                          monthlyReports: profileData.settings.monthlyReports ?? false,
                          expenseReminders: profileData.settings.expenseReminders ?? true,
                          billsAndBudgetsAlert: profileData.settings.billsAndBudgetsAlert ?? false,
                          expenseReminderTime: profileData.settings.expenseReminderTime ?? "18:00",
                      }
                    : undefined,
            };

            localStorage.setItem("user", JSON.stringify(userForAuth));
            updateUser(userForAuth);
            lastUpdatedProfileId.current = profileData._id;
        }
    }, [profileData]);

    const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        if (e.target.files?.[0]) {
            const file: File = e.target.files[0];
            const validation: FileValidationResult = validateProfilePictureFile(file);

            if (validation.isValid) {
                form.setValue("profilePicture", file, { shouldValidate: true });
                setError("");
            } else {
                setError(validation.errorMessage || "Invalid file");
            }
        }
    };

    const handleRemovePhoto = (): void => {
        form.setValue("profilePicture", "", { shouldValidate: true });
        setPhotoRemoved(true);
    };

    const onSubmit = async (data: ProfileFormData): Promise<void> => {
        setError("");

        // Check if any changes were made
        const hasChanges: boolean =
            data.name !== currentProfileData?.name ||
            data.email !== currentProfileData?.email ||
            data.phoneNumber !== currentProfileData?.phoneNumber ||
            data.dateOfBirth !== currentProfileData?.dateOfBirth ||
            data.currency !== currentProfileData?.currency ||
            data.country !== currentProfileData?.country ||
            data.timezone !== currentProfileData?.timezone ||
            data.profilePicture instanceof File ||
            photoRemoved;

        if (!hasChanges) {
            toast({
                title: "No Changes",
                description: "No changes were made to save.",
            });
            setIsEditing(false);
            return;
        }

        try {
            setIsUpdatingSuccessfully(true);

            // If photo was removed, call backend to delete it first
            if (photoRemoved) {
                await removeProfilePicture();
            }

            const response: ProfileResponse = await updateProfile(data);
            setIsEditing(false);
            setPhotoRemoved(false);

            // Reset form with the updated data from the response
            if (response) {
                form.reset({
                    name: response.name || "",
                    email: response.email || "",
                    profilePicture: response.profilePicture || "",
                    phoneNumber: response.phoneNumber || "",
                    dateOfBirth: response.dateOfBirth || "",
                    currency: response.currency || "",
                    country: response.country || "",
                    timezone: response.timezone || "",
                });
            }

            // Reset the updating flag after a short delay to allow the query cache to update
            setTimeout(() => {
                setIsUpdatingSuccessfully(false);
            }, 1000);
        } catch (error: unknown) {
            setIsUpdatingSuccessfully(false);
            console.error("Error updating profile:", error);
            const errorMessage: string =
                error && typeof error === "object" && "response" in error
                    ? (error.response as { data?: { message?: string } })?.data?.message ||
                      "Failed to update profile. Please try again."
                    : "Failed to update profile. Please try again.";
            setError(errorMessage);
        }
    };

    const handleCancel = (): void => {
        form.reset({
            name: currentProfileData?.name || "",
            email: currentProfileData?.email || "",
            profilePicture: currentProfileData?.profilePicture || "",
            phoneNumber: currentProfileData?.phoneNumber || "",
            dateOfBirth: currentProfileData?.dateOfBirth || "",
            currency: currentProfileData?.currency || "",
            country: currentProfileData?.country || "",
            timezone: currentProfileData?.timezone || "",
        });
        setPhotoRemoved(false);
        setIsEditing(false);
        setError("");
    };

    return {
        form,
        error,
        isEditing,
        isLoading: isUpdatingProfile || isRemovingPicture,
        photoRemoved,
        handleProfilePictureChange,
        handleRemovePhoto,
        onSubmit,
        handleCancel,
        setIsEditing,
        user: currentProfileData,
    };
}
