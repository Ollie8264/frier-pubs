import { NextRequest } from "next/server";
import pubs from "@/data/pubs.json";
import type { Pub } from "@/lib/types";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const pub = (pubs as Pub[]).find((p) => p.id === id);

  if (!pub) {
    return Response.json({ error: "Pub not found" }, { status: 404 });
  }

  return Response.json(pub);
}
