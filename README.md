# Expense Tracker Monorepo

This is a full-stack expense tracking application built with a monorepo architecture using Nx.

## Project Structure

```
expense-tracker/
├── apps/
│   ├── backend/          # Node.js/Express API server
│   └── frontend/         # React/Vite frontend application
├── libs/
│   └── shared-types/     # Shared TypeScript types
├── nx.json              # Nx workspace configuration
└── package.json         # Root package.json with workspace scripts
```

## Prerequisites

-   Node.js (v18 or higher)
-   npm
-   Nx CLI (installed globally or via npx)

## Getting Started

### Installation

```bash
# Install dependencies for all projects
npm install

# Or install dependencies for a specific project
cd apps/backend && npm install
cd apps/frontend && npm install
```

### Development

```bash
# Run all applications in development mode
npm run dev

# Run specific applications
npm run backend:dev    # Backend only
npm run frontend:dev   # Frontend only

# Using Nx directly
nx run backend:dev
nx run frontend:dev
```

### Building

```bash
# Build all projects
npm run build

# Build specific projects
npm run backend:build
npm run frontend:build

# Using Nx directly
nx build backend
nx build frontend
```

### Testing

```bash
# Run tests for all projects
npm run test

# Run tests for specific projects
nx test backend
nx test frontend
```

### Linting

```bash
# Lint all projects
npm run lint

# Lint specific projects
nx lint backend
nx lint frontend
```

## Available Scripts

### Root Level Scripts

-   `npm run build` - Build all projects
-   `npm run test` - Run tests for all projects
-   `npm run lint` - Lint all projects
-   `npm run dev` - Run all projects in development mode
-   `npm run backend:dev` - Run backend in development mode
-   `npm run frontend:dev` - Run frontend in development mode
-   `npm run backend:build` - Build backend only
-   `npm run frontend:build` - Build frontend only

### Nx Commands

-   `nx show projects` - List all projects in the workspace
-   `nx run <project>:<target>` - Run a specific target for a project
-   `nx run-many --target=<target> --all` - Run a target for all projects
-   `nx graph` - Visualize the project dependency graph

## Projects

### Backend (`apps/backend`)

-   **Technology**: Node.js, Express, TypeScript, MongoDB, Mongoose
-   **Port**: 8000
-   **Features**:
    -   RESTful API
    -   Authentication (JWT, Google OAuth)
    -   File uploads (S3)
    -   Recurring transactions
    -   Budget management
    -   Analytics

### Frontend (`apps/frontend`)

-   **Technology**: React, TypeScript, Vite, Tailwind CSS
-   **Port**: 5173 (development)
-   **Features**:
    -   Modern React with hooks
    -   Responsive design
    -   Form validation with Zod
    -   State management with React Query
    -   UI components with Radix UI

### Shared Types (`libs/shared-types`)

-   **Purpose**: Common TypeScript interfaces and types
-   **Usage**: Imported by both frontend and backend
-   **Exports**: Auth types, Transaction types, etc.

## Development Workflow

1. **Start Development Servers**:

    ```bash
    npm run dev
    ```

2. **Make Changes**: Edit files in `apps/backend` or `apps/frontend`

3. **Build and Test**:

    ```bash
    npm run build
    npm run test
    ```

4. **Deploy**: Each application can be deployed independently

## Benefits of Monorepo Structure

-   **Shared Code**: Common types and utilities in `libs/`
-   **Consistent Tooling**: Unified build, test, and lint processes
-   **Dependency Management**: Centralized package management
-   **Developer Experience**: Single repository, unified commands
-   **Code Reuse**: Easy sharing of code between frontend and backend

## Environment Setup

### Backend Environment Variables

Create a `.env` file in `apps/backend/`:

```env
PORT=8000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_BUCKET_NAME=your_s3_bucket_name
SENDGRID_API_KEY=your_sendgrid_api_key
```

### Frontend Environment Variables

Create a `.env` file in `apps/frontend/`:

```env
VITE_API_URL=http://localhost:8000/api
```

## Contributing

1. Make changes in the appropriate app or lib directory
2. Test your changes: `npm run test`
3. Build to ensure no errors: `npm run build`
4. Commit your changes

## Troubleshooting

### Common Issues

1. **Build Failures**: Check TypeScript errors and fix them
2. **Dependency Issues**: Run `npm install` in the root directory
3. **Port Conflicts**: Ensure ports 8000 and 5173 are available

### Useful Commands

```bash
# Clear Nx cache
nx reset

# Show project dependency graph
nx graph

# Run specific targets
nx run <project>:<target> --verbose
```
