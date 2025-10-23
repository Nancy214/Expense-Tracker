import { type AuthenticatedUser, type ProfileData, ZProfileData } from "@expense-tracker/shared-types/src";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useState } from "react";
import { type UseFormReturn, useForm } from "react-hook-form";
import { useAuth } from "@/context/AuthContext";
import { removeProfilePicture, updateProfile } from "@/services/profile.service";

// Return type interface for the hook
interface UseProfileFormReturn {
	form: UseFormReturn<ProfileData>;
	error: string;
	isEditing: boolean;
	isLoading: boolean;
	photoRemoved: boolean;
	handleProfilePictureChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	handleRemovePhoto: () => void;
	onSubmit: (data: ProfileData) => Promise<void>;
	handleCancel: () => void;
	setIsEditing: (editing: boolean) => void;
	user: AuthenticatedUser | null;
}

const VALID_FILE_TYPES = ["image/jpeg", "image/png", "image/jpg", "image/webp"] as const;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const validateProfilePicture = (file: File): boolean => {
	return file.size <= MAX_FILE_SIZE && VALID_FILE_TYPES.includes(file.type as any);
};

export const useProfileForm = (): UseProfileFormReturn => {
	const { user, updateUser } = useAuth();
	const [error, setError] = useState<string>("");
	const [isEditing, setIsEditing] = useState<boolean>(false);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [photoRemoved, setPhotoRemoved] = useState<boolean>(false);

	const form: UseFormReturn<ProfileData> = useForm<ProfileData>({
		resolver: zodResolver(ZProfileData),
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
					form.setValue("profilePicture", file, {
						shouldValidate: true,
					});
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
		async (data: ProfileData): Promise<void> => {
			setIsLoading(true);
			setError("");

			try {
				// If photo was removed, call backend to delete it first
				if (photoRemoved) {
					await removeProfilePicture();
				}
				console.log("data", data);

				const updatedProfile: AuthenticatedUser = await updateProfile(data);
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
				const userForAuth: AuthenticatedUser = {
					id: updatedProfile.id,
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
		user: user ?? null,
	};
};
