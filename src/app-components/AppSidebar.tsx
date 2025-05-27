import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, BarChart2, Receipt, PiggyBank } from "lucide-react";
import {
	Sidebar,
	SidebarHeader,
	SidebarContent,
	SidebarMenu,
	SidebarMenuItem,
	useSidebar,
	SidebarTrigger,
} from "@/components/ui/sidebar";

interface MenuItem {
	title: string;
	icon: React.ReactElement;
	path: string;
}

const menuItems: MenuItem[] = [
	{
		title: "Home",
		icon: <Home className="h-5 w-5" />,
		path: "/",
	},
	{
		title: "Statistics",
		icon: <BarChart2 className="h-5 w-5" />,
		path: "/statistics",
	},
	{
		title: "Transactions",
		icon: <Receipt className="h-5 w-5" />,
		path: "/transactions",
	},
	{
		title: "Budget",
		icon: <PiggyBank className="h-5 w-5" />,
		path: "/budget",
	},
];

export function AppSidebar(): React.ReactElement {
	const navigate = useNavigate();
	const { pathname } = useLocation();
	const { open } = useSidebar();

	return (
		<>
			<SidebarTrigger />
			<Sidebar collapsible="icon">
				<div className="h-full py-4">
					<SidebarHeader>
						<div className="flex items-center justify-between px-3 py-2">
							<h2 className="text-lg font-semibold">
								<span className="group-[.collapsed]:hidden">
									{open ? "Expense Tracker" : ""}
								</span>
							</h2>
						</div>
					</SidebarHeader>
					<SidebarContent>
						<SidebarMenu>
							{menuItems.map((item) => (
								<SidebarMenuItem key={item.path}>
									<button
										className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors rounded-md ${
											pathname === item.path
												? "bg-secondary text-secondary-foreground"
												: "hover:bg-secondary/10"
										}`}
										onClick={() => navigate(item.path)}
									>
										<div className="flex items-center gap-2">
											{item.icon}
											{open && <span>{item.title}</span>}
										</div>
									</button>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarContent>
				</div>
			</Sidebar>
		</>
	);
}
