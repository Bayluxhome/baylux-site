import { createClient } from "@supabase/supabase-js";

// Серверный клиент (service_role) — только на сервере, ключ не уходит в браузер.
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supa = url && key
  ? createClient(url, key, { auth: { persistSession: false } })
  : null;
