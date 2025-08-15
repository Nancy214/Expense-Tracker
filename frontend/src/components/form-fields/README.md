# Form Field Components

This directory contains reusable form field components that integrate with React Hook Form and include Zod validation. These components provide a consistent and type-safe way to handle form inputs across the application.

## Components

### InputField

A text input component with validation support.

```tsx
import { InputField } from "@/components/form-fields";

<InputField name="title" label="Title" placeholder="Enter title" type="text" required />;
```

**Props:**

-   `name`: Form field name (required)
-   `label`: Field label (required)
-   `placeholder`: Input placeholder
-   `type`: Input type (text, email, password, number, tel, url)
-   `required`: Whether the field is required
-   `disabled`: Whether the field is disabled
-   `className`: Additional CSS classes
-   `min`, `max`, `step`: Number input constraints
-   `autoComplete`: HTML autocomplete attribute

### SelectField

A select dropdown component with validation support.

```tsx
import { SelectField } from "@/components/form-fields";

<SelectField
    name="category"
    label="Category"
    placeholder="Select a category"
    options={[
        { value: "food", label: "Food & Dining" },
        { value: "transport", label: "Transportation" },
    ]}
    required
/>;
```

**Props:**

-   `name`: Form field name (required)
-   `label`: Field label (required)
-   `placeholder`: Select placeholder
-   `options`: Array of options with value and label
-   `required`: Whether the field is required
-   `disabled`: Whether the field is disabled
-   `className`: Additional CSS classes

### DateField

A date picker component with validation support.

```tsx
import { DateField } from "@/components/form-fields";

<DateField name="date" label="Date" placeholder="Pick a date" required dateFormat="dd/MM/yyyy" />;
```

**Props:**

-   `name`: Form field name (required)
-   `label`: Field label (required)
-   `placeholder`: Date picker placeholder
-   `required`: Whether the field is required
-   `disabled`: Whether the field is disabled
-   `className`: Additional CSS classes
-   `dateFormat`: Date format string (default: "dd/MM/yyyy")

### SwitchField

A toggle switch component with validation support.

```tsx
import { SwitchField } from "@/components/form-fields";

<SwitchField
    name="isRecurring"
    label="Enable recurring transaction"
    description="This transaction will repeat automatically"
/>;
```

**Props:**

-   `name`: Form field name (required)
-   `label`: Field label (required)
-   `description`: Optional description text
-   `required`: Whether the field is required
-   `disabled`: Whether the field is disabled
-   `className`: Additional CSS classes

### FileUploadField

A file upload component with drag-and-drop support and validation.

```tsx
import { FileUploadField } from "@/components/form-fields";

<FileUploadField
    name="receipts"
    label="Receipts"
    description="Upload receipt images or PDFs"
    accept="image/*,application/pdf"
    multiple
    maxFiles={10}
/>;
```

**Props:**

-   `name`: Form field name (required)
-   `label`: Field label (required)
-   `description`: Optional description text
-   `accept`: File types to accept
-   `multiple`: Whether multiple files can be selected
-   `required`: Whether the field is required
-   `disabled`: Whether the field is disabled
-   `className`: Additional CSS classes
-   `maxFiles`: Maximum number of files allowed

## Usage with React Hook Form

All components are designed to work with React Hook Form. Here's how to set up a form:

```tsx
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { InputField, SelectField, DateField } from "@/components/form-fields";

// Define your schema
const formSchema = z.object({
    title: z.string().min(1, "Title is required"),
    category: z.string().min(1, "Category is required"),
    date: z.string().min(1, "Date is required"),
});

type FormData = z.infer<typeof formSchema>;

const MyForm = () => {
    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            category: "",
            date: "",
        },
    });

    const onSubmit = (data: FormData) => {
        console.log(data);
    };

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <InputField name="title" label="Title" placeholder="Enter title" required />
                <SelectField
                    name="category"
                    label="Category"
                    placeholder="Select category"
                    options={[
                        { value: "food", label: "Food" },
                        { value: "transport", label: "Transport" },
                    ]}
                    required
                />
                <DateField name="date" label="Date" placeholder="Pick a date" required />
                <button type="submit">Submit</button>
            </form>
        </FormProvider>
    );
};
```

## Features

-   **Type Safety**: Full TypeScript support with proper type inference
-   **Validation**: Built-in Zod validation with error display
-   **Accessibility**: Proper ARIA labels and keyboard navigation
-   **Consistent Styling**: Uses the application's design system
-   **Error Handling**: Automatic error display and styling
-   **Form Integration**: Seamless integration with React Hook Form
-   **Responsive**: Works well on all screen sizes

## Error Handling

All components automatically display validation errors from React Hook Form. Errors are shown below the field with red styling.

## Styling

Components use Tailwind CSS classes and can be customized through the `className` prop. Error states are automatically handled with red borders and error messages.

## Dependencies

-   React Hook Form
-   Zod (for validation)
-   Radix UI components
-   Tailwind CSS
-   date-fns (for date handling)
