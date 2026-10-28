// Creates (or resets) the OR-K WORK master user in Supabase Auth.
// Usage: node scripts/create-master-user.mjs <email> ["Nombre"]
// Requires SUPABASE_SERVICE_ROLE_KEY in .env.local. Asks for the password.
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()])
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const [email, name = "OR-K Admin"] = process.argv.slice(2);

if (!url || !serviceKey) {
  console.error("Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}
if (!email) {
  console.error('Uso: node scripts/create-master-user.mjs <email> ["Nombre"]');
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

const password = await askHidden("Contraseña (mín. 8 caracteres): ");
if (password.length < 8) {
  console.error("La contraseña debe tener al menos 8 caracteres.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const user_metadata = { name, role: "super_admin", title: "Master Admin" };
const app_metadata = { work_role: "super_admin" };

const { data: list, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
if (listError) {
  console.error("No se pudo listar usuarios:", listError.message);
  process.exit(1);
}
const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

const { error } = existing
  ? await supabase.auth.admin.updateUserById(existing.id, { password, email_confirm: true, user_metadata, app_metadata })
  : await supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata, app_metadata });

if (error) {
  console.error("Error:", error.message);
  process.exit(1);
}
console.log(`${existing ? "Actualizado" : "Creado"} usuario maestro ${email} (super_admin).`);
