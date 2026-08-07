"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// Content is the config.json shape the tablet already understands. We keep it
// loose here — the dashboard only touches a few known fields.
type Content = Record<string, any>;
type Property = {
  id: string;
  slug: string;
  version: number;
  content: Content;
};

// Where the guide (index.html) is deployed. The tablet opens <base>?p=<slug>.
const TABLET_BASE =
  process.env.NEXT_PUBLIC_TABLET_BASE_URL ||
  "https://anthony-michael-alvrz.github.io/test/";

// Curated libraries. To add an option: build + verify it in the tablet, then add
// it here. `value` is what gets written into the published config.
const THEME_OPTIONS = [
  { value: "themes/yunque.css", label: "Yunque — airy, muted greens" },
  { value: "themes/slate.css", label: "Slate — cooler, serif headings" },
];
const LAYOUT_OPTIONS = [
  { value: "standard", label: "Standard — rules inside House Guide" },
  { value: "rules-as-tab", label: "House Rules as its own tab" },
];
const DEFAULT_THEME = THEME_OPTIONS[0].value;
const DEFAULT_LAYOUT = LAYOUT_OPTIONS[0].value;

export default function Home() {
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [property, setProperty] = useState<Property | null>(null);
  const [guestName, setGuestName] = useState("");
  const [wifiNetwork, setWifiNetwork] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [layout, setLayout] = useState(DEFAULT_LAYOUT);

  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const loadProperty = useCallback(async () => {
    const { data, error } = await supabase
      .from("properties")
      .select("id, slug, version, content")
      .limit(1)
      .maybeSingle();
    if (error) {
      setMsg("Load error: " + error.message);
      return;
    }
    if (data) {
      const prop = data as Property;
      setProperty(prop);
      const p = prop.content?.property ?? {};
      setGuestName(p.guestName ?? "");
      setWifiNetwork(p.wifiNetwork ?? "");
      setWifiPassword(p.wifiPassword ?? "");
      setTheme(prop.content?.theme ?? DEFAULT_THEME);
      setLayout(prop.content?.layout ?? DEFAULT_LAYOUT);
    } else {
      setProperty(null);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserEmail(data.session?.user.email ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserEmail(session?.user.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (userEmail) loadProperty();
    else setProperty(null);
  }, [userEmail, loadProperty]);

  async function signIn() {
    setBusy(true);
    setMsg("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMsg("Sign-in failed: " + error.message);
    setBusy(false);
  }

  async function signUp() {
    setBusy(true);
    setMsg("");
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setMsg("Sign-up failed: " + error.message);
    else setMsg("Account created. If email confirmation is on, confirm it, then sign in.");
    setBusy(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function save() {
    if (!property) return;
    setBusy(true);
    setMsg("");
    const newContent: Content = {
      ...property.content,
      theme,
      layout,
      property: {
        ...(property.content.property ?? {}),
        guestName,
        wifiNetwork,
        wifiPassword,
      },
    };
    const { error } = await supabase
      .from("properties")
      .update({ content: newContent })
      .eq("id", property.id);
    if (error) setMsg("Save failed: " + error.message);
    else {
      setProperty({ ...property, content: newContent });
      setMsg("Saved. Not visible to guests until you publish.");
    }
    setBusy(false);
  }

  async function publish() {
    if (!property) return;
    setBusy(true);
    setMsg("");
    // Publish happens server-side (see app/api/publish). We send our login token;
    // the server verifies ownership and writes the file with the admin key. It
    // publishes the property's saved content, so Save before Publish.
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) {
      setMsg("Your session expired — please sign in again.");
      setBusy(false);
      return;
    }
    const res = await fetch("/api/publish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ propertyId: property.id }),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg("Publish failed: " + (out.error ?? `HTTP ${res.status}`));
      setBusy(false);
      return;
    }
    setProperty({ ...property, version: out.version });
    setPublishedUrl(out.publicUrl);
    setMsg(`Published version ${out.version}.`);
    setBusy(false);
  }

  if (!ready) {
    return (
      <main className="wrap">
        <p>Loading…</p>
      </main>
    );
  }

  if (!userEmail) {
    return (
      <main className="wrap">
        <h1>Guest Guide — Owner Login</h1>
        <p className="muted">
          Log in to edit your property. The tablet never logs in — it only reads
          what you publish.
        </p>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <div className="row">
          <button onClick={signIn} disabled={busy}>
            Sign in
          </button>
          <button onClick={signUp} disabled={busy} className="secondary">
            Create account
          </button>
        </div>
        {msg && <p className="msg">{msg}</p>}
      </main>
    );
  }

  return (
    <main className="wrap">
      <div className="row spread">
        <h1>Your Property</h1>
        <button onClick={signOut} className="secondary">
          Sign out
        </button>
      </div>
      <p className="muted">Signed in as {userEmail}</p>

      {!property ? (
        <p className="muted">
          No property assigned yet — contact your installer.
        </p>
      ) : (
        <>
          <p className="muted">
            Slug: <code>{property.slug}</code> · Version: {property.version}
          </p>
          <label>
            Guest name
            <input value={guestName} onChange={(e) => setGuestName(e.target.value)} />
          </label>
          <label>
            Wi-Fi network
            <input
              value={wifiNetwork}
              onChange={(e) => setWifiNetwork(e.target.value)}
            />
          </label>
          <label>
            Wi-Fi password
            <input
              value={wifiPassword}
              onChange={(e) => setWifiPassword(e.target.value)}
            />
          </label>
          <label>
            Theme
            <select value={theme} onChange={(e) => setTheme(e.target.value)}>
              {THEME_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Layout
            <select value={layout} onChange={(e) => setLayout(e.target.value)}>
              {LAYOUT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <div className="row">
            <button onClick={save} disabled={busy}>
              Save
            </button>
            <button onClick={publish} disabled={busy}>
              Publish to tablet
            </button>
          </div>
          {publishedUrl && (
            <p className="msg">
              <strong>Open this on the tablet</strong> — or set it as Fully Kiosk&apos;s
              start URL:
              <br />
              <a
                href={`${TABLET_BASE}?p=${property.slug}`}
                target="_blank"
                rel="noreferrer"
              >
                {`${TABLET_BASE}?p=${property.slug}`}
              </a>
              <br />
              <br />
              Underlying data file:{" "}
              <a href={publishedUrl} target="_blank" rel="noreferrer">
                {publishedUrl}
              </a>
            </p>
          )}
        </>
      )}
      {msg && <p className="msg">{msg}</p>}
    </main>
  );
}
