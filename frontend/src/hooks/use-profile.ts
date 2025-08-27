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
    CountryTimezoneCurrency,
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
        staleTime: 30 * 1000, // Consider data fresh for 30 seconds
        gcTime: 5 * 60 * 1000, // Cache for 5 minutes
        refetchOnWindowFocus: false, // Don't refetch on window focus
        enabled: isAuthenticated, // Only run the query if authenticated
    });
}

export function useCountryTimezoneCurrency() {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: PROFILE_QUERY_KEYS.countryTimezoneCurrency,
        queryFn: getCountryTimezoneCurrency,
        staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
        gcTime: 10 * 60 * 1000, // Cache for 10 minutes
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

            // Invalidate profile query
            queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEYS.profile });
        },
        onError: (error: any) => {
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

            // Invalidate profile query
            queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEYS.profile });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to remove profile picture. Please try again.",
                variant: "destructive",
            });
        },
    });

    const updateSettingsMutation = useMutation({
        mutationFn: ({ settings, userId }: { settings: SettingsData; userId: string }) => updateSettings(settings),
        onSuccess: (data, variables) => {
            toast({
                title: "Success",
                description: "Settings updated successfully",
            });

            // Invalidate settings query
            queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEYS.settings(variables.userId) });
        },
        onError: (error: any) => {
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
    const [error, setError] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [photoRemoved, setPhotoRemoved] = useState(false);

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
        },
    });

    // Reset form when profile data changes
    useEffect(() => {
        if (currentProfileData && !isEditing) {
            form.reset({
                name: currentProfileData.name || "",
                email: currentProfileData.email || "",
                profilePicture: currentProfileData.profilePicture || "",
                phoneNumber: currentProfileData.phoneNumber || "",
                dateOfBirth: currentProfileData.dateOfBirth || "",
                currency: currentProfileData.currency || "INR",
                country: currentProfileData.country || "",
            });
        }
    }, [currentProfileData, form, isEditing]);

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

        try {
            // If photo was removed, call backend to delete it first
            if (photoRemoved) {
                await removeProfilePicture();
            }

            await updateProfile(data);
            setIsEditing(false);
            setPhotoRemoved(false);
        } catch (error: any) {
            console.error("Error updating profile:", error);
            setError(error.response?.data?.message || "Failed to update profile. Please try again.");
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
