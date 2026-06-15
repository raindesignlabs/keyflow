#!/usr/bin/env tsx
/**
 * One-off admin bootstrap.
 *
 * Credentials are NEVER hardcoded — pass them on the command line:
 *   pnpm tsx create-admin-user.ts <username> <password> ["Display Name"]
 *
 * For routine user management prefer the CLI: `pnpm user:add ...`
 */

import { createUser, findUser } from "./src/backend/dashboard/users.js";

const [, , username, password, displayName] = process.argv;

if (!username || !password) {
  console.error("Usage: pnpm tsx create-admin-user.ts <username> <password> [\"Display Name\"]");
  process.exit(1);
}

if (password.length < 8) {
  console.error("Refusing to create user: password must be at least 8 characters.");
  process.exit(1);
}

if (findUser(username)) {
  console.error(`User "${username}" already exists.`);
  process.exit(1);
}

const user = createUser({
  username,
  password,
  role: "admin",
  display_name: displayName || username,
});

console.log(`Admin user created: ${user.username} (ID: ${user.id})`);
