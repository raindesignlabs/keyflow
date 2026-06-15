#!/usr/bin/env tsx
/**
 * KeyFlow Dashboard User Management CLI
 *
 * Usage:
 *   pnpm user:add <username> <password> [--role admin|client] [--client-id <id>] [--display-name <name>]
 *   pnpm user:passwd <username> <new-password>
 *   pnpm user:list
 *   pnpm user:remove <username>
 *   pnpm user:role <username> <admin|client>
 */

import { createUser, findUser, listUsers, changePassword, deleteUser, updateUser } from "../src/backend/dashboard/users.js";

const args = process.argv.slice(2);
const command = args[0];

function getFlag(flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
}

function help() {
  console.log(`
KeyFlow Dashboard User Management

Commands:
  add <username> <password>  [--role admin|client] [--client-id <id>] [--org-id <uuid>] [--display-name <name>]
                              Create a new user (default role: client)
  passwd <username> <password>
                              Change a user's password
  list                        List all users
  remove <username>           Delete a user
  role <username> <role>      Change a user's role (admin|client)
  org <username> <org-id>     Set the user's organization UUID (CRM tenant scoping)
                              Use "clear" as org-id to remove org association
`.trim());
}

async function main() {
  switch (command) {
    case "add": {
      const username = args[1];
      const password = args[2];
      if (!username || !password) {
        console.error("Usage: pnpm user:add <username> <password> [--role admin|client] [--client-id <id>] [--org-id <uuid>] [--display-name <name>]");
        process.exit(1);
      }
      if (findUser(username)) {
        console.error(`User "${username}" already exists.`);
        process.exit(1);
      }
      const role = (getFlag("--role") as "admin" | "client") || "client";
      const clientId = getFlag("--client-id") || null;
      const orgId = getFlag("--org-id") || null;
      const displayName = getFlag("--display-name") || username;
      const user = createUser({ username, password, role, client_id: clientId, organization_id: orgId, display_name: displayName, force_password_change: role === "client" });
      console.log(`Created user: ${user.username} (role: ${user.role}, org: ${user.organization_id || "all"}, client_id: ${user.client_id || "all"}, display: ${user.display_name}, force_password_change: ${user.force_password_change})`);
      break;
    }

    case "passwd": {
      const username = args[1];
      const password = args[2];
      if (!username || !password) {
        console.error("Usage: pnpm user:passwd <username> <new-password>");
        process.exit(1);
      }
      const user = findUser(username);
      if (!user) {
        console.error(`User "${username}" not found.`);
        process.exit(1);
      }
      changePassword(user.id, password);
      console.log(`Password updated for "${username}".`);
      break;
    }

    case "list": {
      const users = listUsers();
      if (users.length === 0) {
        console.log("No users found.");
        break;
      }
      console.log(`${"ID".padEnd(4)} ${"Username".padEnd(16)} ${"Role".padEnd(8)} ${"Client ID".padEnd(20)} ${"Org ID".padEnd(38)} ${"Force PW".padEnd(8)} Display Name`);
      console.log("-".repeat(130));
      for (const u of users) {
        console.log(`${String(u.id).padEnd(4)} ${u.username.padEnd(16)} ${u.role.padEnd(8)} ${(u.client_id || "—").padEnd(20)} ${(u.organization_id || "—").padEnd(38)} ${(u.force_password_change ? "YES" : "—").padEnd(8)} ${u.display_name}`);
      }
      console.log(`\n${users.length} user(s) total.`);
      break;
    }

    case "remove": {
      const username = args[1];
      if (!username) {
        console.error("Usage: pnpm user:remove <username>");
        process.exit(1);
      }
      const user = findUser(username);
      if (!user) {
        console.error(`User "${username}" not found.`);
        process.exit(1);
      }
      deleteUser(user.id);
      console.log(`Deleted user "${username}".`);
      break;
    }

    case "role": {
      const username = args[1];
      const role = args[2] as "admin" | "client";
      if (!username || !role || !["admin", "client"].includes(role)) {
        console.error("Usage: pnpm user:role <username> <admin|client>");
        process.exit(1);
      }
      const user = findUser(username);
      if (!user) {
        console.error(`User "${username}" not found.`);
        process.exit(1);
      }
      updateUser(user.id, { role });
      console.log(`${username} role changed to ${role}.`);
      break;
    }

    case "org": {
      const username = args[1];
      const orgId = args[2];
      if (!username || !orgId) {
        console.error('Usage: pnpm user:org <username> <org-id|clear>');
        process.exit(1);
      }
      const user = findUser(username);
      if (!user) {
        console.error(`User "${username}" not found.`);
        process.exit(1);
      }
      const resolvedOrgId = orgId === "clear" ? null : orgId;
      updateUser(user.id, { organization_id: resolvedOrgId });
      console.log(`${username} organization_id set to: ${resolvedOrgId || "(cleared)"}.`);
      break;
    }

    default:
      help();
      process.exit(command ? 1 : 0);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
