import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Radiation monitoring layer.
 *
 * The frontend had a legacy /api/radiation fetch path but no API route. Return
 * a valid empty layer rather than a 404 so saved URLs/old layer state do not
 * put the dashboard into an error state.
 */
export async function GET() {
  return NextResponse.json({
    stations: [],
    total: 0,
    status: 'no_live_source_configured',
    source: 'MIKAEL Solutions placeholder route',
    note: 'Live radiation monitoring feed is not configured; route intentionally returns an empty valid layer instead of 404.',
    timestamp: new Date().toISOString(),
  });
}
