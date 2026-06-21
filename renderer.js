const api = window.gearhead;

const screenCopy = {
  intake: {
    title: 'New Customer Intake',
    sub: 'When a bike arrives at the shop, log it here first',
  },
  customers: {
    title: 'Customers',
    sub: 'View all customers, update details, delete records, and check visit history',
  },
  job: {
    title: 'Add Job / Repair',
    sub: 'Find the customer by bike number or mobile, then log completed work',
  },
  bill: {
    title: 'Bills',
    sub: 'Generated automatically when a job is marked done',
  },
  reminders: {
    title: '30-Day Service Reminders',
    sub: 'Customers due soon for their next service',
  },
  reports: {
    title: 'Reports',
    sub: 'Today, week, and month totals at a glance',
  },
  settings: {
    title: 'Settings',
    sub: 'Theme, backup, and restore',
  },
};

let selectedCustomer = null;
let currentJob = null;
let catalog = [];
let allCustomers = [];

document.addEventListener('DOMContentLoaded', () => {
  wireSidebar();
  wireIntakeForm();
  wireCustomerScreen();
  wireJobForm();
  wireBillButtons();
  wireSettings();
  applySavedTheme();
  fillCurrentDateTime();
  refreshLists();
});

function wireSidebar() {
  document.querySelectorAll('.nav-item[data-screen]').forEach((item) => {
    item.addEventListener('click', () => showScreen(item.dataset.screen));
  });
}

function showScreen(target) {
  document.querySelectorAll('.nav-item[data-screen]').forEach((nav) => {
    nav.classList.toggle('active', nav.dataset.screen === target);
  });

  document.querySelectorAll('.screen').forEach((screen) => {
    screen.classList.toggle('active', screen.id === `screen-${target}`);
  });

  const copy = screenCopy[target];
  if (copy) {
    document.getElementById('topbarTitle').textContent = copy.title;
    document.getElementById('topbarSub').textContent = copy.sub;
  }

  if (target === 'job') loadCatalog();
  if (target === 'customers') loadCustomers();
  if (target === 'bill') loadRecentBills();
  if (target === 'reminders') loadReminders();
  if (target === 'reports') loadReports();
}

function wireIntakeForm() {
  const form = document.getElementById('intakeForm');
  const clear = document.getElementById('in_clear');

  clear.addEventListener('click', () => {
    form.reset();
    fillCurrentDateTime();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const customer = await api.customer.create({
      name: value('in_name'),
      bike_number: value('in_bike'),
      mobile: value('in_mobile'),
      meter_reading: Number(value('in_meter')) || null,
      note: value('in_note'),
    });

    form.reset();
    fillCurrentDateTime();
    await refreshLists();
    await selectCustomer(customer);
    showScreen('job');
    toast(`Saved ${customer.name}`);
  });
}

function wireJobForm() {
  document.getElementById('job_searchBtn').addEventListener('click', findCustomers);
  document.getElementById('job_search').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') findCustomers();
  });
  document.getElementById('job_addCustomBtn').addEventListener('click', addCustomItem);
  document.getElementById('job_saveDraft').addEventListener('click', saveJobDraft);
  document.getElementById('job_completeBtn').addEventListener('click', completeJob);
}

function wireCustomerScreen() {
  document.getElementById('customer_refresh').addEventListener('click', loadCustomers);
  document.getElementById('customer_filter').addEventListener('input', renderCustomers);

  document.getElementById('customerList').addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const row = button.closest('.customer-card');
    const id = Number(row.dataset.id);
    const action = button.dataset.action;

    if (action === 'report') {
      await loadCustomerReport(id);
      return;
    }

    if (action === 'edit') {
      row.classList.add('editing');
      return;
    }

    if (action === 'cancel') {
      renderCustomers();
      return;
    }

    if (action === 'save') {
      await saveCustomerFromRow(row);
      return;
    }

    if (action === 'delete') {
      await deleteCustomer(id);
    }
  });
}

function wireBillButtons() {
  document.getElementById('bill_back').addEventListener('click', () => showScreen('job'));
  document.getElementById('bill_print').addEventListener('click', () => window.print());
}

function wireSettings() {
  document.querySelectorAll('.theme-choice').forEach((button) => {
    button.addEventListener('click', () => setTheme(button.dataset.theme));
  });

  document.getElementById('backupBtn').addEventListener('click', async () => {
    const result = await api.backup.create();
    if (result.canceled) return;
    document.getElementById('backupStatus').textContent = `Backup saved: ${result.filePath}`;
    toast('Backup created');
  });

  document.getElementById('autoBackupDirBtn').addEventListener('click', async () => {
    const result = await api.backup.chooseAutoDir();
    if (result.canceled) return;
    renderAutoBackupStatus(result);
    toast('Auto backup folder saved');
  });

  document.getElementById('restoreBtn').addEventListener('click', async () => {
    const ok = confirm('Restore will replace current shop data and restart the app. Continue?');
    if (!ok) return;
    const result = await api.backup.restore();
    if (!result.canceled) toast('Restoring backup');
  });

  loadAutoBackupStatus();
}

function applySavedTheme() {
  setTheme(localStorage.getItem('gearhead.theme') || 'dark', false);
}

function setTheme(theme, save = true) {
  document.body.dataset.theme = theme;
  document.querySelectorAll('.theme-choice').forEach((button) => {
    button.classList.toggle('active', button.dataset.theme === theme);
  });
  if (save) localStorage.setItem('gearhead.theme', theme);
}

async function refreshLists() {
  await Promise.all([
    loadRecentCustomers(),
    loadRecentBills(),
    loadReminders(),
    loadActiveJobs(),
  ]);
}

async function loadRecentCustomers() {
  const list = document.getElementById('recentCustomers');
  const customers = await api.customer.recent(8);

  list.innerHTML = customers.map((customer) => `
    <div class="recent-row">
      <div class="sr-avatar">${initials(customer.name)}</div>
      <div class="rr-main">
        <div class="rr-name">${escapeHtml(customer.name)}</div>
        <div class="rr-meta">${escapeHtml(customer.bike_number)} | ${escapeHtml(customer.mobile)}</div>
      </div>
      <div class="rr-right">${formatDate(customer.created_at)}</div>
    </div>
  `).join('') || '<div class="empty-note">No customers saved yet.</div>';
}

async function loadCustomers() {
  allCustomers = await api.customer.list();
  renderCustomers();
}

function renderCustomers() {
  const list = document.getElementById('customerList');
  const filter = value('customer_filter').toLowerCase();
  const customers = allCustomers.filter((customer) => {
    const haystack = `${customer.name} ${customer.bike_number} ${customer.mobile}`.toLowerCase();
    return haystack.includes(filter);
  });

  list.innerHTML = customers.map((customer) => `
    <div class="customer-card" data-id="${customer.id}">
      <div class="customer-view">
        <div class="sr-avatar">${initials(customer.name)}</div>
        <div class="customer-main">
          <div class="customer-name">${escapeHtml(customer.name)}</div>
          <div class="customer-meta">${escapeHtml(customer.bike_number)} | ${escapeHtml(customer.mobile)}</div>
          <div class="customer-sub">${Number(customer.visit_count) || 0} visits | Last: ${formatDateTime(customer.last_visit_at) || 'No job yet'} | Rs ${Number(customer.total_spent).toLocaleString()}</div>
        </div>
        <div class="customer-actions">
          <button class="btn btn-ghost btn-small" type="button" data-action="report">Report</button>
          <button class="btn btn-ghost btn-small" type="button" data-action="edit">Edit</button>
          <button class="btn btn-danger btn-small" type="button" data-action="delete">Delete</button>
        </div>
      </div>

      <div class="customer-edit">
        <div class="form-grid compact-grid">
          <div class="field">
            <label>Name</label>
            <input type="text" data-field="name" value="${escapeAttr(customer.name)}">
          </div>
          <div class="field mono">
            <label>Bike Number</label>
            <input type="text" data-field="bike_number" value="${escapeAttr(customer.bike_number)}">
          </div>
          <div class="field mono">
            <label>Mobile</label>
            <input type="text" data-field="mobile" value="${escapeAttr(customer.mobile)}">
          </div>
          <div class="field mono">
            <label>Meter Reading</label>
            <input type="text" data-field="meter_reading" value="${escapeAttr(customer.meter_reading ?? '')}" inputmode="numeric">
          </div>
          <div class="field full">
            <label>Note</label>
            <textarea rows="2" data-field="note">${escapeHtml(customer.note ?? '')}</textarea>
          </div>
        </div>
        <div class="form-actions">
          <button class="btn btn-ghost btn-small" type="button" data-action="cancel">Cancel</button>
          <button class="btn btn-primary btn-small" type="button" data-action="save">Save Changes</button>
        </div>
      </div>
    </div>
  `).join('') || '<div class="empty-note">No customers found.</div>';
}

async function saveCustomerFromRow(row) {
  const id = Number(row.dataset.id);
  const field = (name) => row.querySelector(`[data-field="${name}"]`).value.trim();

  if (!field('name') || !field('bike_number') || !field('mobile')) {
    toast('Name, bike, and mobile are required');
    return;
  }

  await api.customer.update({
    id,
    name: field('name'),
    bike_number: field('bike_number'),
    mobile: field('mobile'),
    meter_reading: Number(field('meter_reading')) || null,
    note: field('note'),
  });

  await Promise.all([loadCustomers(), refreshLists()]);
  toast('Customer updated');
}

async function deleteCustomer(id) {
  const customer = allCustomers.find((item) => item.id === id);
  const ok = confirm(`Delete ${customer?.name || 'this customer'} and all related jobs/bills?`);
  if (!ok) return;

  await api.customer.delete(id);
  document.getElementById('customerReportPanel').style.display = 'none';
  await Promise.all([loadCustomers(), refreshLists()]);
  toast('Customer deleted');
}

async function loadCustomerReport(id) {
  const report = await api.customer.visits(id);
  const panel = document.getElementById('customerReportPanel');
  const target = document.getElementById('customerReport');

  if (!report) {
    panel.style.display = 'none';
    toast('Customer not found');
    return;
  }

  panel.style.display = '';
  target.innerHTML = `
    <div class="report-headline">
      <div>
        <div class="report-person">${escapeHtml(report.customer.name)}</div>
        <div class="customer-meta">${escapeHtml(report.customer.bike_number)} | ${escapeHtml(report.customer.mobile)}</div>
      </div>
      <div class="report-count">${report.visit_count} visits</div>
    </div>
    <div class="visit-list">
      ${report.visits.map((visit) => `
        <div class="visit-row">
          <div>
            <div class="visit-date">${formatDateTime(visit.created_at)}</div>
            <div class="visit-meta">${visit.status === 'done' ? `Completed ${formatDateTime(visit.completed_at)}` : 'In progress'}${visit.meter_reading ? ` | ${Number(visit.meter_reading).toLocaleString()} km` : ''}</div>
            <div class="visit-items">${visit.items.length ? visit.items.map((item) => escapeHtml(item.name)).join(', ') : escapeHtml(visit.notes || 'No items saved')}</div>
          </div>
          <div class="visit-total">Rs ${Number(visit.total).toLocaleString()}</div>
        </div>
      `).join('') || '<div class="empty-note">No visits/jobs recorded yet.</div>'}
    </div>
  `;
}

async function loadActiveJobs() {
  const badge = document.getElementById('activeJobsBadge');
  const jobs = await api.job.listActive();
  badge.textContent = jobs.length;
  badge.style.display = jobs.length ? '' : 'none';
}

async function loadCatalog() {
  catalog = await api.catalog.list();
  renderCatalog();
}

function renderCatalog() {
  const list = document.getElementById('job_serviceList');
  list.innerHTML = catalog.map((item) => serviceRow(item.name, item.price)).join('');

  list.querySelectorAll('.service-row input').forEach((input) => {
    input.addEventListener('input', updateRunningTotal);
  });

  list.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      checkbox.closest('.service-row').classList.toggle('checked', checkbox.checked);
      updateRunningTotal();
    });
  });

  updateRunningTotal();
}

function serviceRow(name, price) {
  return `
    <label class="service-row">
      <input type="checkbox" data-name="${escapeAttr(name)}">
      <span class="service-name">${escapeHtml(name)}</span>
      <span class="service-price-wrap">
        <input class="service-price" type="text" inputmode="numeric" value="${Number(price) || 0}">
      </span>
    </label>
  `;
}

async function findCustomers() {
  const query = value('job_search');
  if (!query) return;

  const customers = await api.customer.find(query);
  const results = document.getElementById('job_searchResults');

  results.innerHTML = customers.map((customer) => `
    <div class="search-result-item" data-id="${customer.id}">
      <div class="sr-avatar">${initials(customer.name)}</div>
      <div class="sr-info">
        <div class="sr-name">${escapeHtml(customer.name)}</div>
        <div class="sr-meta">${escapeHtml(customer.bike_number)} | ${escapeHtml(customer.mobile)}</div>
      </div>
    </div>
  `).join('') || '<div class="empty-note">No matching customer found.</div>';

  results.querySelectorAll('.search-result-item').forEach((row) => {
    row.addEventListener('click', async () => {
      const customer = customers.find((item) => item.id === Number(row.dataset.id));
      await selectCustomer(customer);
    });
  });
}

async function selectCustomer(customer) {
  selectedCustomer = customer;
  currentJob = null;

  const found = document.getElementById('job_customerFound');
  found.style.display = '';
  found.innerHTML = `
    <div class="cf-avatar">${initials(customer.name)}</div>
    <div class="cf-info">
      <div class="cf-name">${escapeHtml(customer.name)}</div>
      <div class="cf-meta">${escapeHtml(customer.bike_number)} | ${escapeHtml(customer.mobile)}</div>
    </div>
    <div class="cf-tag">Selected</div>
  `;

  document.getElementById('job_formArea').style.display = '';
  document.getElementById('job_searchResults').innerHTML = '';
  document.getElementById('job_search').value = '';
  fillCurrentDateTime();
  await loadCatalog();
}

function addCustomItem() {
  const name = value('job_customName');
  const price = Number(value('job_customPrice')) || 0;
  if (!name) return;

  catalog.push({ name, price });
  document.getElementById('job_customName').value = '';
  document.getElementById('job_customPrice').value = '';
  renderCatalog();

  const rows = document.querySelectorAll('#job_serviceList .service-row');
  const row = rows[rows.length - 1];
  row.querySelector('input[type="checkbox"]').checked = true;
  row.classList.add('checked');
  updateRunningTotal();
}

async function saveJobDraft() {
  if (!selectedCustomer) {
    toast('Select a customer first');
    return null;
  }

  if (!currentJob) {
    currentJob = await api.job.create({
      customer_id: selectedCustomer.id,
      meter_reading: selectedCustomer.meter_reading,
      notes: value('job_notes'),
    });
  }

  await api.job.setItems({ job_id: currentJob.id, items: selectedItems() });
  await loadActiveJobs();
  toast('Job saved');
  return currentJob;
}

async function completeJob() {
  const job = await saveJobDraft();
  if (!job) return;

  const bill = await api.job.complete(job.id);
  await refreshLists();
  renderBill(bill);
  showScreen('bill');
  toast('Bill generated');
}

function selectedItems() {
  return Array.from(document.querySelectorAll('#job_serviceList .service-row'))
    .filter((row) => row.querySelector('input[type="checkbox"]').checked)
    .map((row) => ({
      name: row.querySelector('input[type="checkbox"]').dataset.name,
      price: Number(row.querySelector('.service-price').value) || 0,
    }));
}

function updateRunningTotal() {
  const total = selectedItems().reduce((sum, item) => sum + item.price, 0);
  document.getElementById('job_runningTotal').textContent = `Rs ${total.toLocaleString()}`;
}

async function loadRecentBills() {
  const list = document.getElementById('recentBills');
  const bills = await api.bill.recent(10);

  list.innerHTML = bills.map((bill) => `
    <div class="recent-row" data-job-id="${bill.job_id}">
      <div class="rr-main">
        <div class="rr-name">${escapeHtml(bill.name)}</div>
        <div class="rr-meta">${escapeHtml(bill.bike_number)} | ${formatDate(bill.created_at)}</div>
      </div>
      <div class="rr-amount">Rs ${Number(bill.total).toLocaleString()}</div>
    </div>
  `).join('') || '<div class="empty-note">No bills yet.</div>';

  list.querySelectorAll('.recent-row[data-job-id]').forEach((row) => {
    row.addEventListener('click', async () => {
      renderBill(await api.bill.getByJob(Number(row.dataset.jobId)));
    });
  });
}

async function loadReports() {
  const reports = await api.reports.get();
  const labels = {
    today: 'Today',
    week: 'This Week',
    month: 'This Month',
  };

  document.getElementById('reportGrid').innerHTML = ['today', 'week', 'month'].map((key) => {
    const report = reports[key];
    const services = report.top_services.length
      ? report.top_services.map((service) => `
        <div class="report-service">
          <span>${escapeHtml(service.name)}</span>
          <b>${service.count}</b>
        </div>
      `).join('')
      : '<div class="report-service"><span>No services yet</span><b>0</b></div>';

    return `
      <div class="report-card">
        <div class="report-kicker">${labels[key]}</div>
        <div class="report-total">Rs ${Number(report.total_sales).toLocaleString()}</div>
        <div class="report-meta">${report.bill_count} bills<br>${report.customer_count} customers</div>
        <div class="report-services">${services}</div>
      </div>
    `;
  }).join('');

  const recent = await api.bill.recent(12);
  document.getElementById('reportRecentBills').innerHTML = recent.map((bill) => `
    <div class="recent-row">
      <div class="rr-main">
        <div class="rr-name">${escapeHtml(bill.name)}</div>
        <div class="rr-meta">${escapeHtml(bill.bike_number)} | ${formatDate(bill.created_at)}</div>
      </div>
      <div class="rr-amount">Rs ${Number(bill.total).toLocaleString()}</div>
    </div>
  `).join('') || '<div class="empty-note">No completed work yet.</div>';
}

async function loadAutoBackupStatus() {
  const status = await api.backup.autoStatus();
  renderAutoBackupStatus(status);
}

function renderAutoBackupStatus(status) {
  const latest = status.latest ? status.latest.filePath : 'No automatic backup yet';
  document.getElementById('backupStatus').innerHTML = `
    <span>Auto backup folder: ${escapeHtml(status.backupDir)}</span>
    <span>Latest daily backup: ${escapeHtml(latest)}</span>
  `;
}

function renderBill(data) {
  const empty = document.getElementById('bill_empty');
  const preview = document.getElementById('bill_preview');
  const actions = document.getElementById('bill_actions');

  if (!data) {
    empty.style.display = '';
    actions.style.display = 'none';
    preview.innerHTML = '';
    return;
  }

  empty.style.display = 'none';
  actions.style.display = '';
  preview.innerHTML = `
    <div class="bill-preview">
      <div class="bill-head">
        <div class="shop-name">GEARHEAD</div>
        <div class="shop-meta">Bike Service</div>
      </div>
      <div class="bill-meta-row"><span>Customer</span><b>${escapeHtml(data.customer.name)}</b></div>
      <div class="bill-meta-row"><span>Bike</span><b>${escapeHtml(data.customer.bike_number)}</b></div>
      <div class="bill-meta-row"><span>Mobile</span><b>${escapeHtml(data.customer.mobile)}</b></div>
      <div class="bill-line head"><span>Item</span><span>Amount</span></div>
      ${data.items.map((item) => `<div class="bill-line"><span>${escapeHtml(item.name)}</span><span>Rs ${Number(item.price).toLocaleString()}</span></div>`).join('')}
      <div class="bill-total-row"><span>Total</span><span>Rs ${Number(data.bill.total).toLocaleString()}</span></div>
      <div class="bill-foot">Thank you for choosing GEARHEAD.</div>
    </div>
  `;
}

async function loadReminders() {
  const reminders = await api.reminders.list();
  const list = document.getElementById('reminderList');
  const empty = document.getElementById('reminder_empty');
  const badge = document.getElementById('reminderBadge');

  badge.textContent = reminders.length;
  badge.style.display = reminders.length ? '' : 'none';
  empty.style.display = reminders.length ? 'none' : '';
  list.innerHTML = reminders.map((reminder) => {
    const overdue = reminder.daysLeft < 0;
    return `
      <div class="reminder-item">
        <span class="reminder-dot ${overdue ? 'dot-red' : 'dot-amber'}"></span>
        <div class="reminder-body">
          <div class="reminder-name">${escapeHtml(reminder.name)}</div>
          <div class="reminder-meta">${escapeHtml(reminder.bike_number)} | ${escapeHtml(reminder.mobile)}</div>
        </div>
        <div class="reminder-days ${overdue ? 'days-red' : 'days-amber'}">${overdue ? `${Math.abs(reminder.daysLeft)}d overdue` : `${reminder.daysLeft}d left`}</div>
        <button class="btn btn-call reminder-call" type="button" data-mobile="${escapeAttr(reminder.mobile)}">Call</button>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.reminder-call').forEach((button) => {
    button.addEventListener('click', () => api.phone.call(button.dataset.mobile));
  });
}

function fillCurrentDateTime() {
  const now = new Date();
  const date = now.toLocaleDateString();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  ['in_date', 'job_date'].forEach((id) => {
    const input = document.getElementById(id);
    if (input) input.value = date;
  });

  ['in_time', 'job_time'].forEach((id) => {
    const input = document.getElementById(id);
    if (input) input.value = time;
  });
}

function toast(message) {
  let toastEl = document.querySelector('.toast');
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'toast';
    document.body.appendChild(toastEl);
  }

  toastEl.textContent = message;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 1800);
}

function value(id) {
  return document.getElementById(id).value.trim();
}

function initials(name) {
  return String(name || 'GH')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

function formatDate(value) {
  if (!value) return '';
  return new Date(value.replace(' ', 'T')).toLocaleDateString();
}

function formatDateTime(value) {
  if (!value) return '';
  return new Date(value.replace(' ', 'T')).toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}
