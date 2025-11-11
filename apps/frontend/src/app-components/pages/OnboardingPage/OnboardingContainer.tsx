import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useOnboarding } from "@/hooks/useOnboarding";
import Step1Welcome from "./Step1Welcome";
import Step2ProfileSetup from "./Step2ProfileSetup";
import Step3FirstBudget from "./Step3FirstBudget";
import Step4FirstExpense from "./Step4FirstExpense";
import OnboardingCompletion from "./OnboardingCompletion";

const OnboardingContainer = () => {
	const [currentStep, setCurrentStep] = useState(1);
	const [budgetData, setBudgetData] = useState<any>(null);
	const { user, updateUser } = useAuth();
	const { completeOnboarding } = useOnboarding();
	const navigate = useNavigate();

	const totalSteps = 4;

	const handleNext = () => {
		if (currentStep < totalSteps) {
			setCurrentStep(currentStep + 1);
		} else {
			setCurrentStep(5); // Completion screen
		}
	};

	const handleBack = () => {
		if (currentStep > 1) {
			setCurrentStep(currentStep - 1);
		}
	};

	const handleSkip = () => {
		// When skipping, don't mark onboarding as complete
		// Just navigate to dashboard - user can complete onboarding later
		navigate("/dashboard");
	};

	const handleComplete = async () => {
		// Call backend API to mark onboarding as complete
		const success = await completeOnboarding();

		if (success && user) {
			// Update local context and localStorage
			const updatedUser = {
				...user,
				hasCompletedOnboarding: true,
			};
			updateUser(updatedUser);
			localStorage.setItem("user", JSON.stringify(updatedUser));

			// Navigate to dashboard
			navigate("/dashboard");
		} else {
			console.error("Failed to complete onboarding");
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50/30 to-slate-100 flex items-center justify-center p-4">
			<div className="w-full max-w-3xl">
				{/* Progress Bar */}
				{currentStep <= totalSteps && (
					<div className="mb-8">
						<div className="flex justify-between items-center mb-2">
							<span className="text-sm font-medium text-slate-700">
								Step {currentStep} of {totalSteps}
							</span>
							<span className="text-sm text-slate-500">{Math.round((currentStep / totalSteps) * 100)}% Complete</span>
						</div>
						<div className="h-2 bg-slate-200 rounded-full overflow-hidden">
							<div
								className="h-full bg-gradient-to-r from-green-600 to-green-700 transition-all duration-500 ease-out"
								style={{ width: `${(currentStep / totalSteps) * 100}%` }}
							></div>
						</div>
					</div>
				)}

				{/* Step Content */}
				<div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 p-8 md:p-12">
					{currentStep === 1 && <Step1Welcome onNext={handleNext} onSkip={handleSkip} userName={user?.name || ""} />}
					{currentStep === 2 && <Step2ProfileSetup onNext={handleNext} onBack={handleBack} />}
					{currentStep === 3 && (
						<Step3FirstBudget onNext={handleNext} onBack={handleBack} onBudgetCreated={setBudgetData} />
					)}
					{currentStep === 4 && <Step4FirstExpense onNext={handleNext} onBack={handleBack} budget={budgetData} />}
					{currentStep === 5 && <OnboardingCompletion onComplete={handleComplete} />}
				</div>
			</div>
		</div>
	);
};

export default OnboardingContainer;
