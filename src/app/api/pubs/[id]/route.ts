import { NextRequest } from "next/server";
import pubs from "@/data/pubs.json";
import type { Pub } from "@/lib/types";
import { injectSun, getSunStatsFor } from "@/lib/sun";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const found = (pubs as Pub[]).find((p) => p.id === id);

  if (!found) {
    return Response.json({ error: "Pub not found" }, { status: 404 });
  }

  // Don't mutate the cached import — make a copy
  const pub = { ...found };

  // Optional ?day=N override for date planner
  const dayParam = req.nextUrl.searchParams.get("day");
  const day = dayParam ? Math.max(1, Math.min(365, parseInt(dayParam, 10))) : undefined;
  injectSun(pub, day);

  // Attach year-round sun stats (sunniest month, etc.) for the detail panel
  const sunStats = getSunStatsFor(id);
  return Response.json(
    { ...pub, sunStats },
    {
      headers: {
        // Individual pub data changes rarely — let CDN cache aggressively.
        "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}
