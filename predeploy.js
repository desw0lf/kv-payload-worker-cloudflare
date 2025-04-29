#!/usr/bin/env node

const fs = require("fs");
const { modify, applyEdits } = require("jsonc-parser");

const BASE_FILE = "wrangler.base.jsonc";
const OUTPUT_FILE = "wrangler.jsonc";

// Parse CLI args like --set="kv_namespaces[0].id=abc&vars.WORKER_SECRET=secret"
const args = process.argv.slice(2).reduce((acc, str) => {
  let [key, ...value] = str.split("=")
  value = value.join("=");
  return { ...acc, [key]: value };
}, {});


const setArg = args["--set"];
if (!setArg) {
  console.warn("❌ No --set argument provided.");
}

const updates = {};
const pairs = setArg ? setArg.split("&") : [];
for (const pair of pairs) {
  const [rawPath, value] = pair.split("=");
  if (!rawPath || value === undefined) continue;

  const pathSegments = rawPath
    .replace(/\]/g, "")
    .split(/[\.\[]/)
    .map((s) => (isNaN(s) ? s : parseInt(s)));

  updates[pathSegments.join(".")] = value;
}

const baseJsonc = fs.readFileSync(BASE_FILE, "utf-8");
let content = baseJsonc;

// Apply edits
for (const pathKey in updates) {
  const path = pathKey.split(".").map((k) => (isNaN(k) ? k : parseInt(k)));
  const edits = modify(content, path, updates[pathKey], { formattingOptions: {} });
  content = applyEdits(content, edits);
}

fs.writeFileSync(OUTPUT_FILE, content);
console.log("✅ wrangler.jsonc generated.");
