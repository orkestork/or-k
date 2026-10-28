// Applies pending migrations in supabase/migrations to the OR-K WORK database.
// Usage: npm run db:migrate            (apply pending)
//        npm run db:migrate -- --dry   (only list what would run)
// Needs SUPABASE_DB_PASSWORD (or a full SUPABASE_DB_URL) in .env.local.
// The direct db.<ref> host is IPv6-only, so this goes through the IPv4
// session pooler and finds which regional pooler hosts the project.
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()])
);

const ref = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
const password = env.SUPABASE_DB_PASSWORD;
if (env.SUPABASE_DB_URL && !/^postgres(ql)?:\/\//.test(env.SUPABASE_DB_URL)) {
  console.error("SUPABASE_DB_URL no es una cadena postgresql://. Si es la contraseña, usa SUPABASE_DB_PASSWORD.");
  process.exit(1);
}
const candidates = env.SUPABASE_DB_URL
  ? [env.SUPABASE_DB_URL]
  : password
    ? ["aws-0-us-east-1", "aws-1-us-east-1"].map(
        (pooler) =>
          `postgresql://postgres.${ref}:${encodeURIComponent(password)}@${pooler}.pooler.supabase.com:5432/postgres`,
      )
    : [];

if (!candidates.length) {
  console.error("Falta SUPABASE_DB_PASSWORD en .env.local (la contraseña de la base de datos).");
  process.exit(1);
}

const cwd = new URL("..", import.meta.url);
const push = (dbUrl, extra = []) =>
  spawnSync("npx", ["supabase", "db", "push", "--db-url", dbUrl, "--include-all", "--yes", ...extra], {
    cwd,
    encoding: "utf8",
  });

let dbUrl = candidates[0];
if (candidates.length > 1) {
  dbUrl = null;
  for (const url of candidates) {
    const probe = push(url, ["--dry-run"]);
    const out = `${probe.stdout}${probe.stderr}`;
    if (probe.status === 0) {
      dbUrl = url;
      break;
    }
    if (/password authentication failed/i.test(out)) {
      console.error("La contraseña de la base de datos no es correcta.");
      process.exit(1);
    }
  }
  if (!dbUrl) {
    console.error("No se pudo conectar a la base de datos por el pooler.");
    process.exit(1);
  }
}

const res = spawnSync(
  "npx",
  ["supabase", "db", "push", "--db-url", dbUrl, "--include-all", "--yes", ...(process.argv.includes("--dry") ? ["--dry-run"] : [])],
  { cwd, stdio: "inherit" },
);
process.exit(res.status ?? 1);
