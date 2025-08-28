// Test script to create a bill that should trigger a reminder
// This script can be run in the browser console after logging in

const createTestBill = async () => {
    try {
        // Get the access token
        const accessToken = localStorage.getItem("accessToken");
        if (!accessToken) {
            console.error("No access token found. Please log in first.");
            return;
        }

        // Calculate a due date that's within the reminder period (e.g., 2 days from now)
        const today = new Date();
        const dueDate = new Date(today);
        dueDate.setDate(today.getDate() + 2); // Due in 2 days

        const testBill = {
            title: "Test Electricity Bill",
            description: "Test bill for debugging reminders",
            amount: 1500,
            currency: "INR",
            date: today.toISOString(),
            type: "expense",
            category: "Bill",
            billCategory: "Utilities",
            reminderDays: 3, // Remind 3 days before due date
            dueDate: dueDate.toISOString(),
            billStatus: "unpaid",
            billFrequency: "monthly",
            paymentMethod: "manual",
            receipts: [],
        };

        const response = await fetch("http://localhost:8000/api/expenses/add-expenses", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(testBill),
        });

        if (response.ok) {
            const result = await response.json();
            console.log("Test bill created successfully:", result);
            console.log("Due date:", dueDate.toISOString());
            console.log("Reminder should show if due date is within 3 days");
        } else {
            const error = await response.text();
            console.error("Failed to create test bill:", error);
        }
    } catch (error) {
        console.error("Error creating test bill:", error);
    }
};

// Also create a bill that's overdue
const createOverdueBill = async () => {
    try {
        const accessToken = localStorage.getItem("accessToken");
        if (!accessToken) {
            console.error("No access token found. Please log in first.");
            return;
        }

        // Calculate a due date that's overdue (e.g., 2 days ago)
        const today = new Date();
        const dueDate = new Date(today);
        dueDate.setDate(today.getDate() - 2); // Due 2 days ago

        const overdueBill = {
            title: "Overdue Internet Bill",
            description: "Test overdue bill for debugging",
            amount: 800,
            currency: "INR",
            date: dueDate.toISOString(),
            type: "expense",
            category: "Bill",
            billCategory: "Utilities",
            reminderDays: 3,
            dueDate: dueDate.toISOString(),
            billStatus: "unpaid",
            billFrequency: "monthly",
            paymentMethod: "manual",
            receipts: [],
        };

        const response = await fetch("http://localhost:8000/api/expenses/add-expenses", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(overdueBill),
        });

        if (response.ok) {
            const result = await response.json();
            console.log("Overdue bill created successfully:", result);
            console.log("Due date:", dueDate.toISOString());
            console.log("This should show as overdue");
        } else {
            const error = await response.text();
            console.error("Failed to create overdue bill:", error);
        }
    } catch (error) {
        console.error("Error creating overdue bill:", error);
    }
};

// Export functions for use in browser console
window.createTestBill = createTestBill;
window.createOverdueBill = createOverdueBill;

console.log("Test functions available:");
console.log("- createTestBill() - Creates a bill due in 2 days");
console.log("- createOverdueBill() - Creates a bill overdue by 2 days");
