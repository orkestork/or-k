// Creates (or updates) the initial OR-K WORK team in Supabase Auth.
// Usage: node scripts/create-team.mjs
// Requires SUPABASE_SERVICE_ROLE_KEY in .env.local. Asks for one temporary
// password shared by everyone; each person should change it in Settings.
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { createClient } from "@supabase/supabase-js";

const TEAM = [
  { email: "juan@or-k.co", name: "Juan Andrés Bernal Méndez", title: "Business Director", role: "agency_director", color: "#e31572" },
  { email: "maureen@or-k.co", name: "Maureen Blandón Zavala", title: "Financial Director", role: "agency_director", color: "#0ea5e9" },
  { email: "andres@or-k.co", name: "Andrés Carrillo Ávila", title: "Executive Director", role: "agency_director", color: "#8b5cf6" },
  { email: "luis@or-k.co", name: "Luis Urdaneta", title: "Commercial Director", role: "account_manager", color: "#22c55e" },
];

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()])
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl._writeToOutput = (s) => rl.output.write(s.startsWith(question) ? s : "");
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

const password = await askHidden("Contraseña temporal para el equipo (mín. 8 caracteres): ");
if (password.length < 8) {
  console.error("La contraseña debe tener al menos 8 caracteres.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: list, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
if (listError) {
  console.error("No se pudo listar usuarios:", listError.message);
  process.exit(1);
}

for (const person of TEAM) {
  const user_metadata = { name: person.name, title: person.title, role: person.role, color: person.color };
  const app_metadata = { work_role: person.role };
  const existing = list.users.find((u) => u.email?.toLowerCase() === person.email);
  const { data, error } = existing
    ? await supabase.auth.admin.updateUserById(existing.id, { password, email_confirm: true, user_metadata, app_metadata })
    : await supabase.auth.admin.createUser({ email: person.email, password, email_confirm: true, user_metadata, app_metadata });
  if (error) {
    console.error(`✗ ${person.email}: ${error.message}`);
    continue;
  }
  // The profile row comes from the auth trigger; make sure it matches.
  await supabase
    .from("profiles")
    .update({ name: person.name, title: person.title, role: person.role, color: person.color, active: true })
    .eq("id", data.user.id);
  console.log(`✓ ${existing ? "Actualizado" : "Creado"} ${person.name} <${person.email}>`);
}
