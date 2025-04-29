#!/usr/bin/env node
// Usage:
// WORKER_SECRET=your_shared_secret bun generate-hmac.mjs 123456
// (or) node


import { createHmac } from "crypto";

export function generateHmac(secret, uid) {
  return createHmac("sha256", secret).update(uid).digest("hex");
}

function init() {
  const secret = process.env.WORKER_SECRET;

  if (!secret) {
    console.error("Missing WORKER_SECRET environment variable.");
    process.exit(1);
  }

  const uid = process.argv[2];
  if (!uid) {
    console.error("Usage: bun generate-hmac.ts <uid>");
    process.exit(1);
  }

  const hmac = generateHmac(secret, uid);
  console.log(`HMAC for uid ${uid}: ${hmac}`);
}

if (import.meta.main) {
  init();
}