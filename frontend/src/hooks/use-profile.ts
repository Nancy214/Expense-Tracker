import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
    getProfile,
    updateProfile,
    removeProfilePicture,
    getCountryTimezoneCurrency,
    updateSettings,
    getSettings,
} from "@/services/profile.service";
import { profileSchema, ProfileFormData } from "@/schemas/profileSchema";
import { SettingsData } from "@/types/profile";

// Query keys
const PROFILE_QUERY_KEYS = {
    profile: ["profile"] as const,
    countryTimezoneCurrency: ["country-timezone-currency"] as const,
    settings: (userId: string) => ["settings", userId] as const,
} as const;

// ============================================================================
// QUERY HOOKS
// ============================================================================

export function useProfile() {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: PROFILE_QUERY_KEYS.profile,
        queryFn: getProfile,
        staleTime: 0, // Always consider data stale to ensure fresh profile picture URLs
        gcTime: 5 * 60 * 1000, // Cache for 5 minutes
        refetchOnWindowFocus: true, // Refetch on window focus to get fresh profile picture URLs
        enabled: isAuthenticated, // Only run the query if authenticated
    });
}

export function useCountryTimezoneCurrency() {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: PROFILE_QUERY_KEYS.countryTimezoneCurrency,
        queryFn: getCountryTimezoneCurrency,
        staleTime: 30 * 60 * 1000, // Consider data fresh for 30 minutes (country data rarely changes)
        gcTime: 60 * 60 * 1000, // Cache for 1 hour
        refetchOnWindowFocus: false, // Don't refetch on window focus
        enabled: isAuthenticated, // Only run the query if authenticated
    });
}

export function useSettings(userId: string) {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: PROFILE_QUERY_KEYS.settings(userId),
        queryFn: () => getSettings(userId),
        staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
        gcTime: 10 * 60 * 1000, // Cache for 10 minutes
        refetchOnWindowFocus: false, // Don't refetch on window focus
        enabled: isAuthenticated && !!userId, // Only run the query if authenticated and userId exists
    });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export function useProfileMutations() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { updateUser } = useAuth();

    const updateProfileMutation = useMutation({
        mutationFn: updateProfile,
        onSuccess: (data) => {
            toast({
                title: "Success",
                description: "Profile updated successfully",
            });

            // Update local storage and auth context
            localStorage.setItem("user", JSON.stringify(data.user));
            updateUser(data.user);

            // Invalidate and refetch profile query to ensure fresh data
            queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEYS.profile });
            queryClient.refetchQueries({ queryKey: PROFILE_QUERY_KEYS.profile });
        },
        onError: (error: Error & { response?: { data?: { message?: string } } }) => {
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to update profile. Please try again.",
                variant: "destructive",
            });
        },
    });

    const removeProfilePictureMutation = useMutation({
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
        onError: (error: Error & { response?: { data?: { message?: string } } }) => {
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to remove profile picture. Please try again.",
                variant: "destructive",
            });
        },
    });

    const updateSettingsMutation = useMutation({
        mutationFn: ({ settings }: { settings: SettingsData; userId: string }) => updateSettings(settings),
        onSuccess: (_, variables) => {
            toast({
                title: "Success",
                description: "Settings updated successfully",
            });

            // Invalidate settings query
            queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEYS.settings(variables.userId) });
        },
        onError: (error: Error & { response?: { data?: { message?: string } } }) => {
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to update settings. Please try again.",
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

export function useProfileForm() {
    const { user } = useAuth();
    const { data: profileData } = useProfile();
    const { updateProfile, removeProfilePicture, isUpdatingProfile, isRemovingPicture } = useProfileMutations();
    const { toast } = useToast();
    const [error, setError] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [photoRemoved, setPhotoRemoved] = useState(false);
    const [isUpdatingSuccessfully, setIsUpdatingSuccessfully] = useState(false);

    // Use profile data from query if available, otherwise fall back to auth context
    const currentProfileData = profileData || user;

    const form = useForm<ProfileFormData>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            name: currentProfileData?.name || "",
            email: currentProfileData?.email || "",
            profilePicture: currentProfileData?.profilePicture || "",
            phoneNumber: currentProfileData?.phoneNumber || "",
            dateOfBirth: currentProfileData?.dateOfBirth || "",
            currency: currentProfileData?.currency || "INR",
            country: currentProfileData?.country || "",
            timezone: currentProfileData?.timezone || "",
        },
    });

    // Reset form when profile data changes, but only when not editing and not in the middle of a successful update
    useEffect(() => {
        if (currentProfileData && !isEditing && !isUpdatingSuccessfully) {
            form.reset({
                name: currentProfileData.name || "",
                email: currentProfileData.email || "",
                profilePicture: currentProfileData.profilePicture || "",
                phoneNumber: currentProfileData.phoneNumber || "",
                dateOfBirth: currentProfileData.dateOfBirth || "",
                currency: currentProfileData.currency || "INR",
                country: currentProfileData.country || "",
                timezone: currentProfileData.timezone || "",
            });
            setPhotoRemoved(false);
        }
    }, [currentProfileData, form, isEditing, isUpdatingSuccessfully]);

    const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            // Basic validation - you might want to import validateProfilePicture from schema
            const validTypes = ["image/jpeg", "image/jpg", "image/png"];
            if (validTypes.includes(file.type)) {
                form.setValue("profilePicture", file, { shouldValidate: true });
                setError("");
            } else {
                setError("Please upload a valid image file (JPEG, PNG, or JPG)");
            }
        }
    };

    const handleRemovePhoto = () => {
        form.setValue("profilePicture", "", { shouldValidate: true });
        setPhotoRemoved(true);
    };

    const onSubmit = async (data: ProfileFormData) => {
        setError("");

        // Check if any changes were made
        const hasChanges =
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

            const response = await updateProfile(data);
            setIsEditing(false);
            setPhotoRemoved(false);

            // Reset form with the updated data from the response
            if (response && response.user) {
                form.reset({
                    name: response.user.name || "",
                    email: response.user.email || "",
                    profilePicture: response.user.profilePicture || "",
                    phoneNumber: response.user.phoneNumber || "",
                    dateOfBirth: response.user.dateOfBirth || "",
                    currency: response.user.currency || "INR",
                    country: response.user.country || "",
                    timezone: response.user.timezone || "",
                });
            }

            // Reset the updating flag after a short delay to allow the query cache to update
            setTimeout(() => {
                setIsUpdatingSuccessfully(false);
            }, 1000);
        } catch (error: unknown) {
            setIsUpdatingSuccessfully(false);
            console.error("Error updating profile:", error);
            const errorMessage =
                error && typeof error === "object" && "response" in error
                    ? (error.response as { data?: { message?: string } })?.data?.message
                    : undefined;
            setError(errorMessage || "Failed to update profile. Please try again.");
        }
    };

    const handleCancel = () => {
        form.reset({
            name: currentProfileData?.name || "",
            email: currentProfileData?.email || "",
            profilePicture: currentProfileData?.profilePicture || "",
            phoneNumber: currentProfileData?.phoneNumber || "",
            dateOfBirth: currentProfileData?.dateOfBirth || "",
            currency: currentProfileData?.currency || "INR",
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
