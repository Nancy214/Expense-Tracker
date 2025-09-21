import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import App from "./App.tsx";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000, // Data stays fresh for 5 minutes
            gcTime: 10 * 60 * 1000, // Cache is kept for 10 minutes
            refetchOnWindowFocus: false, // Don't refetch when window regains focus
            refetchOnMount: true, // Allow fresh data on mount for better UX
            retry: 1, // Only retry failed requests once
            networkMode: 'always', // Always try to fetch, even when offline
        },
    },
});

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <App />
        </QueryClientProvider>
    </StrictMode>
);
