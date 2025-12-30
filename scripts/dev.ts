import { watch, readFileSync } from "fs";
import { resolve, join, extname } from "path";
import { existsSync } from "fs";

const PORT = 3443;
const HOST = "0.0.0.0";
const PROJECT_ROOT = resolve(import.meta.dir, "..");

// SSL certificates for HTTPS (required for WebXR)
const SSL_KEY_PATH = "/media/nicholas/PROJECTS/ssl/ubuntu-dev.key";
const SSL_CERT_PATH = "/media/nicholas/PROJECTS/ssl/ubuntu-dev.crt";
const WATCH_DIR = join(PROJECT_ROOT, "src");

// MIME type mappings
const MIME_TYPES: Record<string, string> = {
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".css": "text/css",
  ".html": "text/html",
  ".json": "application/json",
  ".wasm": "application/wasm",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain",
  ".xml": "application/xml",
};

// File extensions that should trigger a rebuild
const REBUILD_EXTENSIONS = new Set([".js", ".css", ".html", ".vs", ".fs"]);

let isRebuilding = false;
let rebuildQueued = false;

/**
 * Execute the build process by running the gulp build and pack tasks
 */
async function rebuild(): Promise<void> {
  if (isRebuilding) {
    rebuildQueued = true;
    return;
  }

  isRebuilding = true;
  console.log("\n🔨 Rebuilding project...");

  try {
    const proc = Bun.spawn(["gulp", "build", "pack"], {
      cwd: PROJECT_ROOT,
      stdout: "inherit",
      stderr: "inherit",
    });

    const exitCode = await proc.exited;

    if (exitCode === 0) {
      console.log("✅ Rebuild completed successfully\n");
    } else {
      console.error(`❌ Rebuild failed with exit code ${exitCode}\n`);
    }
  } catch (error) {
    console.error("❌ Rebuild error:", error);
  } finally {
    isRebuilding = false;

    // If another rebuild was queued while we were building, run it now
    if (rebuildQueued) {
      rebuildQueued = false;
      setTimeout(() => rebuild(), 100);
    }
  }
}

/**
 * Resolve file path and check if it exists
 */
function resolveFilePath(pathname: string): string | null {
  // Handle root path - serve index.html
  if (pathname === "/") {
    pathname = "/index.html";
  }

  // Remove leading slash and resolve to absolute path
  const filePath = join(PROJECT_ROOT, pathname.slice(1));

  // Check if file exists
  if (existsSync(filePath)) {
    return filePath;
  }

  return null;
}

/**
 * Get MIME type from file extension
 */
function getMimeType(filePath: string): string {
  const ext = extname(filePath);
  return MIME_TYPES[ext] || "application/octet-stream";
}

// Load SSL certificates
let tlsConfig: { key: string; cert: string } | undefined;
if (existsSync(SSL_KEY_PATH) && existsSync(SSL_CERT_PATH)) {
  tlsConfig = {
    key: readFileSync(SSL_KEY_PATH, "utf-8"),
    cert: readFileSync(SSL_CERT_PATH, "utf-8"),
  };
  console.log("🔒 SSL certificates loaded");
} else {
  console.warn("⚠️  SSL certificates not found, running without HTTPS");
  console.warn(`   Expected key: ${SSL_KEY_PATH}`);
  console.warn(`   Expected cert: ${SSL_CERT_PATH}`);
}

// Create the static file server
const server = Bun.serve({
  port: PORT,
  hostname: HOST,
  tls: tlsConfig,
  async fetch(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Resolve the file path
    const filePath = resolveFilePath(pathname);

    if (!filePath) {
      return new Response("404 Not Found", { status: 404 });
    }

    try {
      // Read and serve the file
      const file = Bun.file(filePath);
      const mimeType = getMimeType(filePath);

      return new Response(file, {
        headers: {
          "Content-Type": mimeType,
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    } catch (error) {
      console.error(`Error serving ${pathname}:`, error);
      return new Response("500 Internal Server Error", { status: 500 });
    }
  },
});

const protocol = tlsConfig ? "https" : "http";
console.log(`🚀 Development server running at ${protocol}://${HOST}:${PORT}`);
console.log(`   Local: ${protocol}://localhost:${PORT}`);
console.log(`   Network: ${protocol}://ubuntu-dev:${PORT}`);
console.log(`📂 Serving files from: ${PROJECT_ROOT}`);
console.log(`👀 Watching for changes in: ${WATCH_DIR}\n`);

// Watch the src directory for changes
const watcher = watch(
  WATCH_DIR,
  { recursive: true },
  async (eventType, filename) => {
    if (!filename) return;

    const ext = extname(filename);

    // Only rebuild for specific file extensions
    if (REBUILD_EXTENSIONS.has(ext)) {
      console.log(`📝 File changed: ${filename}`);
      await rebuild();
    }
  }
);

// Handle cleanup on exit
process.on("SIGINT", () => {
  console.log("\n\n🛑 Shutting down development server...");
  watcher.close();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n\n🛑 Shutting down development server...");
  watcher.close();
  process.exit(0);
});
