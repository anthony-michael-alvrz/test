// Operator provisioning — creates a property and assigns it to a customer.
//
// This is an OPERATOR tool, run locally when you install a tablet at a property.
// It uses the Supabase service-role key, which has full access and BYPASSES
// row-level security. Never ship this key to the browser, never commit it.
//
// Usage (from the dashboard/ folder):
//   node --env-file=.env.local scripts/provision.mjs customer@email.com <slug>
//
// <slug> becomes the tablet URL (…?p=<slug>) and the published file path. Pick a
// plain, readable slug (lowercase letters, digits, hyphens), e.g. maria-yunque.
//
// The customer must have created their login in the dashboard first, so there
// is an auth user to attach the property to.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.argv[2];
const slug = process.argv[3];

function fail(msg) {
  console.error("✗ " + msg);
  process.exit(1);
}

if (!url || url.includes("YOUR-PROJECT")) fail("NEXT_PUBLIC_SUPABASE_URL is not set in .env.local");
if (!serviceKey || serviceKey.includes("YOUR-")) {
  fail(
    "SUPABASE_SERVICE_ROLE_KEY is not set in .env.local.\n" +
      "  Get it from Supabase: Project Settings -> API -> service_role (secret)."
  );
}
if (!email) fail("Usage: node --env-file=.env.local scripts/provision.mjs <customer-email> <slug>");
if (!slug) fail("Missing <slug>. Usage: ...provision.mjs <customer-email> <slug>  (e.g. maria-yunque)");
if (!/^[a-z0-9-]+$/.test(slug)) fail(`Invalid slug "${slug}". Use lowercase letters, digits, and hyphens only.`);

// Seed content is the existing guide config, so the tablet has a full, valid guide.
const here = dirname(fileURLToPath(import.meta.url));
const starter = JSON.parse(readFileSync(join(here, "..", "starter-config.json"), "utf8"));

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

// Find the customer's auth user by email.
const { data: list, error: listErr } = await admin.auth.admin.listUsers();
if (listErr) fail("Could not list users: " + listErr.message);
const user = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
if (!user) {
  fail(
    `No login found for ${email}.\n` +
      "  Have the customer create their account in the dashboard first, then re-run this."
  );
}

// Create the property, owned by that customer. Service-role bypasses RLS.
const { data: prop, error: insErr } = await admin
  .from("properties")
  .insert({ owner_user_id: user.id, slug, content: starter })
  .select("slug")
  .single();
if (insErr) {
  if (insErr.code === "23505") fail(`Slug "${slug}" is already taken. Pick a different one.`);
  fail("Could not create property: " + insErr.message);
}

const publishedPath = `published/${prop.slug}/config.json`;
console.log(`✓ Provisioned a property for ${email}`);
console.log(`  slug:          ${prop.slug}`);
console.log(`  tablet URL:    …/index.html?p=${prop.slug}`);
console.log(`  publishes to:  ${publishedPath}`);
console.log(`  The customer can now log in and edit it. It appears on the tablet once they publish.`);
