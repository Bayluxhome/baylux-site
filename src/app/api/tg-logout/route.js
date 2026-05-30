export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const res = new Response(null, { status: 302, headers: { Location: "/" } });
  res.headers.append("Set-Cookie", "bx_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0");
  return res;
}
