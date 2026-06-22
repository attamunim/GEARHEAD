// web-server.js
// Runs an Express HTTP server alongside the Electron app so that the
// GEARHEAD UI can be accessed from any device on the same network
// (or over the internet via a localtunnel URL).
//
// The server exposes:
//   GET  /                → serves index.html (mobile-adapted)
//   GET  /styles.css      → serves styles.css
//   GET  /renderer.js     → serves the renderer (adapted for fetch-based API)
//   GET  /web-api-shim.js → tiny client-side shim that replaces window.gearhead
//                           IPC calls with REST fetch calls
//   POST /api/<resource>/<action>  → mirrors every IPC handler

'use strict';

const express = require('express');
const path    = require('path');
const http    = require('http');
const os      = require('os');

let server       = null;
let tunnelClient = null;   // localtunnel instance
let _queries     = null;   // injected from main.js after db is ready

const PORT = 49201;        // fixed port – easy to remember / firewall-rule

// ─── Public API ────────────────────────────────────────────────────────────

/** Call once from main.js after queries are loaded. */
function setQueries(queries) {
  _queries = queries;
}

/**
 * Start the Express server + optionally a localtunnel for cellular access.
 * Returns an object with { localUrl, tunnelUrl }.
 */
async function startServer() {
  if (server) return getServerInfo();

  const app = express();
  app.use(express.json());

  // ── Static files ──────────────────────────────────────────────────────
  const root = __dirname;

  // Serve the API shim BEFORE renderer.js so the browser finds it
  app.get('/web-api-shim.js', (_req, res) => {
    res.type('application/javascript').send(buildApiShim());
  });

  app.get('/styles.css',  (_req, res) => res.sendFile(path.join(root, 'styles.css')));
  app.get('/renderer.js', (_req, res) => res.sendFile(path.join(root, 'renderer.js')));

  // index.html – inject the shim script tag & remove CSP that blocks fetch
  app.get('/', (_req, res) => {
    const fs = require('fs');
    let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

    // Remove the strict Electron CSP (doesn't work in a browser anyway)
    html = html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/g, '');

    // Inject shim before renderer.js so window.gearhead is ready
    html = html.replace(
      '<script src="renderer.js"></script>',
      '<script src="/web-api-shim.js"></script>\n<script src="/renderer.js"></script>'
    );

    res.type('text/html').send(html);
  });

  // ── REST API routes ───────────────────────────────────────────────────
  //    POST /api/:resource/:action  with optional JSON body

  app.post('/api/:resource/:action', async (req, res) => {
    const key = `${req.params.resource}:${req.params.action}`;
    const body = req.body;   // may be undefined / null / object / primitive

    try {
      if (!_queries) {
        return res.status(503).json({ error: 'Database not ready' });
      }
      const result = await dispatch(key, body);
      res.json({ ok: true, result });
    } catch (err) {
      console.error(`[web-server] API error (${key}):`, err);
      res.status(500).json({ ok: false, error: String(err.message || err) });
    }
  });

  // ── Start HTTP server ─────────────────────────────────────────────────
  await new Promise((resolve, reject) => {
    server = http.createServer(app);
    server.listen(PORT, '0.0.0.0', resolve);
    server.once('error', reject);
  });

  console.log(`[web-server] Listening on port ${PORT}`);

  // ── Start localtunnel (best-effort, don't crash if it fails) ─────────
  try {
    const localtunnel = require('localtunnel');
    tunnelClient = await localtunnel({ port: PORT, subdomain: 'gearhead-shop' });
    console.log(`[web-server] Tunnel URL: ${tunnelClient.url}`);
    tunnelClient.on('error', (err) => console.error('[localtunnel] error:', err));
    tunnelClient.on('close', () => { tunnelClient = null; });
  } catch (err) {
    console.warn('[web-server] Could not start localtunnel (cellular access unavailable):', err.message);
    tunnelClient = null;
  }

  return getServerInfo();
}

/** Stop server + tunnel gracefully. */
async function stopServer() {
  if (tunnelClient) { tunnelClient.close(); tunnelClient = null; }
  if (server) {
    await new Promise((resolve) => server.close(resolve));
    server = null;
  }
}

/** Return current { localUrl, tunnelUrl, port, running } */
function getServerInfo() {
  const ip  = getLocalIp();
  const localUrl  = server ? `http://${ip}:${PORT}` : null;
  const tunnelUrl = tunnelClient ? tunnelClient.url : null;
  return { running: !!server, localUrl, tunnelUrl, port: PORT, ip };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Pick the first non-loopback IPv4 address. */
function getLocalIp() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return '127.0.0.1';
}

/**
 * Route an API key to the correct db.js query function.
 * Mirrors every handler registered in main.js registerIpcHandlers().
 */
async function dispatch(key, payload) {
  const q = _queries;
  switch (key) {
    // catalog
    case 'catalog:list':   return q.getServiceCatalog();
    case 'catalog:add':    return q.addServiceCatalogItem(payload.name, payload.price);
    case 'catalog:update': return q.updateServiceCatalogItem(payload.id, payload.name, payload.price);
    case 'catalog:delete': return q.deleteServiceCatalogItem(payload);

    // customers
    case 'customer:create': return q.createCustomer(payload);
    case 'customer:find':   return q.findCustomers(payload);
    case 'customer:get':    return q.getCustomer(payload);
    case 'customer:recent': return q.listRecentCustomers(payload);
    case 'customer:list':   return q.listCustomersWithStats();
    case 'customer:update': return q.updateCustomer(payload);
    case 'customer:delete': return q.deleteCustomer(payload);
    case 'customer:visits': return q.getCustomerVisitReport(payload);

    // jobs
    case 'job:create':   return q.createJob(payload);
    case 'job:setItems': return q.setJobItems(payload.job_id, payload.items);
    case 'job:getItems': return q.getJobItems(payload);
    case 'job:complete': return q.completeJobAndBill(payload);
    case 'job:get':      return q.getJob(payload);
    case 'job:listActive': return q.listActiveJobs();

    // bills
    case 'bill:getByJob': return q.getBillByJob(payload);
    case 'bill:recent':   return q.listRecentBills(payload);

    // reminders
    case 'reminders:list': return q.getReminders();

    // reports
    case 'reports:get': return q.getReports();

    default:
      throw new Error(`Unknown API key: ${key}`);
  }
}

/**
 * Build the client-side shim that is injected into the web version.
 * This shim creates window.gearhead with the same shape as preload.js
 * but uses fetch() instead of ipcRenderer.invoke().
 */
function buildApiShim() {
  return `
(function () {
  'use strict';

  async function call(resource, action, payload) {
    const res = await fetch('/api/' + resource + '/' + action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload === undefined ? null : payload),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'API error');
    return data.result;
  }

  window.gearhead = {
    catalog: {
      list:   ()        => call('catalog', 'list'),
      add:    (p)       => call('catalog', 'add', p),
      update: (p)       => call('catalog', 'update', p),
      delete: (id)      => call('catalog', 'delete', id),
    },
    customer: {
      create: (p)       => call('customer', 'create', p),
      find:   (q)       => call('customer', 'find', q),
      get:    (id)      => call('customer', 'get', id),
      recent: (limit)   => call('customer', 'recent', limit),
      list:   ()        => call('customer', 'list'),
      update: (p)       => call('customer', 'update', p),
      delete: (id)      => call('customer', 'delete', id),
      visits: (id)      => call('customer', 'visits', id),
    },
    job: {
      create:     (p)   => call('job', 'create', p),
      setItems:   (p)   => call('job', 'setItems', p),
      getItems:   (id)  => call('job', 'getItems', id),
      complete:   (id)  => call('job', 'complete', id),
      get:        (id)  => call('job', 'get', id),
      listActive: ()    => call('job', 'listActive'),
    },
    bill: {
      getByJob: (id)    => call('bill', 'getByJob', id),
      recent:   (limit) => call('bill', 'recent', limit),
    },
    reminders: {
      list: ()          => call('reminders', 'list'),
    },
    reports: {
      get: ()           => call('reports', 'get'),
    },
    backup: {
      // Backup/restore not supported via web (needs local file dialogs)
      create:        () => Promise.resolve({ canceled: true, webUnsupported: true }),
      restore:       () => Promise.resolve({ canceled: true, webUnsupported: true }),
      autoStatus:    () => Promise.resolve({ backupDir: 'N/A (web view)', latest: null, count: 0 }),
      chooseAutoDir: () => Promise.resolve({ canceled: true, webUnsupported: true }),
    },
    phone: {
      // On mobile, tel: links work natively
      call: (mobile) => {
        const digits = String(mobile || '').replace(/[^\\d+]/g, '');
        if (digits) window.open('tel:' + digits);
        return true;
      },
    },
    // Extra flag so renderer.js can detect web mode if needed
    isWebMode: true,
  };

  // Suppress Electron-only APIs that the renderer might check
  window.__ELECTRON__ = false;

  console.log('[GEARHEAD web-shim] window.gearhead ready (fetch-based)');
})();
`.trim();
}

module.exports = { setQueries, startServer, stopServer, getServerInfo };
