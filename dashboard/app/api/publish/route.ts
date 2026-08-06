import { createClient } from "@supabase/supabase-js";

// Server-side publish. The browser can't write to Storage directly because this
// project signs user tokens with an asymmetric key that the Storage service
// doesn't validate (auth.uid() comes back null there). So the browser sends its
// login token here; we verify the caller owns the property, then write the file
// with the service-role key (server-only, bypasses RLS). The browser never gets
// direct write access to Storage.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: Request) {
  const authz = req.headers.get("authorization") ?? "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7) : null;
  if (!token) return Response.json({ error: "Not signed in" }, { status: 401 });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // Verify the caller from their token (works regardless of token signing alg).
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData.user) {
    return Response.json({ error: "Invalid session" }, { status: 401 });
  }
  const userId = userData.user.id;

  const body = await req.json().catch(() => ({}));
  const propertyId = body?.propertyId;
  if (!propertyId) return Response.json({ error: "Missing propertyId" }, { status: 400 });

  // Load the property and confirm this user owns it.
  const { data: prop, error: propErr } = await admin
    .from("properties")
    .select("id, public_id, version, content, owner_user_id")
    .eq("id", propertyId)
    .single();
  if (propErr || !prop) return Response.json({ error: "Property not found" }, { status: 404 });
  if (prop.owner_user_id !== userId) {
    return Response.json({ error: "Not your property" }, { status: 403 });
  }

  // Publish: bump version, write the file, record the new version.
  const newVersion = (prop.version ?? 0) + 1;
  const published = { ...(prop.content as Record<string, unknown>), version: newVersion };
  const path = `${prop.public_id}/config.json`;

  const { error: upErr } = await admin.storage
    .from("published")
    .upload(path, JSON.stringify(published, null, 2), {
      upsert: true,
      contentType: "application/json",
    });
  if (upErr) return Response.json({ error: "Upload failed: " + upErr.message }, { status: 500 });

  const { error: verErr } = await admin
    .from("properties")
    .update({ version: newVersion })
    .eq("id", prop.id);
  if (verErr) return Response.json({ error: "Version bump failed: " + verErr.message }, { status: 500 });

  const { data: pub } = admin.storage.from("published").getPublicUrl(path);
  return Response.json({ publicUrl: pub.publicUrl, version: newVersion });
}
