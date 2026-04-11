import { config } from "dotenv";
import path from "path";

// Load .env.local first (matches Next.js convention), then .env as fallback.
// Must be imported before any module that reads process.env at import time.
config({ path: path.resolve(process.cwd(), ".env.local") });
config({ path: path.resolve(process.cwd(), ".env") });
