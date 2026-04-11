import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react({
      // Allow TypeScript syntax inside .jsx files
      include: /\.(jsx|tsx)$/,
      babel: {
        presets: ["@babel/preset-typescript"],
      },
    }),
  ],
  server: {
    port: 3000,
    open: true,
  },
});
