import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, type PluginOption } from "vite";
// https://vite.dev/config/
export default defineConfig({
	root: __dirname,
	plugins: [react()] as PluginOption[],
	base: "/", // Ensure assets are loaded from root
	server: {
		port: 3001,
		host: "0.0.0.0", // Allow external connections
		strictPort: true,
		hmr: true,
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
});
