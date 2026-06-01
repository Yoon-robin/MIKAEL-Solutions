/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import tls from 'node:tls';
import { isRateLimited, getClientIp } from '@/lib/ssrf-guard';

export const runtime = 'nodejs';

// Certificate Transparency lookup via crt.sh (free, no key) with TLS leaf-cert
// fallback. crt.sh is useful but frequently slow/HTML-errors; the UI should
// still return actionable certificate data instead of a hard 500.

function isValidDomain(domain: string) {
  return /^[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain) && !domain.includes('..');
}

async function fetchCrtSh(domain: string) {
  const urls = [
    `https://crt.sh/?q=%25.${encodeURIComponent(domain)}&output=json`,
    `https://crt.sh/?q=${encodeURIComponent(domain)}&output=json`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(12000),
        headers: { 'User-Agent': 'MIKAEL-Solutions-OSINT/3.0', 'Accept': 'application/json,text/plain,*/*' },
      });
      if (!res.ok) continue;
      const text = await res.text();
      if (!text.trim().startsWith('[')) continue;
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Try next source/form.
    }
  }
  return [];
}

async function fetchLeafCertificate(domain: string) {
  return await new Promise<any>((resolve) => {
    const socket = tls.connect({ host: domain, port: 443, servername: domain, timeout: 8000, rejectUnauthorized: false }, () => {
      const cert = socket.getPeerCertificate(true) as any;
      socket.end();
      if (!cert || Object.keys(cert).length === 0) return resolve(null);
      resolve({
        id: `leaf-${domain}`,
        issuer: cert.issuer ? Object.values(cert.issuer).join(', ') : undefined,
        issuer_name: cert.issuer ? Object.values(cert.issuer).join(', ') : undefined,
        common_name: cert.subject?.CN || domain,
        name_value: cert.subjectaltname ? cert.subjectaltname.replace(/DNS:/g, '').split(', ').join('\n') : cert.subject?.CN || domain,
        not_before: cert.valid_from,
        not_after: cert.valid_to,
        serial: cert.serialNumber,
        fingerprint256: cert.fingerprint256,
        source: 'tls-leaf-fallback',
      });
    });
    socket.on('timeout', () => { socket.destroy(); resolve(null); });
    socket.on('error', () => resolve(null));
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const domain = searchParams.get('domain')?.trim().toLowerCase();
  if (!domain) return NextResponse.json({ error: 'Missing domain parameter' }, { status: 400 });

  const clientIp = getClientIp(req);
  if (isRateLimited(clientIp, 20, 60_000)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  if (!isValidDomain(domain)) {
    return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 });
  }

  const subdomains = new Set<string>();
  const seen = new Set<string>();
  const uniqueCerts: any[] = [];
  let source = 'crt.sh';
  let warning: string | undefined;

  try {
    const certs = await fetchCrtSh(domain);
    for (const cert of certs.slice(0, 300)) {
      const key = `${cert.common_name || ''}-${cert.serial_number || cert.id || ''}-${cert.not_before || ''}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const name = cert.name_value || cert.common_name || '';
      name.split('\n').forEach((n: string) => {
        const clean = n.trim().replace(/^\*\./, '').toLowerCase();
        if (clean === domain || clean.endsWith(`.${domain}`)) subdomains.add(clean);
      });

      uniqueCerts.push({
        id: cert.id,
        issuer: cert.issuer_name,
        issuer_name: cert.issuer_name,
        common_name: cert.common_name,
        name_value: cert.name_value,
        not_before: cert.not_before,
        not_after: cert.not_after,
        serial: cert.serial_number,
        source: 'crt.sh',
      });
    }

    if (uniqueCerts.length === 0) {
      const leaf = await fetchLeafCertificate(domain);
      if (leaf) {
        source = 'tls-leaf-fallback';
        warning = 'crt.sh returned no usable JSON; showing live TLS leaf certificate only.';
        uniqueCerts.push(leaf);
        String(leaf.name_value || '').split('\n').forEach((n) => {
          const clean = n.trim().replace(/^\*\./, '').toLowerCase();
          if (clean === domain || clean.endsWith(`.${domain}`)) subdomains.add(clean);
        });
      } else {
        source = 'none';
        warning = 'No CT records or live TLS certificate could be retrieved.';
      }
    }

    return NextResponse.json({
      domain,
      certificates: uniqueCerts.slice(0, 50),
      subdomains: Array.from(subdomains).sort(),
      total_certs: uniqueCerts.length,
      unique_subdomains: subdomains.size,
      source,
      warning,
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({
      domain,
      certificates: [],
      subdomains: [],
      total_certs: 0,
      unique_subdomains: 0,
      source: 'error',
      warning: e.message || 'Certificate lookup failed',
      timestamp: new Date().toISOString(),
    });
  }
}
