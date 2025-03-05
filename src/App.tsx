import { BrowserRouter } from 'react-router-dom';

import { AppSidebar } from '@/app-components/AppSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import AppRoutes from '@/app-components/AppRoutes';

export default function ExpenseTracker() {
  return (
    <>
      <BrowserRouter>
        <SidebarProvider defaultOpen={true}>
          <AppSidebar />
          <AppRoutes />
        </SidebarProvider>
      </BrowserRouter>
    </>
  );
}
