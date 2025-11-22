import { motion } from "framer-motion";
import { Globe, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ZOnboardingProfileSetup, type OnboardingProfileSetup } from "@expense-tracker/shared-types/src";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCountryTimezoneCurrency } from "@/hooks/use-profile";

interface Step2ProfileSetupProps {
	onNext: () => void;
	onBack: () => void;
}

const Step2ProfileSetup = ({ onNext, onBack }: Step2ProfileSetupProps) => {
	const { user, updateUser } = useAuth();
	const { updateProfile } = useOnboarding();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const { data: countryData, isLoading: isLoadingCountryData } = useCountryTimezoneCurrency();

	// Use countries directly from countryData
	const countries = useMemo(() => {
		if (!countryData) return [];
		return countryData
			.filter((c) => c.country && c.country !== "")
			.map((c) => ({
				code: c.country,
				name: c.country,
				timezones: c.timezones,
			}))
			.sort((a, b) => a.name.localeCompare(b.name));
	}, [countryData]);

	const {
		control,
		handleSubmit,
		watch,
		setValue,
		formState: { errors },
	} = useForm<OnboardingProfileSetup>({
		resolver: zodResolver(ZOnboardingProfileSetup),
		defaultValues: {
			name: user?.name || "",
			currency: user?.currency || "",
			country: user?.country || "",
			timezone: user?.timezone || "",
		},
	});

	const selectedCountry = watch("country");

	// Get currency for selected country
	const availableCurrency = useMemo(() => {
		if (!selectedCountry) return null;

		const countryDataItem = countryData?.find((c) => c.country === selectedCountry);
		if (!countryDataItem || !countryDataItem.currency) return null;

		return countryDataItem.currency;
	}, [selectedCountry, countryData]);

	// Get timezones for selected country
	const availableTimezones = useMemo(() => {
		if (!selectedCountry) return [];

		const country = countries.find((c) => c.code === selectedCountry);
		if (!country || !country.timezones) return [];

		return country.timezones.map((timezone) => ({
			value: timezone,
			label: timezone,
		}));
	}, [selectedCountry, countries]);

	// Auto-set currency and timezone when country changes
	const handleCountryChange = (countryCode: string) => {
		const country = countries.find((c) => c.code === countryCode);
		const countryDataItem = countryData?.find((c) => c.country === countryCode);

		// Auto-set currency - always use the currency CODE, not the symbol
		if (countryDataItem?.currency) {
			setValue("currency", countryDataItem.currency.code);
		}

		// Auto-set timezone (first one if multiple available)
		if (country && country.timezones.length > 0) {
			setValue("timezone", country.timezones[0]);
		}
	};

	const onSubmit = async (data: OnboardingProfileSetup) => {
		setIsSubmitting(true);
		try {
			// Get the currency symbol from the country data
			const countryDataItem = countryData?.find((c) => c.country === data.country);
			const currencySymbol = countryDataItem?.currency?.symbol || countryDataItem?.currency?.code || data.currency;

			// Ensure currency is the code, not the symbol
			const currencyCode = countryDataItem?.currency?.code || data.currency;

			// Add currency code and symbol to the data
			const dataWithCurrency = { ...data, currency: currencyCode, currencySymbol };

			const updatedUser = await updateProfile(dataWithCurrency);
			if (updatedUser) {
				updateUser(updatedUser);
			}
			onNext();
		} catch (error) {
			console.error("Error updating profile:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	// Show loading state while fetching country data
	if (isLoadingCountryData) {
		return (
			<motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="flex items-center justify-center min-h-[400px]">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
					<p className="text-gray-600">Loading country data...</p>
				</div>
			</motion.div>
		);
	}

	return (
		<motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
			{/* Header */}
			<div className="text-center mb-8">
				<motion.div
					initial={{ scale: 0 }}
					animate={{ scale: 1 }}
					transition={{ type: "spring", stiffness: 200 }}
					className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-600 to-slate-700 rounded-full mb-4 shadow-lg"
				>
					<Globe className="w-8 h-8 text-white" />
				</motion.div>
				<h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">Set Up Your Profile</h2>
				<p className="text-slate-600">Tell us a bit about yourself so we can personalize your experience</p>
			</div>

			{/* Form */}
			<form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
				{/* Name Field */}
				<div>
					<Label htmlFor="name" className="text-sm font-medium text-gray-700">
						Your Name
					</Label>
					<Controller name="name" control={control} render={({ field }) => <Input {...field} id="name" placeholder="Enter your name" className="mt-1" />} />
					{errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
				</div>

				{/* Country Field - First to select */}
				<div>
					<Label htmlFor="country" className="text-sm font-medium text-gray-700">
						Country <span className="text-red-500">*</span>
					</Label>
					<Controller
						name="country"
						control={control}
						render={({ field }) => (
							<Select
								onValueChange={(value) => {
									field.onChange(value);
									handleCountryChange(value);
								}}
								value={field.value}
							>
								<SelectTrigger className="mt-1">
									<SelectValue placeholder="Select your country" />
								</SelectTrigger>
								<SelectContent>
									{(() => {
										const baseOptions = countries.filter((country) => country.code && country.code !== "");
										const currentValue = field.value;

										// If the current value is not in the options, add it
										if (currentValue && currentValue !== "" && !baseOptions.some((option) => option.code === currentValue)) {
											return [
												...baseOptions,
												{
													code: currentValue,
													name: currentValue,
													timezones: [],
												},
											].map((country) => (
												<SelectItem key={country.code} value={country.code}>
													{country.name}
												</SelectItem>
											));
										}

										return baseOptions.map((country) => (
											<SelectItem key={country.code} value={country.code}>
												{country.name}
											</SelectItem>
										));
									})()}
								</SelectContent>
							</Select>
						)}
					/>
					{errors.country && <p className="text-sm text-red-600 mt-1">{errors.country.message}</p>}
				</div>

				{/* Currency Field - Auto-populated based on country */}
				{selectedCountry && availableCurrency && (
					<div>
						<div className="flex items-center gap-2 mb-1">
							<Label htmlFor="currency" className="text-sm font-medium text-gray-700">
								Currency <span className="text-red-500">*</span>
							</Label>
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<Info className="w-4 h-4 text-gray-400 cursor-help" />
									</TooltipTrigger>
									<TooltipContent>
										<p className="w-48">Currency is automatically set based on your selected country</p>
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						</div>
						<Controller
							name="currency"
							control={control}
							render={() => (
								<div className="mt-1 flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
									<span className="font-medium text-lg">{availableCurrency.symbol}</span>
									<span className="text-gray-700">
										{availableCurrency.name} ({availableCurrency.code})
									</span>
								</div>
							)}
						/>
						{errors.currency && <p className="text-sm text-red-600 mt-1">{errors.currency.message}</p>}
					</div>
				)}

				{/* Timezone Field - Selectable if multiple timezones */}
				{selectedCountry && availableTimezones.length > 0 && (
					<div>
						<Label htmlFor="timezone" className="text-sm font-medium text-gray-700">
							Timezone {availableTimezones.length === 1 ? "" : <span className="text-red-500">*</span>}
						</Label>
						<Controller
							name="timezone"
							control={control}
							render={({ field }) =>
								availableTimezones.length === 1 ? (
									<div className="mt-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700">{availableTimezones[0].label}</div>
								) : (
									<Select onValueChange={field.onChange} value={field.value}>
										<SelectTrigger className="mt-1">
											<SelectValue placeholder="Select timezone" />
										</SelectTrigger>
										<SelectContent>
											{(() => {
												const baseOptions = availableTimezones;
												const currentValue = field.value;

												// If the current value is not in the options, add it
												if (currentValue && currentValue !== "" && !baseOptions.some((option) => option.value === currentValue)) {
													return [
														...baseOptions,
														{
															value: currentValue,
															label: currentValue,
														},
													].map((timezone) => (
														<SelectItem key={timezone.value} value={timezone.value}>
															{timezone.label}
														</SelectItem>
													));
												}

												return baseOptions.map((timezone) => (
													<SelectItem key={timezone.value} value={timezone.value}>
														{timezone.label}
													</SelectItem>
												));
											})()}
										</SelectContent>
									</Select>
								)
							}
						/>
						{errors.timezone && <p className="text-sm text-red-600 mt-1">{errors.timezone.message}</p>}
					</div>
				)}

				{/* Action Buttons */}
				<div className="flex gap-4 pt-6">
					<Button type="button" onClick={onBack} variant="outline" size="lg" className="flex-1">
						Back
					</Button>
					<Button type="submit" size="lg" className="flex-1" disabled={isSubmitting}>
						{isSubmitting ? "Saving..." : "Continue"}
					</Button>
				</div>
			</form>
		</motion.div>
	);
};

export default Step2ProfileSetup;
