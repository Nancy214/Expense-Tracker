import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BillStats } from "@/types/bill";
import {
  getBillStats,
  getOverdueBills,
  getUpcomingBills,
} from "@/services/bill.service";
import { useToast } from "@/hooks/use-toast";
import BillDataTable from "../BillDataTable";
import { AlertTriangle, Clock, CheckCircle, DollarSign } from "lucide-react";

const BillsPage = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState<BillStats | null>(null);
  const [overdueBills, setOverdueBills] = useState<any[]>([]);
  const [upcomingBills, setUpcomingBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    fetchBillData();
  }, []);

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

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
    fetchBillData();
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
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
            Bills Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track and manage your recurring bills
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="flex flex-row gap-4 md:gap-6 mb-4">
        <Card className="flex-1">
          <CardContent className="py-4 flex flex-col items-center">
            <div className="text-lg sm:text-xl font-bold text-blue-600">
              {stats?.totalBills || 0}
            </div>
            <div className="text-xs mt-1">Total Bills</div>
            <p className="text-xs text-muted-foreground mt-1">
              All bills in your account
            </p>
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardContent className="py-4 flex flex-col items-center">
            <div className="text-lg sm:text-xl font-bold text-yellow-600">
              {stats?.unpaidBills || 0}
            </div>
            <div className="text-xs mt-1">Unpaid Bills</div>
            <p className="text-xs text-muted-foreground mt-1">
              Bills awaiting payment
            </p>
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardContent className="py-4 flex flex-col items-center">
            <div className="text-lg sm:text-xl font-bold text-red-600">
              {stats?.overdueBills || 0}
            </div>
            <div className="text-xs mt-1">Overdue Bills</div>
            <p className="text-xs text-muted-foreground mt-1">
              Bills past due date
            </p>
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardContent className="py-4 flex flex-col items-center">
            <div className="text-lg sm:text-xl font-bold text-green-600">
              {stats?.upcomingBills || 0}
            </div>
            <div className="text-xs mt-1">Upcoming Bills</div>
            <p className="text-xs text-muted-foreground mt-1">
              Due within 7 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {(overdueBills.length > 0 || upcomingBills.length > 0) && (
        <div className="space-y-3">
          {overdueBills.length > 0 && (
            <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-red-900">
                    {overdueBills.length} bill
                    {overdueBills.length > 1 ? "s" : ""} overdue
                  </h4>
                  <p className="text-sm text-red-700 mt-1">
                    You have {overdueBills.length} bill
                    {overdueBills.length > 1 ? "s" : ""} that{" "}
                    {overdueBills.length > 1 ? "are" : "is"} past due date.
                    Please review and take action.
                  </p>
                </div>
              </div>
            </div>
          )}

          {upcomingBills.length > 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-blue-900">
                    {upcomingBills.length} upcoming bill
                    {upcomingBills.length > 1 ? "s" : ""}
                  </h4>
                  <p className="text-sm text-blue-700 mt-1">
                    You have {upcomingBills.length} bill
                    {upcomingBills.length > 1 ? "s" : ""} due within the next 7
                    days. Plan your payments accordingly.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bills Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <BillDataTable refreshTrigger={refreshTrigger} />
      </div>
    </div>
  );
};

export default BillsPage;
