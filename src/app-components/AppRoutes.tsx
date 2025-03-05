import React from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from '@/app-components/pages/HomePage';
import StatisticsPage from '@/app-components/pages/StatisticsPage';
import TransactionsPage from '@/app-components/pages/TransactionsPage';
import BudgetPage from '@/app-components/pages/BudgetPage';

import {
  SidebarTrigger,
} from '@/components/ui/sidebar';

export default function AppRoutes(): React.ReactElement {
  return (
    <main className='flex-1 transition-all duration-300'>
      <SidebarTrigger />
      <Routes>
        <Route
          path='/'
          element={<HomePage />}
        />
        <Route
          path='/statistics'
          element={<StatisticsPage />}
        />
        <Route
          path='/transactions'
          element={<TransactionsPage />}
        />
        <Route
          path='/budget'
          element={<BudgetPage />}
        />
      </Routes>
    </main>
  );
}
