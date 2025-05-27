import { BrowserRouter } from "react-router-dom";

import { AppSidebar } from "@/app-components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import AppRoutes from "@/app-components/AppRoutes";
import Navbar from "@/app-components/Navbar";
export default function ExpenseTracker() {
	return (
		<>
			<BrowserRouter>
				<Navbar />
				<AppRoutes />
				{/* <SidebarProvider defaultOpen={true}>
				</SidebarProvider> */}
			</BrowserRouter>
		</>
	);
}
