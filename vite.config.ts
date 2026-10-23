import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

/**
 * Content-Security-Policy for the built site.
 * The page may only talk to api.anthropic.com, so the user's API key and
 * career data can't be sent anywhere else, even by mistake. Added at build
 * time only, because the dev server needs a websocket for hot reload.
 */
const CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src https://api.anthropic.com",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

function cspPlugin(): Plugin {
  return {
    name: "inject-csp",
    apply: "build",
    transformIndexHtml(html) {
      return html.replace(
        "<!-- CSP -->",
        `<meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
      );
    },
  };
}

export default defineConfig({
  // Relative paths so the site works at /Free-AI-Resume-Tool/ on GitHub Pages
  // (or any other folder) without hard-coding the repo name.
  base: "./",
  plugins: [react(), tailwindcss(), cspPlugin()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
