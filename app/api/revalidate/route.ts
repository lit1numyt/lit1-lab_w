import { revalidatePath } from "next/cache"; import { timingSafeEqual } from "crypto";
// Called by the puller container after it fetches new content: drops every cached page so new writeups appear.
export const dynamic = "force-dynamic";
const ok = (got: string | null) => {
  const want = process.env.REVALIDATE_SECRET;
  if (!want || !got || got.length !== want.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(want));
};
export function POST(req: Request) {
  if (!ok(req.headers.get("x-revalidate-secret"))) return new Response("Unauthorized", { status: 401 });
  revalidatePath("/", "layout");
  return Response.json({ revalidated: true, at: new Date().toISOString() });
}
