import { motion } from "framer-motion";
import { CheckCircle2, Sparkles, TrendingUp, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import Confetti from "react-confetti";
import { useEffect, useState } from "react";
import { useOnboarding } from "@/hooks/useOnboarding";

interface OnboardingCompletionProps {
	onComplete: () => void;
}

const OnboardingCompletion = ({ onComplete }: OnboardingCompletionProps) => {
	const [showConfetti, setShowConfetti] = useState(true);
	const [windowDimensions, setWindowDimensions] = useState({
		width: window.innerWidth,
		height: window.innerHeight,
	});
	const { completeOnboarding } = useOnboarding();

	useEffect(() => {
		const handleResize = () => {
			setWindowDimensions({
				width: window.innerWidth,
				height: window.innerHeight,
			});
		};

		window.addEventListener("resize", handleResize);

		// Mark onboarding as complete
		completeOnboarding();

		// Stop confetti after 5 seconds
		const timer = setTimeout(() => {
			setShowConfetti(false);
		}, 5000);

		return () => {
			window.removeEventListener("resize", handleResize);
			clearTimeout(timer);
		};
	}, [completeOnboarding]);

	const achievements = [
		{
			icon: <CheckCircle2 className="w-6 h-6 text-green-600" />,
			title: "Profile Set Up",
			description: "Your account is personalized",
		},
		{
			icon: <Target className="w-6 h-6 text-slate-600" />,
			title: "First Budget Created",
			description: "You're ready to track spending",
		},
		{
			icon: <TrendingUp className="w-6 h-6 text-green-700" />,
			title: "First Expense Logged",
			description: "Your financial journey begins",
		},
	];

	return (
		<>
			{showConfetti && (
				<Confetti
					width={windowDimensions.width}
					height={windowDimensions.height}
					recycle={false}
					numberOfPieces={500}
				/>
			)}

			<motion.div
				initial={{ opacity: 0, scale: 0.9 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ duration: 0.5 }}
				className="text-center"
			>
				{/* Success Icon */}
				<motion.div
					initial={{ scale: 0 }}
					animate={{ scale: 1 }}
					transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
					className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-green-600 to-slate-700 rounded-full mb-6 shadow-lg"
				>
					<Sparkles className="w-12 h-12 text-white" />
				</motion.div>

				{/* Congratulations Message */}
				<motion.h1
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.3 }}
					className="text-3xl md:text-4xl font-bold text-slate-900 mb-3"
				>
					You're All Set! 🎉
				</motion.h1>

				<motion.p
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.4 }}
					className="text-lg text-slate-600 mb-10 max-w-2xl mx-auto"
				>
					Congratulations! You've successfully set up your account. You're now ready to take control of your finances.
				</motion.p>

				{/* Achievements */}
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.5 }}
					className="grid md:grid-cols-3 gap-6 mb-10"
				>
					{achievements.map((achievement, index) => (
						<motion.div
							key={index}
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.6 + index * 0.1 }}
							className="p-6 bg-gradient-to-br from-green-50/30 to-white rounded-xl border border-slate-200/50"
						>
							<div className="inline-flex items-center justify-center w-12 h-12 bg-white rounded-lg shadow-sm mb-4">
								{achievement.icon}
							</div>
							<h3 className="font-semibold text-slate-900 mb-2">{achievement.title}</h3>
							<p className="text-sm text-slate-600">{achievement.description}</p>
						</motion.div>
					))}
				</motion.div>

				{/* Next Steps */}
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.9 }}
					className="bg-gradient-to-br from-green-50 to-slate-50 rounded-xl p-6 mb-8 border border-green-200/50"
				>
					<h3 className="font-semibold text-slate-900 mb-3">What's Next?</h3>
					<ul className="text-sm text-slate-700 space-y-2 text-left max-w-md mx-auto">
						<li className="flex items-start gap-2">
							<span className="text-green-600 font-bold">•</span>
							<span>Explore your dashboard to see your financial overview</span>
						</li>
						<li className="flex items-start gap-2">
							<span className="text-green-600 font-bold">•</span>
							<span>Add more transactions to track your spending patterns</span>
						</li>
						<li className="flex items-start gap-2">
							<span className="text-green-600 font-bold">•</span>
							<span>Set up additional budgets for different categories</span>
						</li>
						<li className="flex items-start gap-2">
							<span className="text-green-600 font-bold">•</span>
							<span>Check analytics to gain insights into your finances</span>
						</li>
					</ul>
				</motion.div>

				{/* Action Button */}
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 1.0 }}
				>
					<Button onClick={onComplete} size="lg" className="px-12 py-6 text-lg font-semibold shadow-lg">
						Go to Dashboard
					</Button>
				</motion.div>
			</motion.div>
		</>
	);
};

export default OnboardingCompletion;
