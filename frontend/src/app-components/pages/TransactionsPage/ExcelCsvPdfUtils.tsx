// Utility to convert array of objects to CSV, excluding _id, userId, templateId
export function arrayToCSV(data: any[]) {
    if (!data.length) return "";
    const replacer = (key: string, value: any) => (value === null || value === undefined ? "" : value);
    const exclude = ["_id", "userId", "templateId"];
    // Dynamically determine if fromRate/toRate should be included for each row
    // We'll build a superset of all keys that should be included
    let headerSet = new Set<string>();
    data.forEach((row) => {
        Object.keys(row).forEach((key) => {
            if (!exclude.includes(key)) {
                if (key === "fromRate" || key === "toRate") {
                    // Only include if currency has changed
                    if (row.fromRate !== 1 || row.toRate !== 1) {
                        headerSet.add(key);
                    }
                } else {
                    headerSet.add(key);
                }
            }
        });
    });
    const header = Array.from(headerSet);
    const csv = [
        header.join(","),
        ...data.map((row) =>
            header
                .map((fieldName) => {
                    if (
                        (fieldName === "fromRate" || fieldName === "toRate") &&
                        row.fromRate === 1 &&
                        row.toRate === 1
                    ) {
                        return "";
                    }
                    return JSON.stringify(row[fieldName], replacer);
                })
                .join(",")
        ),
    ].join("\r\n");
    return csv;
}

export function downloadCSV(data: any[], filename = "expenses.csv") {
    const csv = arrayToCSV(data);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// Utility to export to Excel using xlsx
import * as XLSX from "xlsx";
export function downloadExcel(data: any[], filename = "expenses.xlsx") {
    if (!data.length) return;
    const exclude = ["_id", "userId", "templateId"];
    // Remove excluded fields and fromRate/toRate if not needed
    const processed = data.map((row) => {
        const copy = { ...row };
        exclude.forEach((key) => delete copy[key]);
        if (copy.fromRate === 1 && copy.toRate === 1) {
            delete copy.fromRate;
            delete copy.toRate;
        }
        // Convert receipts array to comma-separated string if present
        if (Array.isArray(copy.receipts)) {
            copy.receipts = copy.receipts.join(", ");
        }
        return copy;
    });
    const ws = XLSX.utils.json_to_sheet(processed);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expenses");
    XLSX.writeFile(wb, filename);
}

// PDF Generation utilities
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { parse, format } from "date-fns";

export interface MonthlyStatementPDFOptions {
    allExpenses: any[];
    filteredTransactions: any[];
    userCurrency: string;
    now: Date;
    monthName: string;
    currentYear: number;
    totalIncome: number;
    totalExpenses: number;
    netBalance: number;
    savingsRate: number;
    totalTransactions: number;
    avgTransaction: number;
    expenseByCategory: Record<string, number>;
    totalExpenseForBreakdown: number;
}

export function generateMonthlyStatementPDF({
    allExpenses,
    userCurrency,
    now,
    monthName,
    currentYear,
    totalIncome,
    totalExpenses,
    netBalance,
    savingsRate,
    totalTransactions,
    avgTransaction,
    expenseByCategory,
    totalExpenseForBreakdown,
}: MonthlyStatementPDFOptions) {
    // Filter transactions for the current month
    const currentMonth = now.getMonth();
    const monthlyTransactions = allExpenses.filter((t) => {
        let dateObj: Date;
        if (typeof t.date === "string") {
            dateObj = parse(t.date, "dd/MM/yyyy", new Date());
            if (isNaN(dateObj.getTime())) {
                dateObj = new Date(t.date);
            }
        } else {
            dateObj = t.date;
        }
        return dateObj.getMonth() === currentMonth && dateObj.getFullYear() === currentYear;
    });

    // Transaction details rows
    const transactionRows = monthlyTransactions.map((t) => {
        let dateObj: Date;
        if (typeof t.date === "string") {
            dateObj = parse(t.date, "dd/MM/yyyy", new Date());
            if (isNaN(dateObj.getTime())) {
                dateObj = new Date(t.date);
            }
        } else {
            dateObj = t.date;
        }
        return [
            format(dateObj, "dd/MM/yyyy"),
            t.title || "",
            t.type ? t.type.charAt(0).toUpperCase() + t.type.slice(1) : "",
            t.amount !== undefined ? t.amount.toFixed(2) : "",
            t.category || "",
        ];
    });

    // Calculate total for transaction details
    const totalAmount = transactionRows.reduce((sum, row) => {
        const amount = parseFloat(row[3]);
        return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    // Add total row
    const transactionRowsWithTotal = [
        ...transactionRows,
        ["", "Total", "", `${userCurrency} ${totalAmount.toFixed(2)}`, ""],
    ];

    // Recurring expenses table
    const recurringRows = monthlyTransactions
        .filter((t) => t.isRecurring)
        .map((t) => {
            let dateObj: Date;
            if (typeof t.date === "string") {
                dateObj = parse(t.date, "dd/MM/yyyy", new Date());
                if (isNaN(dateObj.getTime())) {
                    dateObj = new Date(t.date);
                }
            } else {
                dateObj = t.date;
            }
            let endDateStr = "";
            if (t.endDate) {
                let endDateObj: Date;
                if (typeof t.endDate === "string") {
                    endDateObj = parse(t.endDate, "dd/MM/yyyy", new Date());
                    if (isNaN(endDateObj.getTime())) {
                        endDateObj = new Date(t.endDate);
                    }
                } else {
                    endDateObj = t.endDate;
                }
                endDateStr = format(endDateObj, "dd/MM/yyyy");
            }
            return [
                format(dateObj, "dd/MM/yyyy"),
                t.title || "",
                t.type ? t.type.charAt(0).toUpperCase() + t.type.slice(1) : "",
                t.amount !== undefined ? t.amount.toFixed(2) : "",
                t.category || "",
                t.recurringFrequency || "",
                endDateStr,
            ];
        });

    // Bills table
    const billsRows = monthlyTransactions
        .filter((t) => t.category === "Bill")
        .map((t) => {
            let dateObj: Date;
            if (typeof t.date === "string") {
                dateObj = parse(t.date, "dd/MM/yyyy", new Date());
                if (isNaN(dateObj.getTime())) {
                    dateObj = new Date(t.date);
                }
            } else {
                dateObj = t.date;
            }

            let dueDateStr = "";
            if (t.dueDate) {
                let dueDateObj: Date;
                if (typeof t.dueDate === "string") {
                    dueDateObj = parse(t.dueDate, "dd/MM/yyyy", new Date());
                    if (isNaN(dueDateObj.getTime())) {
                        dueDateObj = new Date(t.dueDate);
                    }
                } else {
                    dueDateObj = t.dueDate;
                }
                dueDateStr = format(dueDateObj, "dd/MM/yyyy");
            }

            // Get status with proper formatting
            let status = t.billStatus || "unpaid";
            if (status === "paid") {
                status = "Paid";
            } else if (status === "unpaid") {
                status = "Unpaid";
            } else if (status === "pending") {
                status = "Pending";
            } else if (status === "overdue") {
                status = "Overdue";
            }

            return [
                format(dateObj, "dd/MM/yyyy"),
                t.title || "",
                t.amount !== undefined ? t.amount.toFixed(2) : "",
                t.billCategory || "-",
                status,
                dueDateStr,
                t.billFrequency ? t.billFrequency.charAt(0).toUpperCase() + t.billFrequency.slice(1) : "-",
            ];
        });

    // PDF generation
    const doc = new jsPDF();
    let y = 18;
    doc.setFontSize(20);
    doc.setTextColor(40);
    doc.text("Monthly Financial Statement", 14, y);
    y += 8;
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Generated on ${format(now, "MMMM dd, yyyy")}`, 14, y);
    y += 8;
    doc.text(`Statement Period: ${monthName} ${currentYear}`, 14, y);
    y += 15;

    // Financial Summary Table
    doc.setFontSize(16);
    doc.setTextColor(40);
    doc.text("Financial Summary", 14, y);
    y += 5;
    autoTable(doc, {
        startY: y,
        head: [["Metric", "Value"]],
        body: [
            ["Total Income", `${userCurrency} ${totalIncome.toFixed(2)}`],
            ["Total Expenses", `${userCurrency} ${totalExpenses.toFixed(2)}`],
            ["Net Balance", `${userCurrency} ${netBalance.toFixed(2)}`],
            ["Savings Rate", `${savingsRate.toFixed(1)}%`],
            ["Total Transactions", `${totalTransactions}`],
            ["Average Transaction", `${userCurrency} ${avgTransaction.toFixed(2)}`],
        ],
        styles: { fontSize: 10 },
        headStyles: { fillColor: [41, 128, 185] },
        margin: { left: 14, right: 14 },
        theme: "grid",
    });
    y = (doc as any).lastAutoTable.finalY + 12;

    // Expense Breakdown by Category
    doc.setFontSize(16);
    doc.setTextColor(40);
    doc.text("Expense Breakdown by Category", 14, y);
    y += 5;
    autoTable(doc, {
        startY: y,
        head: [["Category", "Amount", "Percentage"]],
        body: Object.entries(expenseByCategory).map(([cat, amt]) => [
            cat,
            `${userCurrency} ${amt.toFixed(2)}`,
            totalExpenseForBreakdown > 0 ? `${((amt / totalExpenseForBreakdown) * 100).toFixed(1)}%` : "0%",
        ]),
        styles: { fontSize: 10 },
        headStyles: { fillColor: [15, 185, 120] },
        margin: { left: 14, right: 14 },
        theme: "grid",
    });
    y = (doc as any).lastAutoTable.finalY + 12;

    // Transaction details table
    doc.setFontSize(16);
    doc.setTextColor(40);
    doc.text("Transaction Details", 14, y);
    y += 8;
    autoTable(doc, {
        startY: y,
        head: [["Date", "Title", "Type", "Amount", "Category"]],
        body: transactionRowsWithTotal,
        styles: {
            fontSize: 9,
            cellPadding: 2,
            halign: "left",
            valign: "middle",
            overflow: "linebreak",
            textColor: [40, 40, 40],
        },
        headStyles: {
            fillColor: [148, 87, 235],
            textColor: 255,
            fontStyle: "bold",
            halign: "left",
            fontSize: 10,
            cellPadding: 3,
        },
        alternateRowStyles: {
            fillColor: [245, 245, 245],
        },
        margin: { left: 14, right: 14 },
        theme: "grid",
    });

    // Recurring expenses table
    if (recurringRows.length > 0) {
        y = (doc as any).lastAutoTable.finalY + 12;
        doc.setFontSize(14);
        doc.setTextColor(40);
        doc.text("Recurring Expenses", 14, y);
        y += 5;
        autoTable(doc, {
            startY: y,
            head: [["Date", "Title", "Type", "Amount", "Category", "Recurring Frequency", "End Date"]],
            body: recurringRows,
            styles: {
                fontSize: 9,
                cellPadding: 2,
                halign: "left",
                valign: "middle",
                overflow: "linebreak",
                textColor: [40, 40, 40],
            },
            headStyles: {
                fillColor: [41, 128, 185],
                textColor: 255,
                fontStyle: "bold",
                halign: "left",
                fontSize: 10,
                cellPadding: 3,
            },
            alternateRowStyles: {
                fillColor: [245, 245, 245],
            },
            margin: { left: 14, right: 14 },
            theme: "grid",
        });
    }

    // Bills table
    if (billsRows.length > 0) {
        y = (doc as any).lastAutoTable.finalY + 12;
        doc.setFontSize(14);
        doc.setTextColor(40);
        doc.text("Bills", 14, y);
        y += 5;
        autoTable(doc, {
            startY: y,
            head: [["Date", "Title", "Amount", "Category", "Status", "Due Date", "Frequency"]],
            body: billsRows,
            styles: {
                fontSize: 9,
                cellPadding: 2,
                halign: "left",
                valign: "middle",
                overflow: "linebreak",
                textColor: [40, 40, 40],
            },
            headStyles: {
                fillColor: [231, 76, 60], // Red color for bills
                textColor: 255,
                fontStyle: "bold",
                halign: "left",
                fontSize: 10,
                cellPadding: 3,
            },
            alternateRowStyles: {
                fillColor: [245, 245, 245],
            },
            margin: { left: 14, right: 14 },
            theme: "grid",
        });
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
            `Page ${i} of ${pageCount}`,
            doc.internal.pageSize.getWidth() - 50,
            doc.internal.pageSize.getHeight() - 10
        );
        doc.text("Generated by Expense Tracker App", 14, doc.internal.pageSize.getHeight() - 10);
    }

    doc.save(`Monthly-Statement-${currentYear}-${String(now.getMonth() + 1).padStart(2, "0")}.pdf`);
}
