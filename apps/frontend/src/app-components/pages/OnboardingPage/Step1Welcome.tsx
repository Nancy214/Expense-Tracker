import { motion } from "framer-motion";
import { Sparkles, TrendingUp, PieChart, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Step1WelcomeProps {
	onNext: () => void;
	onSkip: () => void;
	userName: string;
}

const Step1Welcome = ({ onNext, onSkip, userName }: Step1WelcomeProps) => {
	const features = [
		{
			icon: <TrendingUp className="w-6 h-6 text-green-600" />,
			title: "Track Spending",
			description: "Monitor your expenses in real-time",
		},
		{
			icon: <PieChart className="w-6 h-6 text-slate-600" />,
			title: "Smart Budgets",
			description: "Set and manage budgets effortlessly",
		},
		{
			icon: <Bell className="w-6 h-6 text-green-700" />,
			title: "Timely Alerts",
			description: "Get notified before you overspend",
		},
	];

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5 }}
			className="text-center"
		>
			{/* Welcome Icon */}
			<motion.div
				initial={{ scale: 0 }}
				animate={{ scale: 1 }}
				transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
				className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-600 to-slate-700 rounded-full mb-6 shadow-lg"
			>
				<Sparkles className="w-10 h-10 text-white" />
			</motion.div>

			{/* Welcome Message */}
			<motion.h1
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 0.3 }}
				className="text-3xl md:text-4xl font-bold text-gray-900 mb-3"
			>
				Welcome{userName ? `, ${userName}` : ""}! 👋
			</motion.h1>

			<motion.p
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 0.4 }}
				className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto"
			>
				Let's get you set up in just a few steps. We'll help you create your first budget and track your first expense
				so you can start seeing value immediately.
			</motion.p>

			{/* Features Grid */}
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 0.5 }}
				className="grid md:grid-cols-3 gap-6 mb-10"
			>
				{features.map((feature, index) => (
					<motion.div
						key={index}
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.6 + index * 0.1 }}
						className="p-6 bg-gradient-to-br from-green-50/30 to-white rounded-xl border border-slate-200/50"
					>
						<div className="inline-flex items-center justify-center w-12 h-12 bg-white rounded-lg shadow-sm mb-4">
							{feature.icon}
						</div>
						<h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
						<p className="text-sm text-gray-600">{feature.description}</p>
					</motion.div>
				))}
			</motion.div>

			{/* Action Buttons */}
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 0.9 }}
				className="flex flex-col sm:flex-row gap-4 justify-center items-center"
			>
				<Button onClick={onNext} size="lg" className="w-full sm:w-auto px-8 py-6 text-lg font-semibold shadow-lg">
					Let's Get Started
				</Button>
				<Button
					onClick={onSkip}
					variant="ghost"
					size="lg"
					className="w-full sm:w-auto text-gray-600 hover:text-gray-900"
				>
					Skip for now
				</Button>
			</motion.div>

			{/* Time Estimate */}
			<motion.p
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 1.0 }}
				className="text-sm text-gray-500 mt-6"
			>
				Takes about 2 minutes ⏱️
			</motion.p>
		</motion.div>
	);
};

export default Step1Welcome;
