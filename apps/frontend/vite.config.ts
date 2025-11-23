import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
// https://vite.dev/config/
export default defineConfig({
	root: __dirname,
	plugins: [react()],
	server: {
		port: 3000,
		host: "0.0.0.0", // Allow external connections
		hmr: {
			clientPort: 3001,
		},
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
});
