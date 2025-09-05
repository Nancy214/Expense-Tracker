import { useState, useCallback } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/context/AuthContext";
import { updateProfile, removeProfilePicture } from "@/services/profile.service";
import { profileSchema, ProfileFormData, validateProfilePicture } from "@/schemas/profileSchema";
import { User } from "@/types/auth";
import { ProfileResponse } from "@/types/profile";

// Backend response type for updateProfile
interface UpdateProfileResponse {
    success: boolean;
    message: string;
    user: ProfileResponse;
}

// Return type interface for the hook
interface UseProfileFormReturn {
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
    user: User | null;
}

export const useProfileForm = (): UseProfileFormReturn => {
    const { user, updateUser } = useAuth();
    const [error, setError] = useState<string>("");
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [photoRemoved, setPhotoRemoved] = useState<boolean>(false);

    const form: UseFormReturn<ProfileFormData> = useForm<ProfileFormData>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            name: user?.name || "",
            email: user?.email || "",
            profilePicture: user?.profilePicture || "",
            phoneNumber: user?.phoneNumber || "",
            dateOfBirth: user?.dateOfBirth || "",
            currency: user?.currency || "INR",
            country: user?.country || "",
        },
    });

    const handleProfilePictureChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>): void => {
            if (e.target.files?.[0]) {
                const file: File = e.target.files[0];
                if (validateProfilePicture(file)) {
                    form.setValue("profilePicture", file, { shouldValidate: true });
                } else {
                    setError("Please upload a valid image file (JPEG, PNG, or JPG)");
                }
            }
        },
        [form]
    );

    const handleRemovePhoto = useCallback((): void => {
        form.setValue("profilePicture", "", { shouldValidate: true });
        setPhotoRemoved(true);
    }, [form]);

    const onSubmit = useCallback(
        async (data: ProfileFormData): Promise<void> => {
            setIsLoading(true);
            setError("");

            try {
                // If photo was removed, call backend to delete it first
                if (photoRemoved) {
                    await removeProfilePicture();
                }

                const updatedProfile: UpdateProfileResponse = await updateProfile(data);
                form.reset({
                    name: updatedProfile.user.name,
                    email: updatedProfile.user.email,
                    profilePicture: updatedProfile.user.profilePicture || "",
                    phoneNumber: updatedProfile.user.phoneNumber || "",
                    dateOfBirth: updatedProfile.user.dateOfBirth || "",
                    currency: updatedProfile.user.currency || "INR",
                    country: updatedProfile.user.country || "",
                });

                // Convert ProfileResponse to User type for AuthContext
                const userForAuth: User = {
                    id: updatedProfile.user._id,
                    email: updatedProfile.user.email,
                    name: updatedProfile.user.name,
                    profilePicture: updatedProfile.user.profilePicture,
                    phoneNumber: updatedProfile.user.phoneNumber,
                    dateOfBirth: updatedProfile.user.dateOfBirth,
                    currency: updatedProfile.user.currency,
                    country: updatedProfile.user.country,
                    timezone: updatedProfile.user.timezone,
                    settings: updatedProfile.user.settings,
                };

                localStorage.setItem("user", JSON.stringify(userForAuth));
                updateUser(userForAuth);
                setIsEditing(false);
                setPhotoRemoved(false);
            } catch (error: unknown) {
                console.error("Error updating profile:", error);
                const errorMessage: string =
                    (error as any)?.response?.data?.message || "Failed to update profile. Please try again.";
                setError(errorMessage);
            } finally {
                setIsLoading(false);
            }
        },
        [photoRemoved, form, updateUser]
    );

    const handleCancel = useCallback((): void => {
        form.reset({
            name: user?.name || "",
            email: user?.email || "",
            profilePicture: user?.profilePicture || "",
            phoneNumber: user?.phoneNumber || "",
            dateOfBirth: user?.dateOfBirth || "",
            currency: user?.currency || "INR",
            country: user?.country || "",
        });
        setPhotoRemoved(false);
        setIsEditing(false);
    }, [form, user]);

    return {
        form,
        error,
        isEditing,
        isLoading,
        photoRemoved,
        handleProfilePictureChange,
        handleRemovePhoto,
        onSubmit,
        handleCancel,
        setIsEditing,
        user,
    };
};
