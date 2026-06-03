import { Router } from 'express';
import https from 'https';
import http from 'http';
import { performance } from 'perf_hooks';

const router = Router();

// ── Known fast, reliable targets for latency measurement ───────────────────
const LATENCY_TARGETS = [
  { host: '1.1.1.1', port: 443, label: 'Cloudflare' },
  { host: '8.8.8.8', port: 443, label: 'Google DNS' },
  { host: '208.67.222.222', port: 443, label: 'OpenDNS' },
];

// ── Download test targets (~5 MB file) ──────────────────────────────────────
const DOWNLOAD_URLS = [
  'https://speed.cloudflare.com/__down?bytes=5000000',
  'https://proof.ovh.net/files/5Mb.dat',
];

/**
 * Measure HTTP(S) latency to a target.
 * Returns the minimum ping across 3 attempts in ms.
 */
function measureLatency(target) {
  return new Promise((resolve) => {
    const attempts = [];
    let completed = 0;

    for (let i = 0; i < 3; i++) {
      const start = performance.now();
      const req = https.get({
        hostname: target.host,
        port: target.port,
        path: '/',
        method: 'HEAD',
        timeout: 3000,
        headers: { 'User-Agent': 'StudEx-HealthCheck/1.0' },
      }, (res) => {
        const elapsed = performance.now() - start;
        attempts.push(elapsed);
        res.resume();
        completed++;
        if (completed === 3) resolve(Math.min(...attempts));
      });

      req.on('timeout', () => {
        req.destroy();
        attempts.push(9999);
        completed++;
        if (completed === 3) resolve(Math.min(...attempts));
      });

      req.on('error', () => {
        attempts.push(9999);
        completed++;
        if (completed === 3) resolve(Math.min(...attempts));
      });
    }
  });
}

/**
 * Measure download speed by downloading a file for N seconds.
 * Returns speed in Mbps.
 */
function measureDownloadSpeed(url, durationMs = 3000) {
  return new Promise((resolve) => {
    const start = performance.now();
    let totalBytes = 0;
    let timedOut = false;

    const protocol = url.startsWith('https') ? https : http;

    const req = protocol.get(url, (res) => {
      res.on('data', (chunk) => {
        totalBytes += chunk.length;
        if (performance.now() - start > durationMs && !timedOut) {
          timedOut = true;
          req.destroy();
        }
      });

      res.on('end', () => {
        if (!timedOut) {
          const elapsed = (performance.now() - start) / 1000;
          const bits = totalBytes * 8;
          const speedMbps = (bits / elapsed) / 1_000_000;
          resolve(Math.round(speedMbps * 100) / 100);
        }
      });
    });

    req.setTimeout(durationMs + 2000, () => {
      if (!timedOut) {
        timedOut = true;
        req.destroy();
        const elapsed = durationMs / 1000;
        const bits = totalBytes * 8;
        const speedMbps = (bits / elapsed) / 1_000_000;
        resolve(Math.round(speedMbps * 100) / 100);
      }
    });

    req.on('error', () => {
      resolve(0);
    });

    // Safety timeout
    setTimeout(() => {
      if (!timedOut) {
        timedOut = true;
        req.destroy();
        const elapsed = (performance.now() - start) / 1000;
        const bits = totalBytes * 8;
        const speedMbps = elapsed > 0 ? Math.round(((bits / elapsed) / 1_000_000) * 100) / 100 : 0;
        resolve(speedMbps);
      }
    }, durationMs + 5000);
  });
}

// ── Routes ──────────────────────────────────────────────────────────────────

// GET /api/network/ping — quick latency check
router.get('/ping', async (req, res) => {
  try {
    const results = await Promise.all(
      LATENCY_TARGETS.map(async (target) => {
        const latency = await measureLatency(target);
        return {
          host: target.label,
          address: target.host,
          latencyMs: Math.round(latency * 100) / 100,
        };
      })
    );

    const avg = results.reduce((s, r) => s + r.latencyMs, 0) / results.length;

    res.json({
      status: 'ok',
      targets: results,
      averageLatencyMs: Math.round(avg * 100) / 100,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/network/speedtest — full speed test (latency + download)
router.get('/speedtest', async (req, res) => {
  // Set a longer timeout for speed tests
  req.setTimeout(30000);

  try {
    // Run latency test and download test in parallel
    const [latencyResults, downloadSpeed] = await Promise.all([
      Promise.all(LATENCY_TARGETS.map(measureLatency)),
      measureDownloadSpeed(DOWNLOAD_URLS[0], 5000),
    ]);

    const latencies = latencyResults.map(l => Math.round(l * 100) / 100);
    const avgLatency = Math.round((latencies.reduce((s, l) => s + l, 0) / latencies.length) * 100) / 100;

    // Connection quality assessment
    let quality = 'excellent';
    if (avgLatency > 200 || downloadSpeed < 1) quality = 'poor';
    else if (avgLatency > 100 || downloadSpeed < 5) quality = 'fair';
    else if (avgLatency > 50 || downloadSpeed < 20) quality = 'good';

    res.json({
      status: 'ok',
      latency: {
        averageMs: avgLatency,
        minMs: Math.min(...latencies),
        maxMs: Math.max(...latencies),
        targets: LATENCY_TARGETS.map((t, i) => ({
          host: t.label,
          latencyMs: latencies[i],
        })),
      },
      download: {
        speedMbps: downloadSpeed,
        source: 'speed.cloudflare.com',
      },
      quality,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default function networkRoutes() {
  return router;
}
