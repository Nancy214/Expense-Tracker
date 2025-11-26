import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
// https://vite.dev/config/
export default defineConfig({
	root: __dirname,
	plugins: [react()],
	base: "/", // Ensure assets are loaded from root
	server: {
		port: 3001,
		host: "0.0.0.0", // Allow external connections
		strictPort: true,
		hmr: {
			host: "trauss.sauravkoli.com",
			port: 443,
		},
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
});
