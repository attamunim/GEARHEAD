// db.js
// Owns the SQLite database: connection, schema creation, and all queries.
// Runs only in the Electron main process (Node.js side) — never in the renderer.

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { app } = require('electron');

// Store the database in the OS's standard per-user app data folder so it
// persists across app updates and isn't bundled inside the installer.
// e.g. Windows: C:\Users\<you>\AppData\Roaming\gearhead\gearhead.db
//      macOS:   ~/Library/Application Support/gearhead/gearhead.db
//      Linux:   ~/.config/gearhead/gearhead.db
const userDataPath = app.getPath('userData');
if (!fs.existsSync(userDataPath)) fs.mkdirSync(userDataPath, { recursive: true });
const DB_PATH = path.join(userDataPath, 'gearhead.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
db.exec(`
  CREATE TABLE IF NOT EXISTS customers (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    bike_number   TEXT NOT NULL,
    mobile        TEXT NOT NULL,
    meter_reading INTEGER,
    note          TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  CREATE INDEX IF NOT EXISTS idx_customers_bike   ON customers(bike_number);
  CREATE INDEX IF NOT EXISTS idx_customers_mobile ON customers(mobile);

  CREATE TABLE IF NOT EXISTS jobs (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id   INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    status        TEXT NOT NULL DEFAULT 'in_progress', -- in_progress | done
    meter_reading INTEGER,
    notes         TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    completed_at  TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_jobs_customer ON jobs(customer_id);

  CREATE TABLE IF NOT EXISTS job_items (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id    INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    name      TEXT NOT NULL,
    price     INTEGER NOT NULL DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_job_items_job ON job_items(job_id);

  CREATE TABLE IF NOT EXISTS bills (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id      INTEGER NOT NULL UNIQUE REFERENCES jobs(id) ON DELETE CASCADE,
    total       INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  -- Common service catalogue, editable over time. Seeded once below.
  CREATE TABLE IF NOT EXISTS service_catalog (
    id     INTEGER PRIMARY KEY AUTOINCREMENT,
    name   TEXT NOT NULL UNIQUE,
    price  INTEGER NOT NULL DEFAULT 0
  );
`);

// Seed the service catalogue once, only if empty.
const catalogCount = db.prepare('SELECT COUNT(*) AS n FROM service_catalog').get().n;
if (catalogCount === 0) {
  const insert = db.prepare('INSERT INTO service_catalog (name, price) VALUES (?, ?)');
  const seed = db.transaction((rows) => { for (const r of rows) insert.run(r.name, r.price); });
  seed([
    { name: 'Engine Oil Change', price: 1200 },
    { name: 'Chain & Sprocket Tuning', price: 600 },
    { name: 'General Tuning', price: 500 },
    { name: 'Brake Pads', price: 800 },
    { name: 'Clutch Plate', price: 1500 },
    { name: 'Battery Check / Replace', price: 2200 },
    { name: 'Wash & Polish', price: 300 },
  ]);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Days between today and a given local datetime string, floor()'d. */
function daysSince(dateStr) {
  const then = new Date(dateStr.replace(' ', 'T'));
  const now = new Date();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}

// ---------------------------------------------------------------------------
// Queries — exported as a flat API used by main.js / preload.js
// ---------------------------------------------------------------------------

const queries = {

  // ---- service catalogue ----
  getServiceCatalog() {
    return db.prepare('SELECT * FROM service_catalog ORDER BY id ASC').all();
  },

  addServiceCatalogItem(name, price) {
    const stmt = db.prepare('INSERT OR IGNORE INTO service_catalog (name, price) VALUES (?, ?)');
    return stmt.run(name, price);
  },

  // ---- customers / intake ----
  createCustomer({ name, bike_number, mobile, meter_reading, note }) {
    const stmt = db.prepare(`
      INSERT INTO customers (name, bike_number, mobile, meter_reading, note)
      VALUES (@name, @bike_number, @mobile, @meter_reading, @note)
    `);
    const info = stmt.run({ name, bike_number, mobile, meter_reading: meter_reading || null, note: note || null });
    return db.prepare('SELECT * FROM customers WHERE id = ?').get(info.lastInsertRowid);
  },

  // Find customers by bike number or mobile (partial match), most recent first.
  findCustomers(query) {
    const like = `%${query}%`;
    return db.prepare(`
      SELECT * FROM customers
      WHERE bike_number LIKE ? OR mobile LIKE ? OR name LIKE ?
      ORDER BY created_at DESC
      LIMIT 20
    `).all(like, like, like);
  },

  getCustomer(id) {
    return db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
  },

  listRecentCustomers(limit = 20) {
    return db.prepare('SELECT * FROM customers ORDER BY created_at DESC LIMIT ?').all(limit);
  },

  listCustomersWithStats() {
    return db.prepare(`
      SELECT
        customers.*,
        COUNT(jobs.id) AS visit_count,
        MAX(COALESCE(jobs.completed_at, jobs.created_at)) AS last_visit_at,
        COALESCE(SUM(bills.total), 0) AS total_spent
      FROM customers
      LEFT JOIN jobs ON jobs.customer_id = customers.id
      LEFT JOIN bills ON bills.job_id = jobs.id
      GROUP BY customers.id
      ORDER BY customers.created_at DESC
    `).all();
  },

  updateCustomer({ id, name, bike_number, mobile, meter_reading, note }) {
    const stmt = db.prepare(`
      UPDATE customers
      SET name = @name,
          bike_number = @bike_number,
          mobile = @mobile,
          meter_reading = @meter_reading,
          note = @note
      WHERE id = @id
    `);
    stmt.run({
      id,
      name,
      bike_number,
      mobile,
      meter_reading: meter_reading || null,
      note: note || null,
    });
    return queries.getCustomer(id);
  },

  deleteCustomer(id) {
    return db.prepare('DELETE FROM customers WHERE id = ?').run(id);
  },

  getCustomerVisitReport(id) {
    const customer = queries.getCustomer(id);
    if (!customer) return null;

    const visits = db.prepare(`
      SELECT
        jobs.id,
        jobs.status,
        jobs.created_at,
        jobs.completed_at,
        jobs.meter_reading,
        jobs.notes,
        COALESCE(bills.total, 0) AS total
      FROM jobs
      LEFT JOIN bills ON bills.job_id = jobs.id
      WHERE jobs.customer_id = ?
      ORDER BY jobs.created_at DESC
    `).all(id).map((visit) => ({
      ...visit,
      items: queries.getJobItems(visit.id),
    }));

    return {
      customer,
      visit_count: visits.length,
      visits,
    };
  },

  // ---- jobs ----
  // Create a new job (work order) tied to a customer; status starts in_progress.
  createJob({ customer_id, meter_reading, notes }) {
    const stmt = db.prepare(`
      INSERT INTO jobs (customer_id, meter_reading, notes)
      VALUES (?, ?, ?)
    `);
    const info = stmt.run(customer_id, meter_reading || null, notes || null);
    return db.prepare('SELECT * FROM jobs WHERE id = ?').get(info.lastInsertRowid);
  },

  // Replace a job's line items wholesale (simplest correct approach for an edit form).
  setJobItems(job_id, items) {
    const del = db.prepare('DELETE FROM job_items WHERE job_id = ?');
    const ins = db.prepare('INSERT INTO job_items (job_id, name, price) VALUES (?, ?, ?)');
    const tx = db.transaction((items) => {
      del.run(job_id);
      for (const it of items) ins.run(job_id, it.name, Math.round(Number(it.price) || 0));
    });
    tx(items);
    return queries.getJobItems(job_id);
  },

  getJobItems(job_id) {
    return db.prepare('SELECT * FROM job_items WHERE job_id = ?').all(job_id);
  },

  // Mark a job done (stamps completed_at = now) and create its bill in one transaction.
  completeJobAndBill(job_id) {
    const tx = db.transaction(() => {
      db.prepare(`UPDATE jobs SET status = 'done', completed_at = datetime('now','localtime') WHERE id = ?`).run(job_id);
      const items = queries.getJobItems(job_id);
      const total = items.reduce((sum, it) => sum + it.price, 0);
      db.prepare(`
        INSERT INTO bills (job_id, total) VALUES (?, ?)
        ON CONFLICT(job_id) DO UPDATE SET total = excluded.total
      `).run(job_id, total);
      return queries.getBillByJob(job_id);
    });
    return tx();
  },

  getJob(job_id) {
    return db.prepare('SELECT * FROM jobs WHERE id = ?').get(job_id);
  },

  listActiveJobs() {
    return db.prepare(`
      SELECT jobs.*, customers.name, customers.bike_number, customers.mobile
      FROM jobs JOIN customers ON customers.id = jobs.customer_id
      WHERE jobs.status = 'in_progress'
      ORDER BY jobs.created_at DESC
    `).all();
  },

  // ---- bills ----
  getBillByJob(job_id) {
    const bill = db.prepare('SELECT * FROM bills WHERE job_id = ?').get(job_id);
    if (!bill) return null;
    const job = queries.getJob(job_id);
    const customer = queries.getCustomer(job.customer_id);
    const items = queries.getJobItems(job_id);
    return { bill, job, customer, items };
  },

  listRecentBills(limit = 30) {
    return db.prepare(`
      SELECT bills.*, jobs.completed_at, customers.name, customers.bike_number, customers.mobile
      FROM bills
      JOIN jobs ON jobs.id = bills.job_id
      JOIN customers ON customers.id = jobs.customer_id
      ORDER BY bills.created_at DESC
      LIMIT ?
    `).all(limit);
  },

  getReports() {
    const summaryFor = (whereSql) => db.prepare(`
      SELECT
        COUNT(bills.id) AS bill_count,
        COALESCE(SUM(bills.total), 0) AS total_sales,
        COUNT(DISTINCT jobs.customer_id) AS customer_count
      FROM bills
      JOIN jobs ON jobs.id = bills.job_id
      WHERE ${whereSql}
    `).get();

    const serviceFor = (whereSql) => db.prepare(`
      SELECT job_items.name, COUNT(*) AS count, COALESCE(SUM(job_items.price), 0) AS total
      FROM job_items
      JOIN jobs ON jobs.id = job_items.job_id
      JOIN bills ON bills.job_id = jobs.id
      WHERE ${whereSql}
      GROUP BY job_items.name
      ORDER BY count DESC, total DESC
      LIMIT 5
    `).all();

    const periods = {
      today: "date(bills.created_at) = date('now', 'localtime')",
      week: "date(bills.created_at) >= date('now', 'weekday 0', '-6 days', 'localtime')",
      month: "strftime('%Y-%m', bills.created_at) = strftime('%Y-%m', 'now', 'localtime')",
    };

    return Object.fromEntries(Object.entries(periods).map(([key, whereSql]) => [
      key,
      { ...summaryFor(whereSql), top_services: serviceFor(whereSql) },
    ]));
  },

  // ---- reminders: customers whose most recent *completed* job was >=23 days ago,
  // i.e. due within the next week or already overdue past the 30-day mark.
  getReminders() {
    const rows = db.prepare(`
      SELECT customers.id AS customer_id, customers.name, customers.bike_number, customers.mobile,
             MAX(jobs.completed_at) AS last_completed
      FROM jobs
      JOIN customers ON customers.id = jobs.customer_id
      WHERE jobs.status = 'done'
      GROUP BY customers.id
      HAVING last_completed IS NOT NULL
    `).all();

    return rows
      .map(r => {
        const elapsed = daysSince(r.last_completed);
        const daysLeft = 30 - elapsed;
        return { ...r, elapsed, daysLeft };
      })
      // Only show what's relevant: due within 7 days, or overdue.
      .filter(r => r.daysLeft <= 7)
      .sort((a, b) => a.daysLeft - b.daysLeft);
  },
};

function backupTo(filePath) {
  db.pragma('wal_checkpoint(TRUNCATE)');
  return db.backup(filePath).then(() => ({ filePath }));
}

function restoreFrom(filePath) {
  db.close();
  fs.copyFileSync(filePath, DB_PATH);
  for (const sidecar of [`${DB_PATH}-wal`, `${DB_PATH}-shm`]) {
    if (fs.existsSync(sidecar)) fs.unlinkSync(sidecar);
  }
  return { filePath };
}

module.exports = { db, queries, DB_PATH, backupTo, restoreFrom };
