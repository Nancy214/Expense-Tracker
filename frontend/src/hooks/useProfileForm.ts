import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/context/AuthContext";
import { updateProfile, removeProfilePicture } from "@/services/profile.service";
import { profileSchema, ProfileFormData, validateProfilePicture } from "@/schemas/profileSchema";

export const useProfileForm = () => {
    const { user, updateUser } = useAuth();
    const [error, setError] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [photoRemoved, setPhotoRemoved] = useState(false);

    const form = useForm<ProfileFormData>({
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

    const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            if (validateProfilePicture(file)) {
                form.setValue("profilePicture", file, { shouldValidate: true });
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
        setIsLoading(true);
        setError("");

        try {
            // If photo was removed, call backend to delete it first
            if (photoRemoved) {
                await removeProfilePicture();
            }

            const updatedProfile = await updateProfile(data);
            form.reset({
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
            setIsEditing(false);
            setPhotoRemoved(false);
        } catch (error: any) {
            console.error("Error updating profile:", error);
            setError(error.response?.data?.message || "Failed to update profile. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
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
    };

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
