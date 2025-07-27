import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";

import { BillStats } from "@/types/bill";
import { getBills, getOverdueBills, getUpcomingBills, getBillStats } from "@/services/bill.service";
import { useToast } from "@/hooks/use-toast";
import BillDataTable from "@/app-components/BillDataTable";
import { BillAlertsUI } from "@/utils/billUtils.tsx";
import { useAuth } from "@/context/AuthContext";

const BillsPage = () => {
    const { toast } = useToast();
    const [stats, setStats] = useState<BillStats | null>(null);
    const [overdueBills, setOverdueBills] = useState<any[]>([]);
    const [upcomingBills, setUpcomingBills] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const { user } = useAuth();

    const [allBills, setAllBills] = useState<any[]>([]);

    useEffect(() => {
        fetchBillData();
    }, []);

    useEffect(() => {
        (async () => {
            const bills = await getBills();
            setAllBills(bills);
        })();
    }, [refreshTrigger]);

    const fetchBillData = async () => {
        try {
            setLoading(true);
            const [statsData, overdueData, upcomingData] = await Promise.all([
                getBillStats(),
                getOverdueBills(),
                getUpcomingBills(),
            ]);

            setStats(statsData);
            setOverdueBills(overdueData);
            setUpcomingBills(upcomingData);
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to fetch bill data",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center space-y-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-sm text-muted-foreground">Loading bills...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Bills Management</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Track and manage your recurring bills</p>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="flex flex-row gap-4 md:gap-6 mb-4">
                <Card className="flex-1">
                    <CardContent className="py-4 flex flex-col items-center">
                        <div className="text-lg sm:text-xl font-bold text-blue-600">{stats?.totalBills || 0}</div>
                        <div className="text-xs mt-1">Total Bills</div>
                    </CardContent>
                </Card>
                <Card className="flex-1">
                    <CardContent className="py-4 flex flex-col items-center">
                        <div className="text-lg sm:text-xl font-bold text-yellow-600">{stats?.unpaidBills || 0}</div>
                        <div className="text-xs mt-1">Unpaid Bills</div>
                    </CardContent>
                </Card>
                <Card className="flex-1">
                    <CardContent className="py-4 flex flex-col items-center">
                        <div className="text-lg sm:text-xl font-bold text-red-600">{stats?.overdueBills || 0}</div>
                        <div className="text-xs mt-1">Overdue Bills</div>
                    </CardContent>
                </Card>
                <Card className="flex-1">
                    <CardContent className="py-4 flex flex-col items-center">
                        <div className="text-lg sm:text-xl font-bold text-green-600">{stats?.upcomingBills || 0}</div>
                        <div className="text-xs mt-1">Upcoming Bills</div>
                    </CardContent>
                </Card>
            </div>

            {/* Alerts */}
            <BillAlertsUI
                billsAndBudgetsAlertEnabled={(user as any)?.settings?.billsAndBudgetsAlert !== false}
                overdueBills={overdueBills}
                upcomingBills={upcomingBills}
                onViewBills={() => {}} // No navigation needed since we're already on bills page
            />

            {/* Bills Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <BillDataTable bills={allBills} refreshTrigger={refreshTrigger} />
            </div>
        </div>
    );
};

export default BillsPage;
