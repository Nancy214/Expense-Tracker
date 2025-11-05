import { motion } from "motion/react";
import {
    ArrowRight,
    BarChart3,
    Calendar,
    CheckCircle,
    PieChart,
    Receipt,
    Shield,
    Sparkles,
    Target,
    TrendingUp,
    Users,
    Wallet,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
        },
    },
};

const scaleIn = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1 },
};

export default function LandingPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50/30 to-slate-100">
            {/* Navigation */}
            <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-3"
                        >
                            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-green-600 to-slate-700 text-white grid place-items-center shadow-lg">
                                <span className="text-lg font-bold">T</span>
                            </div>
                            <span className="text-2xl font-bold bg-gradient-to-r from-green-700 to-slate-800 bg-clip-text text-transparent">
                                Trauss
                            </span>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-4"
                        >
                            <Button
                                variant="ghost"
                                onClick={() => navigate("/login")}
                                className="text-slate-700 hover:text-green-700 hover:bg-green-50/50"
                            >
                                Sign In
                            </Button>
                            <Button
                                onClick={() => navigate("/register")}
                                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg shadow-green-600/25"
                            >
                                Get Started
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </motion.div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <motion.div
                            initial="hidden"
                            animate="visible"
                            variants={staggerContainer}
                            className="space-y-8"
                        >
                            <motion.div
                                variants={fadeInUp}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100/50 border border-green-200/50 text-green-800"
                            >
                                <Sparkles className="h-4 w-4" />
                                <span className="text-sm font-medium">Smart Financial Management</span>
                            </motion.div>
                            <motion.h1
                                variants={fadeInUp}
                                className="text-5xl lg:text-6xl font-bold text-slate-900 leading-tight"
                            >
                                Take Control of Your{" "}
                                <span className="bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent">
                                    Financial Future
                                </span>
                            </motion.h1>
                            <motion.p variants={fadeInUp} className="text-xl text-slate-600 leading-relaxed">
                                Track expenses, manage budgets, and gain valuable insights into your spending habits
                                with Trauss — your intelligent expense tracking companion.
                            </motion.p>
                            <motion.div variants={fadeInUp} className="flex flex-wrap gap-4">
                                <Button
                                    size="lg"
                                    onClick={() => navigate("/register")}
                                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-xl shadow-green-600/30 text-lg px-8"
                                >
                                    Start Free Trial
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="border-2 border-slate-300 text-slate-700 hover:bg-slate-50 text-lg px-8"
                                >
                                    Watch Demo
                                </Button>
                            </motion.div>
                            <motion.div variants={fadeInUp} className="flex items-center gap-8 pt-4">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                    <span className="text-slate-600">Free forever</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                    <span className="text-slate-600">No credit card required</span>
                                </div>
                            </motion.div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, rotateY: -15 }}
                            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className="relative"
                        >
                            <div className="relative z-10">
                                <Card className="bg-white/80 backdrop-blur-sm border-slate-200/50 shadow-2xl">
                                    <CardContent className="p-8">
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-lg font-semibold text-slate-700">
                                                    Monthly Overview
                                                </h3>
                                                <span className="text-sm text-slate-500">November 2025</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <motion.div
                                                    whileHover={{ scale: 1.05 }}
                                                    className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-green-100/50 border border-green-200/50"
                                                >
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <TrendingUp className="h-4 w-4 text-green-600" />
                                                        <span className="text-xs font-medium text-green-700">
                                                            Income
                                                        </span>
                                                    </div>
                                                    <p className="text-2xl font-bold text-green-700">$5,420</p>
                                                </motion.div>
                                                <motion.div
                                                    whileHover={{ scale: 1.05 }}
                                                    className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200/50"
                                                >
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Wallet className="h-4 w-4 text-slate-600" />
                                                        <span className="text-xs font-medium text-slate-700">
                                                            Expenses
                                                        </span>
                                                    </div>
                                                    <p className="text-2xl font-bold text-slate-700">$3,280</p>
                                                </motion.div>
                                            </div>
                                            <div className="space-y-3">
                                                {[
                                                    { category: "Groceries", amount: "$420", percentage: 65 },
                                                    { category: "Transportation", amount: "$280", percentage: 45 },
                                                    { category: "Entertainment", amount: "$180", percentage: 30 },
                                                ].map((item, index) => (
                                                    <motion.div
                                                        key={item.category}
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: 0.5 + index * 0.1 }}
                                                        className="space-y-2"
                                                    >
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-slate-600">{item.category}</span>
                                                            <span className="font-semibold text-slate-900">
                                                                {item.amount}
                                                            </span>
                                                        </div>
                                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${item.percentage}%` }}
                                                                transition={{ duration: 1, delay: 0.8 + index * 0.1 }}
                                                                className="h-full bg-gradient-to-r from-green-500 to-green-600"
                                                            />
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                            {/* Decorative elements */}
                            <div className="absolute -top-4 -right-4 w-72 h-72 bg-green-200/30 rounded-full blur-3xl -z-10" />
                            <div className="absolute -bottom-4 -left-4 w-72 h-72 bg-slate-200/30 rounded-full blur-3xl -z-10" />
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white/50">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.3 }}
                        variants={staggerContainer}
                        className="text-center mb-16"
                    >
                        <motion.h2 variants={fadeInUp} className="text-4xl font-bold text-slate-900 mb-4">
                            Everything You Need to Manage Your Finances
                        </motion.h2>
                        <motion.p variants={fadeInUp} className="text-xl text-slate-600 max-w-2xl mx-auto">
                            Powerful features designed to give you complete control over your financial life
                        </motion.p>
                    </motion.div>

                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.2 }}
                        variants={staggerContainer}
                        className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
                    >
                        {[
                            {
                                icon: Receipt,
                                title: "Transaction Tracking",
                                description:
                                    "Effortlessly record and categorize all your income and expenses in one place",
                                gradient: "from-green-500 to-green-600",
                            },
                            {
                                icon: PieChart,
                                title: "Budget Management",
                                description:
                                    "Set budgets for different categories and track your progress in real-time",
                                gradient: "from-slate-500 to-slate-600",
                            },
                            {
                                icon: BarChart3,
                                title: "Advanced Analytics",
                                description:
                                    "Visualize your spending patterns with beautiful charts and insightful reports",
                                gradient: "from-green-600 to-slate-600",
                            },
                            {
                                icon: Calendar,
                                title: "Calendar View",
                                description:
                                    "See your financial activities on a calendar for better planning and organization",
                                gradient: "from-slate-600 to-green-600",
                            },
                            {
                                icon: Target,
                                title: "Financial Goals",
                                description: "Set and track financial goals to stay motivated and achieve your dreams",
                                gradient: "from-green-500 to-green-700",
                            },
                            {
                                icon: Shield,
                                title: "Secure & Private",
                                description: "Your financial data is encrypted and protected with bank-level security",
                                gradient: "from-slate-500 to-slate-700",
                            },
                        ].map((feature) => (
                            <motion.div key={feature.title} variants={scaleIn}>
                                <Card className="h-full border-slate-200/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white/80 backdrop-blur-sm group">
                                    <CardContent className="p-6 space-y-4">
                                        <div
                                            className={`h-12 w-12 rounded-xl bg-gradient-to-br ${feature.gradient} text-white grid place-items-center shadow-lg group-hover:scale-110 transition-transform duration-300`}
                                        >
                                            <feature.icon className="h-6 w-6" />
                                        </div>
                                        <h3 className="text-xl font-semibold text-slate-900">{feature.title}</h3>
                                        <p className="text-slate-600 leading-relaxed">{feature.description}</p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* Benefits Section */}
            <section className="py-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                            className="space-y-8"
                        >
                            <h2 className="text-4xl font-bold text-slate-900">
                                Why Choose{" "}
                                <span className="bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent">
                                    Trauss
                                </span>
                                ?
                            </h2>
                            <div className="space-y-6">
                                {[
                                    {
                                        title: "Intuitive Interface",
                                        description:
                                            "Clean, modern design that makes financial management actually enjoyable",
                                    },
                                    {
                                        title: "Real-time Updates",
                                        description:
                                            "See your financial status update instantly as you add transactions",
                                    },
                                    {
                                        title: "Smart Insights",
                                        description: "Get personalized recommendations based on your spending patterns",
                                    },
                                    {
                                        title: "Export & Reports",
                                        description:
                                            "Download your data in multiple formats for taxes or personal records",
                                    },
                                ].map((benefit, index) => (
                                    <motion.div
                                        key={benefit.title}
                                        initial={{ opacity: 0, x: -20 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: index * 0.1 }}
                                        className="flex gap-4"
                                    >
                                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-green-500 to-green-600 grid place-items-center">
                                            <CheckCircle className="h-5 w-5 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-slate-900 mb-1">
                                                {benefit.title}
                                            </h3>
                                            <p className="text-slate-600">{benefit.description}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: 50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                            className="relative"
                        >
                            <Card className="bg-gradient-to-br from-green-50 to-slate-50 border-slate-200/50 shadow-2xl">
                                <CardContent className="p-8">
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-4">
                                            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-green-600 to-slate-700 grid place-items-center shadow-lg">
                                                <Users className="h-8 w-8 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="text-3xl font-bold text-slate-900">10,000+</h3>
                                                <p className="text-slate-600">Happy Users</p>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            {[
                                                { label: "User Satisfaction", value: 98 },
                                                { label: "Budget Accuracy", value: 95 },
                                                { label: "Time Saved", value: 85 },
                                            ].map((stat, index) => (
                                                <div key={stat.label} className="space-y-2">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-slate-700 font-medium">{stat.label}</span>
                                                        <span className="font-bold text-green-700">{stat.value}%</span>
                                                    </div>
                                                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            whileInView={{ width: `${stat.value}%` }}
                                                            viewport={{ once: true }}
                                                            transition={{ duration: 1, delay: 0.3 + index * 0.1 }}
                                                            className="h-full bg-gradient-to-r from-green-500 to-green-600"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <div className="absolute -bottom-4 -right-4 w-64 h-64 bg-green-200/20 rounded-full blur-3xl -z-10" />
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Testimonials Section */}
            <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white/50">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={staggerContainer}
                        className="text-center mb-16"
                    >
                        <motion.h2 variants={fadeInUp} className="text-4xl font-bold text-slate-900 mb-4">
                            Loved by Users Worldwide
                        </motion.h2>
                        <motion.p variants={fadeInUp} className="text-xl text-slate-600">
                            See what our community has to say about Trauss
                        </motion.p>
                    </motion.div>

                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.2 }}
                        variants={staggerContainer}
                        className="grid md:grid-cols-3 gap-8"
                    >
                        {[
                            {
                                name: "Sarah Johnson",
                                role: "Freelance Designer",
                                content:
                                    "Trauss has completely transformed how I manage my freelance income. The budget tracking features are incredible!",
                                rating: 5,
                            },
                            {
                                name: "Michael Chen",
                                role: "Small Business Owner",
                                content:
                                    "The analytics and reports help me understand my business expenses better. Couldn't run my business without it.",
                                rating: 5,
                            },
                            {
                                name: "Emily Rodriguez",
                                role: "Graduate Student",
                                content:
                                    "As a student on a tight budget, Trauss helps me stay on track with my spending. Simple and effective!",
                                rating: 5,
                            },
                        ].map((testimonial) => (
                            <motion.div key={testimonial.name} variants={scaleIn}>
                                <Card className="h-full border-slate-200/50 hover:shadow-lg transition-shadow bg-white/80 backdrop-blur-sm">
                                    <CardContent className="p-6 space-y-4">
                                        <div className="flex gap-1">
                                            {[...Array(testimonial.rating)].map((_, i) => (
                                                <svg
                                                    key={i}
                                                    className="h-5 w-5 text-yellow-400 fill-current"
                                                    viewBox="0 0 20 20"
                                                >
                                                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                                                </svg>
                                            ))}
                                        </div>
                                        <p className="text-slate-700 leading-relaxed">"{testimonial.content}"</p>
                                        <div className="pt-4 border-t border-slate-100">
                                            <p className="font-semibold text-slate-900">{testimonial.name}</p>
                                            <p className="text-sm text-slate-500">{testimonial.role}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <Card className="bg-gradient-to-br from-green-600 to-slate-700 border-none shadow-2xl overflow-hidden relative">
                            <CardContent className="p-12 text-center relative z-10">
                                <h2 className="text-4xl font-bold text-white mb-4">
                                    Start Your Financial Journey Today
                                </h2>
                                <p className="text-green-50 text-lg mb-8 max-w-2xl mx-auto">
                                    Join thousands of users who have taken control of their finances with Trauss. Get
                                    started in minutes — no credit card required.
                                </p>
                                <div className="flex flex-wrap justify-center gap-4">
                                    <Button
                                        size="lg"
                                        onClick={() => navigate("/register")}
                                        className="bg-white text-green-700 hover:bg-green-50 text-lg px-8 shadow-xl"
                                    >
                                        Create Free Account
                                        <ArrowRight className="ml-2 h-5 w-5" />
                                    </Button>
                                    <Button
                                        size="lg"
                                        variant="outline"
                                        className="border-2 text-green-700 border-white hover:bg-white/10 text-lg px-8"
                                    >
                                        Learn More
                                    </Button>
                                </div>
                            </CardContent>
                            {/* Decorative elements */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-green-400/10 rounded-full blur-3xl" />
                        </Card>
                    </motion.div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-slate-900 text-slate-300">
                <div className="max-w-7xl mx-auto">
                    <div className="grid md:grid-cols-4 gap-8 mb-8">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-green-600 to-slate-700 text-white grid place-items-center">
                                    <span className="text-lg font-bold">T</span>
                                </div>
                                <span className="text-xl font-bold text-white">Trauss</span>
                            </div>
                            <p className="text-sm">
                                Your intelligent expense tracking companion for a better financial future.
                            </p>
                        </div>
                        <div>
                            <h3 className="font-semibold text-white mb-4">Product</h3>
                            <ul className="space-y-2 text-sm">
                                <li>
                                    <a href="#features" className="hover:text-green-400 transition-colors">
                                        Features
                                    </a>
                                </li>
                                <li>
                                    <a href="#pricing" className="hover:text-green-400 transition-colors">
                                        Pricing
                                    </a>
                                </li>
                                <li>
                                    <a href="#security" className="hover:text-green-400 transition-colors">
                                        Security
                                    </a>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-semibold text-white mb-4">Company</h3>
                            <ul className="space-y-2 text-sm">
                                <li>
                                    <a href="#about" className="hover:text-green-400 transition-colors">
                                        About Us
                                    </a>
                                </li>
                                <li>
                                    <a href="#blog" className="hover:text-green-400 transition-colors">
                                        Blog
                                    </a>
                                </li>
                                <li>
                                    <a href="#contact" className="hover:text-green-400 transition-colors">
                                        Contact
                                    </a>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-semibold text-white mb-4">Legal</h3>
                            <ul className="space-y-2 text-sm">
                                <li>
                                    <a href="#privacy" className="hover:text-green-400 transition-colors">
                                        Privacy Policy
                                    </a>
                                </li>
                                <li>
                                    <a href="#terms" className="hover:text-green-400 transition-colors">
                                        Terms of Service
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div className="pt-8 border-t border-slate-800 text-sm text-center">
                        <p>&copy; 2025 Trauss. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
