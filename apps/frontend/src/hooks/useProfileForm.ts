import { useState, useCallback, useEffect } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/context/AuthContext";
import { updateProfile, removeProfilePicture } from "@/services/profile.service";
import { profileSchema, ProfileFormData, validateProfilePicture } from "@/schemas/profileSchema";
import { User } from "@expense-tracker/shared-types/src/auth";
import { ProfileResponse } from "../../../../libs/shared-types/src/profile-frontend";

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
        mode: "onChange", // Enable real-time validation
        defaultValues: {
            name: user?.name || "",
            email: user?.email || "",
            profilePicture: user?.profilePicture || "",
            phoneNumber: user?.phoneNumber || "",
            dateOfBirth: user?.dateOfBirth || "",
            currency: user?.currency || "",
            country: user?.country || "",
            timezone: user?.timezone || "",
        },
    });

    // Reset form when user data changes
    useEffect(() => {
        if (user) {
            form.reset({
                name: user.name || "",
                email: user.email || "",
                profilePicture: user.profilePicture || "",
                phoneNumber: user.phoneNumber || "",
                dateOfBirth: user.dateOfBirth || "",
                currency: user.currency || "",
                country: user.country || "",
                timezone: user.timezone || "",
            });
        }
    }, [user, form]);

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
                console.log("data", data);

                const updatedProfile: ProfileResponse = await updateProfile(data);
                form.reset({
                    name: user?.name || "",
                    email: user?.email || "",
                    profilePicture: user?.profilePicture || "",
                    phoneNumber: user?.phoneNumber || "",
                    dateOfBirth: user?.dateOfBirth || "",
                    currency: user?.currency || "",
                    country: user?.country || "",
                    timezone: user?.timezone || "",
                });

                // Convert ProfileResponse to User type for AuthContext
                const userForAuth: User = {
                    id: updatedProfile._id,
                    email: updatedProfile.email,
                    name: updatedProfile.name,
                    profilePicture: updatedProfile.profilePicture,
                    phoneNumber: updatedProfile.phoneNumber,
                    dateOfBirth: updatedProfile.dateOfBirth,
                    currency: updatedProfile.currency,
                    country: updatedProfile.country,
                    timezone: updatedProfile.timezone,
                    settings: updatedProfile.settings,
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
            currency: user?.currency || "",
            country: user?.country || "",
            timezone: user?.timezone || "",
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
