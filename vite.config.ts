import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { clientMetadataPlugin } from "./vite-plugin-client-metadata";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), clientMetadataPlugin()],
  server: {
    host: "127.0.0.1", // Required for atproto loopback client
    port: 5173,
    allowedHosts: [".ngrok-free.app"],
  },
});
