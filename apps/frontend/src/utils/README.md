# Currency Utility Functions

This directory contains utility functions that serve as the **single source of truth** for currency handling throughout the application.

## Overview

The currency utilities ensure consistency when handling currency symbols, codes, and display formatting across all components and pages.

## Core Functions

### `getCurrencyValue(currency)`

**Purpose:** Determine which currency value to use - symbol or code

**Returns:** Currency symbol if available and not empty, otherwise currency code

**Usage:**
```typescript
import { getCurrencyValue } from "@/utils/currency";

const currency = { code: "USD", symbol: "$", name: "United States Dollar" };
const value = getCurrencyValue(currency); // Returns "$"

const currencyNoSymbol = { code: "XYZ", symbol: "", name: "Example Currency" };
const value2 = getCurrencyValue(currencyNoSymbol); // Returns "XYZ"
```

### `getCurrencyLabel(currency)`

**Purpose:** Format currency for display in dropdowns and selects

**Returns:** Formatted string in the format: "Symbol - Name (Code)"

**Usage:**
```typescript
import { getCurrencyLabel } from "@/utils/currency";

const currency = { code: "EUR", symbol: "€", name: "Euro" };
const label = getCurrencyLabel(currency); // Returns "€ - Euro (EUR)"
```

### `getCurrencyForCountry(country, countryData)`

**Purpose:** Get the currency object for a specific country

**Returns:** Currency object or undefined

**Usage:**
```typescript
import { getCurrencyForCountry } from "@/utils/currency";

const currency = getCurrencyForCountry("United States", countryData);
// Returns { code: "USD", symbol: "$", name: "United States Dollar" }
```

### `getCurrencyValueForCountry(country, countryData)`

**Purpose:** Convenience function combining getCurrencyForCountry and getCurrencyValue

**Returns:** Currency symbol or code for the country

**Usage:**
```typescript
import { getCurrencyValueForCountry } from "@/utils/currency";

const value = getCurrencyValueForCountry("United States", countryData); // Returns "$"
```

### `formatCurrency(amount, currencySymbol, locale?)`

**Purpose:** Format a numeric amount with currency symbol

**Returns:** Formatted currency string

**Usage:**
```typescript
import { formatCurrency } from "@/utils/currency";

const formatted = formatCurrency(1234.56, "$"); // Returns "$1,234.56"
const formatted2 = formatCurrency(-500, "€", "de-DE"); // Returns "-€500,00"
```

## Implementation Locations

These utility functions are used in the following locations:

### Profile Management
- **ProfileData.tsx** - Profile editing page currency selection and display
- **use-profile.ts** - Profile form hook and currency symbol hook

### Onboarding
- **Step2ProfileSetup.tsx** - Onboarding currency selection

### Analytics & Transactions
- Any component that displays currency amounts should use `formatCurrency()`
- Any component that needs to determine currency value should use `getCurrencyValue()`

## Data Flow

1. **User Registration/Onboarding**
   - User selects country → `getCurrencyValue()` determines symbol/code
   - Value saved to database via profile API

2. **Profile Updates**
   - User changes country → `getCurrencyValue()` updates currency field
   - Legacy codes automatically converted to symbols on load

3. **Display**
   - Components use `useCurrencySymbol()` hook to get current user's currency
   - Amounts formatted with `formatCurrency()` for consistent display

## Migration Strategy

The application now prioritizes currency symbols over codes:

- **New users**: Always get symbols when available
- **Existing users**: Currency codes automatically converted to symbols on profile load
- **Fallback**: If symbol is empty/null, currency code is used
- **Backward compatibility**: Both codes and symbols pass validation

## Best Practices

1. **Always use utility functions** - Never manually check `currency.symbol` vs `currency.code`
2. **Single source of truth** - All currency logic flows through `currency.ts`
3. **Type safety** - All functions include TypeScript types
4. **Consistent formatting** - Use `formatCurrency()` for all amount displays
5. **Backend restart required** - When changing shared types, restart backend server

## Validation

The currency field accepts:
- 3-letter uppercase codes (e.g., "USD", "EUR", "GBP")
- Currency symbols 1-3 characters (e.g., "$", "€", "£", "₹")

Validation is defined in: `libs/shared-types/src/profile.ts`
