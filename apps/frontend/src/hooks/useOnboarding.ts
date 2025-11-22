import { useState } from "react";
import type { OnboardingProfileSetup, AuthenticatedUser } from "@expense-tracker/shared-types/src";
import axiosInstance from "@/services/axiosInstance";

export const useOnboarding = () => {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const updateProfile = async (data: OnboardingProfileSetup): Promise<AuthenticatedUser | null> => {
		setIsLoading(true);
		setError(null);

		try {
			const response = await axiosInstance.patch("/onboarding/profile", data);
			return response.data.user;
		} catch (err: any) {
			const errorMessage = err.response?.data?.message || "Failed to update profile";
			setError(errorMessage);
			console.error("Error updating profile:", err);
			return null;
		} finally {
			setIsLoading(false);
		}
	};

	const updateProgress = async (step: number): Promise<boolean> => {
		setIsLoading(true);
		setError(null);

		try {
			await axiosInstance.patch("/onboarding/progress", { step });
			return true;
		} catch (err: any) {
			const errorMessage = err.response?.data?.message || "Failed to update progress";
			setError(errorMessage);
			console.error("Error updating progress:", err);
			return false;
		} finally {
			setIsLoading(false);
		}
	};

	const completeOnboarding = async (): Promise<boolean> => {
		setIsLoading(true);
		setError(null);

		try {
			await axiosInstance.post("/onboarding/complete");
			return true;
		} catch (err: any) {
			const errorMessage = err.response?.data?.message || "Failed to complete onboarding";
			setError(errorMessage);
			console.error("Error completing onboarding:", err);
			return false;
		} finally {
			setIsLoading(false);
		}
	};

	const getOnboardingStatus = async () => {
		setIsLoading(true);
		setError(null);

		try {
			const response = await axiosInstance.get("/onboarding/status");
			return response.data;
		} catch (err: any) {
			const errorMessage = err.response?.data?.message || "Failed to get onboarding status";
			setError(errorMessage);
			console.error("Error getting onboarding status:", err);
			return null;
		} finally {
			setIsLoading(false);
		}
	};

	return {
		updateProfile,
		updateProgress,
		completeOnboarding,
		getOnboardingStatus,
		isLoading,
		error,
	};
};
