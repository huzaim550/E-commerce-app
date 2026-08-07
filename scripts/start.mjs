import { cp, access } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

/**
 * `next start` doesn't work with `output: "standalone"` — the standalone build
 * is a self-contained server that expects `.next/static` and `public` beside
 * it. The Dockerfile copies them in; this does the same for local runs so
 * `npm start` serves exactly what production serves.
 */

const root = process.cwd();
const standalone = path.join(root, ".next", "standalone");

try {
  await access(path.join(standalone, "server.js"));
} catch {
  console.error("No standalone build found. Run `npm run build` first.");
  process.exit(1);
}

await cp(path.join(root, ".next", "static"), path.join(standalone, ".next", "static"), {
  recursive: true,
});
await cp(path.join(root, "public"), path.join(standalone, "public"), {
  recursive: true,
}).catch(() => {
  // `public/` is optional.
});

/**
 * Next's standalone server binds to $HOSTNAME. On Linux that variable is
 * already set to the machine's name ("fedora"), so it would bind to that
 * interface and `localhost:3000` would refuse the connection. Bind to all
 * interfaces unless a HOST is given deliberately.
 */
spawn(process.execPath, [path.join(standalone, "server.js")], {
  stdio: "inherit",
  env: { ...process.env, HOSTNAME: process.env.HOST || "0.0.0.0" },
}).on("exit", (code) => process.exit(code ?? 0));
