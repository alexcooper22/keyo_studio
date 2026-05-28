#!/usr/bin/env node
// Patches @clerk/nextjs ClerkProvider to avoid Server Action serialization errors on Next.js 14.
// On Next.js 14, Clerk tries to call a Server Action with non-serializable React elements in closure.
// Fix: use router.refresh() for Next.js 14 (same as Clerk does for Next.js 13) instead of the Server Action.
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../node_modules/@clerk/nextjs/dist/cjs/app-router/client/ClerkProvider.js');

if (!fs.existsSync(file)) {
  console.log('patch-clerk: file not found, skipping');
  process.exit(0);
}

let content = fs.readFileSync(file, 'utf8');

if (content.includes('/* patch-clerk-applied */')) {
  console.log('patch-clerk: already applied');
  process.exit(0);
}

const needle = `if ((nextVersion.startsWith("15") || nextVersion.startsWith("16")) && intent === "sign-out") {\n          resolve();\n        } else {\n          void (0, import_server_actions.invalidateCacheAction)().then(() => resolve());\n        }`;
const patched = `/* patch-clerk-applied */\n        if ((nextVersion.startsWith("15") || nextVersion.startsWith("16")) && intent === "sign-out") {\n          resolve();\n        } else if (nextVersion.startsWith("14") || !nextVersion) {\n          startTransition(() => { router.refresh(); });\n          resolve();\n        } else {\n          void (0, import_server_actions.invalidateCacheAction)().then(() => resolve());\n        }`;

if (!content.includes('(nextVersion.startsWith("15") || nextVersion.startsWith("16")) && intent === "sign-out"')) {
  console.log('patch-clerk: target pattern not found (Clerk may have changed), skipping');
  process.exit(0);
}

content = content.replace(needle, patched);
fs.writeFileSync(file, content);
console.log('patch-clerk: applied successfully');
