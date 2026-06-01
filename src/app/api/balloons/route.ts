import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * High-altitude balloon / radiosonde layer.
 *
 * The UI had a legacy /api/balloons call but no route, causing 404s whenever a
 * saved URL enabled the layer. Until a stable live radiosonde source is wired
 * in, return a valid empty dataset with metadata instead of breaking the app.
 */
export async function GET() {
  return NextResponse.json({
    balloons: [],
    total: 0,
    status: 'no_live_source_configured',
    source: 'MIKAEL Solutions placeholder route',
    note: 'Live balloon/radiosonde feed is not configured; route intentionally returns an empty valid layer instead of 404.',
    timestamp: new Date().toISOString(),
  });
}
