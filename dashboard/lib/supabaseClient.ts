import { createClient } from '@supabase/supabase-js';

// These are read from .env.local (see README). The anon key is public by
// design — per-customer data is protected by Postgres Row-Level Security,
// not by hiding this key.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key';

export const supabase = createClient(url, anonKey);
