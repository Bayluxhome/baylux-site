import { randomUUID } from "crypto";
import { supa } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!supa) return Response.json({ error: "no_db" }, { status: 500 });
  const token = randomUUID().replace(/-/g, "");
  await supa.from("login_tokens").insert({ token });
  return Response.json({ token, url: `https://t.me/baylux_bot?start=login_${token}` });
}
