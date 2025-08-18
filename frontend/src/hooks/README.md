# Custom Delete Hooks

This directory contains custom React hooks for handling delete operations across different entities in the expense tracker application.

## Available Hooks

### `useExpenseDelete`

Handles deletion of both regular and recurring expenses.

```typescript
import { useExpenseDelete } from "@/hooks/use-expense-delete";

const MyComponent = () => {
    const {
        expenseToDelete,
        recurringToDelete,
        isDeleteDialogOpen,
        handleDelete,
        handleDeleteRecurring,
        confirmDelete,
        cancelDelete,
        setRecurringForDelete,
        clearRecurringDelete,
        setIsDeleteDialogOpen,
    } = useExpenseDelete({
        onRefresh: () => fetchExpenses(),
        onRecurringDelete: () => fetchRecurringExpenses(),
    });

    // Use the functions and state as needed
};
```

**Props:**

-   `onRefresh?: () => void` - Callback to refresh data after deletion
-   `onRecurringDelete?: () => void` - Callback for recurring expense deletion

**Returns:**

-   `expenseToDelete` - ID of expense to be deleted
-   `recurringToDelete` - Recurring expense object to be deleted
-   `isDeleteDialogOpen` - Dialog open state
-   `handleDelete` - Function to initiate regular expense deletion
-   `handleDeleteRecurring` - Function to delete recurring expense
-   `confirmDelete` - Function to confirm deletion
-   `cancelDelete` - Function to cancel deletion
-   `setRecurringForDelete` - Function to set recurring expense for deletion
-   `clearRecurringDelete` - Function to clear recurring deletion state
-   `setIsDeleteDialogOpen` - Function to control dialog state

### `useBillDelete`

Handles deletion of bills.

```typescript
import { useBillDelete } from "@/hooks/use-bill-delete";

const MyComponent = () => {
    const { billToDelete, handleDelete, confirmDelete, cancelDelete, setBillToDelete } = useBillDelete({
        onRefresh: () => fetchBills(),
    });

    // Use the functions and state as needed
};
```

**Props:**

-   `onRefresh?: () => void` - Callback to refresh data after deletion

**Returns:**

-   `billToDelete` - ID of bill to be deleted
-   `handleDelete` - Function to initiate bill deletion
-   `confirmDelete` - Function to confirm deletion
-   `cancelDelete` - Function to cancel deletion
-   `setBillToDelete` - Function to set bill for deletion

### `useBudgetDelete`

Handles deletion of budgets.

```typescript
import { useBudgetDelete } from "@/hooks/use-budget-delete";

const MyComponent = () => {
    const { handleDelete } = useBudgetDelete({
        onRefresh: () => fetchBudgets(),
        onBudgetProgressRefresh: () => fetchBudgetProgress(),
        onBudgetRemindersRefresh: () => fetchBudgetReminders(),
    });

    // Use the function as needed
};
```

**Props:**

-   `onRefresh?: () => void` - Callback to refresh budgets after deletion
-   `onBudgetProgressRefresh?: () => void` - Callback to refresh budget progress
-   `onBudgetRemindersRefresh?: () => void` - Callback to refresh budget reminders

**Returns:**

-   `handleDelete` - Function to delete a budget

## Usage Examples

### With DeleteConfirmationDialog

```typescript
import { DeleteConfirmationDialog } from "@/utils/deleteDialog";
import { useExpenseDelete } from "@/hooks/use-expense-delete";

const ExpenseTable = () => {
    const { expenseToDelete, isDeleteDialogOpen, handleDelete, confirmDelete, cancelDelete, setIsDeleteDialogOpen } =
        useExpenseDelete({ onRefresh: fetchExpenses });

    return (
        <>
            {/* Your table component */}

            <DeleteConfirmationDialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
                onConfirm={confirmDelete}
                onCancel={cancelDelete}
                title="Delete Expense"
                message="Are you sure you want to delete this expense?"
            />
        </>
    );
};
```

### Direct Deletion (for budgets)

```typescript
import { useBudgetDelete } from "@/hooks/use-budget-delete";

const BudgetCard = ({ budget }) => {
    const { handleDelete } = useBudgetDelete({
        onRefresh: fetchBudgets,
    });

    return <button onClick={() => handleDelete(budget)}>Delete Budget</button>;
};
```

## Benefits

1. **Reusability** - Delete logic can be shared across components
2. **Consistency** - Standardized error handling and toast notifications
3. **Maintainability** - Centralized delete logic makes updates easier
4. **Type Safety** - Full TypeScript support with proper typing
5. **Separation of Concerns** - UI components focus on presentation, hooks handle business logic

## Migration Guide

To migrate existing components:

1. Import the appropriate hook
2. Replace inline delete state and functions with hook returns
3. Update dialog components to use hook state and functions
4. Remove duplicate delete logic from components
