const api = window.gearhead;

// Maps each screen name to its i18n title/subtitle keys
const screenI18n = {
  intake:    { title: 'topbar_intake',     sub: 'topbar_intake_sub' },
  customers: { title: 'topbar_customers',  sub: 'topbar_customers_sub' },
  job:       { title: 'topbar_job',        sub: 'topbar_job_sub' },
  bill:      { title: 'topbar_bill',       sub: 'topbar_bill_sub' },
  reminders: { title: 'topbar_reminders',  sub: 'topbar_reminders_sub' },
  reports:   { title: 'topbar_reports',    sub: 'topbar_reports_sub' },
  settings:  { title: 'topbar_settings',   sub: 'topbar_settings_sub' },
};

let selectedCustomer = null;
let currentJob = null;
let catalog = [];
let allCustomers = [];

document.addEventListener('DOMContentLoaded', () => {
  // Apply saved language first so the UI renders correctly from the start
  if (window.i18n) {
    i18n.applyAll();
    // Sync html[dir] from saved lang
    const lang = i18n.getLang();
    document.documentElement.lang = lang;
    document.documentElement.dir  = lang === 'ur' ? 'rtl' : 'ltr';
  }

  wireSidebar();
  wireLangToggle();
  wireIntakeForm();
  wireCustomerScreen();
  wireJobForm();
  wireBillButtons();
  wireSettings();
  applySavedTheme();
  fillCurrentDateTime();
  refreshLists();
});

function wireLangToggle() {
  const btn = document.getElementById('langToggleBtn');
  if (!btn || !window.i18n) return;
  btn.addEventListener('click', () => {
    const next = i18n.getLang() === 'en' ? 'ur' : 'en';
    i18n.setLang(next);
    // Refresh topbar for the current screen
    const activeScreen = document.querySelector('.nav-item.active')?.dataset?.screen;
    if (activeScreen) _updateTopbar(activeScreen);
  });
}

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

  _updateTopbar(target);

  if (target === 'job') {
    if (!currentJob) loadCatalog();
    loadActiveJobs();
  }
  if (target === 'customers') loadCustomers();
  if (target === 'bill') loadRecentBills();
  if (target === 'reminders') loadReminders();
  if (target === 'reports') loadReports();
}

function _updateTopbar(screen) {
  const keys = screenI18n[screen];
  if (!keys) return;
  const title = window.i18n ? i18n.t(keys.title) : keys.title;
  const sub   = window.i18n ? i18n.t(keys.sub)   : keys.sub;
  document.getElementById('topbarTitle').textContent = title;
  document.getElementById('topbarSub').textContent   = sub;
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
  const searchInput = document.getElementById('job_search');
  searchInput.addEventListener('click', findCustomers);
  searchInput.addEventListener('input', findCustomers);
  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') findCustomers();
  });
  
  document.getElementById('job_searchBtn').addEventListener('click', findCustomers);
  document.getElementById('job_addCustomBtn').addEventListener('click', addCustomItem);
  document.getElementById('job_saveDraft').addEventListener('click', saveJobDraft);
  document.getElementById('job_completeBtn').addEventListener('click', completeJob);
  document.getElementById('job_cancelEdit').addEventListener('click', cancelJobEdit);
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
      await api.customer.openReport(id);
      return;
    }

    if (action === 'create-job') {
      const customer = allCustomers.find((c) => c.id === id);
      if (customer) {
        await selectCustomer(customer);
        showScreen('job');
      }
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
          <div class="customer-sub">Last Visit: ${formatDateTime(customer.last_visit_at) || 'No job yet'}</div>
          ${customer.note ? `<div class="customer-sub" style="margin-top: 4px; font-style: italic; color: var(--steel-400);">Note: ${escapeHtml(customer.note)}</div>` : ''}
        </div>
        <div class="customer-stats">
          <div class="stat-pill visits-stat">
            <span class="stat-num">${Number(customer.visit_count) || 0}</span>
            <span class="stat-label">visits</span>
          </div>
          <div class="stat-pill spent-stat">
            <span class="stat-num">Rs ${Number(customer.total_spent).toLocaleString()}</span>
            <span class="stat-label">spent</span>
          </div>
        </div>
        <div class="customer-actions">
          <button class="btn btn-primary btn-small" type="button" data-action="create-job">Create Job</button>
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
  await Promise.all([loadCustomers(), refreshLists()]);
  toast('Customer deleted');
}


async function loadActiveJobs() {
  const badge = document.getElementById('activeJobsBadge');
  const jobs = await api.job.listActive();
  badge.textContent = jobs.length;
  badge.style.display = jobs.length ? '' : 'none';
  renderActiveDrafts(jobs);
}

function renderActiveDrafts(jobs) {
  const list = document.getElementById('activeDraftsList');
  if (!list) return;

  if (!jobs.length) {
    const noText = window.i18n ? i18n.t('no_drafts') : 'No active drafts.';
    list.innerHTML = `<div class="empty-note">${noText}</div>`;
    return;
  }

  list.innerHTML = jobs.map((job) => `
    <div class="recent-row draft-row" data-job-id="${job.id}" data-customer-id="${job.customer_id}">
      <div class="rr-main">
        <div class="rr-name">${escapeHtml(job.name)}</div>
        <div class="rr-meta">${escapeHtml(job.bike_number)} | ${formatDate(job.created_at)}${job.notes ? ' | ' + escapeHtml(job.notes) : ''}</div>
      </div>
      <div class="rr-amount">Rs ${Number(job.total).toLocaleString()}</div>
      <div class="draft-actions">
        <button class="btn btn-ghost btn-small draft-edit-btn" data-job-id="${job.id}" title="Edit">✏️</button>
        <button class="btn btn-danger btn-small draft-delete-btn" data-job-id="${job.id}" title="Delete">🗑️</button>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.draft-edit-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      editJobDraft(Number(btn.dataset.jobId));
    });
  });

  list.querySelectorAll('.draft-delete-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteJobDraft(Number(btn.dataset.jobId));
    });
  });

  // Clicking the row itself also edits
  list.querySelectorAll('.draft-row').forEach((row) => {
    row.addEventListener('click', () => {
      editJobDraft(Number(row.dataset.jobId));
    });
  });
}

async function loadCatalog() {
  catalog = await api.catalog.list();
  renderCatalog();
}

function renderCatalog(newCheckedName, newCheckedPrice) {
  const list = document.getElementById('job_serviceList');
  if (!list) return;

  // 1. Get currently checked service names and their modified prices from the UI
  const checkedRows = Array.from(list.querySelectorAll('.service-row'))
    .filter(row => row.querySelector('input[type="checkbox"]').checked);
  
  const checkedPrices = {};
  const checkedNames = checkedRows.map(row => {
    const name = row.querySelector('input[type="checkbox"]').dataset.name;
    const priceInput = row.querySelector('.service-price');
    checkedPrices[name] = priceInput ? (Number(priceInput.value) || 0) : 0;
    return name;
  });

  if (newCheckedName) {
    checkedNames.push(newCheckedName);
    checkedPrices[newCheckedName] = newCheckedPrice;
  }

  // 2. Render catalog items, preserving checks and edited prices
  list.innerHTML = catalog.map((item) => {
    const isChecked = checkedNames.includes(item.name);
    const currentPrice = isChecked ? checkedPrices[item.name] : 0;
    return serviceRow(item.name, currentPrice, isChecked);
  }).join('');

  // 3. Re-bind event listeners
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

function serviceRow(name, price, isChecked = false) {
  return `
    <label class="service-row${isChecked ? ' checked' : ''}">
      <input type="checkbox" data-name="${escapeAttr(name)}"${isChecked ? ' checked' : ''}>
      <span class="service-name">${escapeHtml(name)}</span>
      <span class="service-price-wrap">
        <input class="service-price" type="text" inputmode="numeric" value="${price}">
      </span>
    </label>
  `;
}

async function findCustomers() {
  const query = value('job_search');
  const results = document.getElementById('job_searchResults');
  
  if (!query) {
    results.innerHTML = '';
    return;
  }

  const customers = await api.customer.find(query);

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
  
  // Render catalog, keeping all previously checked items checked!
  renderCatalog(name, price);

  // Check the new item at the bottom (so the added item is selected immediately)
  const rows = document.querySelectorAll('#job_serviceList .service-row');
  const lastRow = rows[rows.length - 1];
  if (lastRow) {
    lastRow.querySelector('input[type="checkbox"]').checked = true;
    lastRow.classList.add('checked');
  }
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
  } else {
    // Update existing draft notes
    await api.job.update({ id: currentJob.id, notes: value('job_notes') });
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
  // Reset form state after completing
  cancelJobEdit();
  await refreshLists();
  renderBill(bill);
  showScreen('bill');
  toast('Bill generated');
}

async function editJobDraft(jobId) {
  const job = await api.job.get(jobId);
  if (!job) { toast('Draft not found'); return; }

  const customer = await api.customer.get(job.customer_id);
  if (!customer) { toast('Customer not found'); return; }

  // Select the customer without resetting currentJob
  selectedCustomer = customer;
  currentJob = job;

  const found = document.getElementById('job_customerFound');
  found.style.display = '';
  found.innerHTML = `
    <div class="cf-avatar">${initials(customer.name)}</div>
    <div class="cf-info">
      <div class="cf-name">${escapeHtml(customer.name)}</div>
      <div class="cf-meta">${escapeHtml(customer.bike_number)} | ${escapeHtml(customer.mobile)}</div>
    </div>
    <div class="cf-tag">Editing Draft</div>
  `;

  document.getElementById('job_formArea').style.display = '';
  document.getElementById('job_searchResults').innerHTML = '';
  document.getElementById('job_search').value = '';

  // Fill notes
  document.getElementById('job_notes').value = job.notes || '';

  // Load catalog and then overlay the draft's saved items
  catalog = await api.catalog.list();
  const draftItems = await api.job.getItems(jobId);

  // Merge any custom items from draft into catalog
  for (const item of draftItems) {
    if (!catalog.find(c => c.name === item.name)) {
      catalog.push({ name: item.name, price: item.price });
    }
  }

  // Build a map of draft item names -> prices
  const draftMap = {};
  for (const item of draftItems) draftMap[item.name] = item.price;

  // Render catalog
  const listEl = document.getElementById('job_serviceList');
  listEl.innerHTML = catalog.map((item) => {
    const isDraftItem = item.name in draftMap;
    const price = isDraftItem ? draftMap[item.name] : 0;
    return serviceRow(item.name, price, isDraftItem);
  }).join('');

  // Re-bind event listeners
  listEl.querySelectorAll('.service-row input').forEach((input) => {
    input.addEventListener('input', updateRunningTotal);
  });
  listEl.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      checkbox.closest('.service-row').classList.toggle('checked', checkbox.checked);
      updateRunningTotal();
    });
  });

  updateRunningTotal();

  // Show cancel button
  document.getElementById('job_cancelEdit').style.display = '';

  // Fill date/time
  fillCurrentDateTime();

  // Scroll to top of job screen
  document.getElementById('screen-job').scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelJobEdit() {
  selectedCustomer = null;
  currentJob = null;

  document.getElementById('job_customerFound').style.display = 'none';
  document.getElementById('job_customerFound').innerHTML = '';
  document.getElementById('job_formArea').style.display = 'none';
  document.getElementById('job_notes').value = '';
  document.getElementById('job_serviceList').innerHTML = '';
  document.getElementById('job_runningTotal').textContent = 'Rs 0';
  document.getElementById('job_cancelEdit').style.display = 'none';
  document.getElementById('job_search').value = '';
  document.getElementById('job_searchResults').innerHTML = '';
}

async function deleteJobDraft(jobId) {
  if (!confirm('Delete this draft? This cannot be undone.')) return;

  await api.job.delete(jobId);

  // If we were editing this draft, cancel the edit
  if (currentJob && currentJob.id === jobId) {
    cancelJobEdit();
  }

  await loadActiveJobs();
  toast('Draft deleted');
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
        <div class="bill-logo">
          <div class="honda-badge">HONDA</div>
        </div>
        <div class="shop-name">HAMZA HONDA</div>
        <div class="shop-address">ADA Sufi More, Chiniot Road Jhang</div>
        <div class="shop-phones">0345-4082226 / 0341-2332 / 0345-4009356</div>
      </div>
      <div class="bill-meta-row"><span>Customer</span><b>${escapeHtml(data.customer.name)}</b></div>
      <div class="bill-meta-row"><span>Bike</span><b>${escapeHtml(data.customer.bike_number)}</b></div>
      <div class="bill-meta-row"><span>Mobile</span><b>${escapeHtml(data.customer.mobile)}</b></div>
      <div class="bill-line head"><span>Item</span><span>Amount</span></div>
      ${data.items.map((item) => `<div class="bill-line"><span>${escapeHtml(item.name)}</span><span>Rs ${Number(item.price).toLocaleString()}</span></div>`).join('')}
      <div class="bill-total-row"><span>Total</span><span>Rs ${Number(data.bill.total).toLocaleString()}</span></div>
      <div class="bill-foot">Thank you for choosing HAMZA HONDA.</div>
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

// Generates initials (limit 2 chars max) from customer name
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

// ─────────────────────────────────────────────────────────────────────────────
// MOBILE ACCESS — QR CODE FEATURE
// ─────────────────────────────────────────────────────────────────────────────

// Only available when running inside Electron (window.gearhead.webserver exists)
const isElectron = !!(window.gearhead && window.gearhead.webserver);

let _serverInfo = null;          // cached server info { localUrl, tunnelUrl, running }
let qrLanInstance     = null;    // QRCode instance for LAN tab
let qrTunnelInstance  = null;    // QRCode instance for tunnel tab
let qrLanUrl          = null;    // last URL rendered into LAN canvas
let qrTunnelUrl       = null;    // last URL rendered into tunnel canvas

// ── Wire up the settings panel buttons ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (!isElectron) return;

  // Show QR button → open modal
  document.getElementById('showQrBtn').addEventListener('click', openQrModal);

  // Copy LAN link
  document.getElementById('copyLocalUrl').addEventListener('click', async () => {
    const info = await fetchServerInfo();
    if (info && info.localUrl) {
      copyToClipboard(info.localUrl);
      toast('LAN link copied!');
    } else {
      toast('Server not running yet');
    }
  });

  // Copy tunnel link
  document.getElementById('copyTunnelUrl').addEventListener('click', async () => {
    const info = await fetchServerInfo();
    if (info && info.tunnelUrl) {
      copyToClipboard(info.tunnelUrl);
      toast('Cellular link copied!');
    } else {
      toast('Tunnel not available — check internet connection');
    }
  });

  // Poll server info every 4 s so the status dot stays up to date
  pollServerInfo();
  setInterval(pollServerInfo, 4000);
});

// ── QR Modal wiring ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const modal    = document.getElementById('qrModal');
  const backdrop = document.getElementById('qrBackdrop');
  const closeBtn = document.getElementById('qrClose');
  const tabLan   = document.getElementById('tabLan');
  const tabTunnel= document.getElementById('tabTunnel');
  const paneLan  = document.getElementById('pane-lan');
  const paneTunnel = document.getElementById('pane-tunnel');

  if (!modal) return;

  // Close on backdrop / close-button / Escape
  backdrop.addEventListener('click', closeQrModal);
  closeBtn.addEventListener('click', closeQrModal);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeQrModal(); });

  // Tab switching
  tabLan.addEventListener('click', () => switchQrTab('lan'));
  tabTunnel.addEventListener('click', () => switchQrTab('tunnel'));

  // Copy buttons inside modal
  document.getElementById('copyLanBtn').addEventListener('click', async () => {
    const info = _serverInfo;
    if (info && info.localUrl) { copyToClipboard(info.localUrl); toast('LAN link copied!'); }
  });
  document.getElementById('copyTunnelBtn').addEventListener('click', async () => {
    const info = _serverInfo;
    if (info && info.tunnelUrl) { copyToClipboard(info.tunnelUrl); toast('Cellular link copied!'); }
  });
});

function openQrModal() {
  const modal = document.getElementById('qrModal');
  if (!modal) return;
  modal.style.display = '';
  renderQrCodes();
}

function closeQrModal() {
  const modal = document.getElementById('qrModal');
  if (modal) modal.style.display = 'none';
}

function switchQrTab(tab) {
  const isLan = (tab === 'lan');
  document.getElementById('tabLan').classList.toggle('active', isLan);
  document.getElementById('tabTunnel').classList.toggle('active', !isLan);
  document.getElementById('pane-lan').style.display = isLan ? '' : 'none';
  document.getElementById('pane-tunnel').style.display = isLan ? 'none' : '';
}

// ── Fetch + cache server info ─────────────────────────────────────────────────
async function fetchServerInfo() {
  if (!isElectron) return null;
  try {
    _serverInfo = await api.webserver.info();
    return _serverInfo;
  } catch (err) {
    console.warn('[QR] Could not get server info:', err);
    return null;
  }
}

async function pollServerInfo() {
  const info = await fetchServerInfo();
  updateMobileStatusUI(info);
}

function updateMobileStatusUI(info) {
  const dot  = document.getElementById('mobileStatusDot');
  const text = document.getElementById('mobileStatusText');
  const note = document.getElementById('mobileAccessNote');
  if (!dot || !text) return;

  if (!info || !info.running) {
    dot.className  = 'mobile-status-dot dot-off';
    text.textContent = 'Server not running';
    return;
  }

  dot.className  = 'mobile-status-dot dot-on';
  const parts = [];
  if (info.localUrl)  parts.push(`LAN: ${info.localUrl}`);
  if (info.tunnelUrl) parts.push(`Cellular: ${info.tunnelUrl}`);
  text.textContent = parts.join('  •  ') || 'Running…';

  if (note) {
    if (!info.tunnelUrl) {
      note.textContent = '⚠ Cellular tunnel unavailable — check internet. LAN link still works on same Wi-Fi.';
    } else {
      note.textContent = 'LAN link: same Wi-Fi only.  Cellular link: works anywhere worldwide.';
    }
  }
}

// ── Render QR codes ──────────────────────────────────────────────────────────
async function renderQrCodes() {
  const info = await fetchServerInfo();
  if (!info) return;

  const subtitle = document.getElementById('qrSubtitle');

  // LAN QR
  const lanBox = document.getElementById('qrCodeLan');
  const urlLanEl = document.getElementById('urlLan');
  if (info.localUrl) {
    if (qrLanUrl !== info.localUrl) {
      lanBox.innerHTML = '';
      qrLanInstance = new QRCode(lanBox, {
        text: info.localUrl,
        width: 220, height: 220,
        colorDark: '#0f172a', colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M,
      });
      qrLanUrl = info.localUrl;
    }
    urlLanEl.textContent = info.localUrl;
  } else {
    lanBox.innerHTML = '<div class="qr-unavail">Server not running</div>';
    urlLanEl.textContent = '—';
  }

  // Tunnel QR
  const tunnelBox = document.getElementById('qrCodeTunnel');
  const urlTunnelEl = document.getElementById('urlTunnel');
  if (info.tunnelUrl) {
    if (qrTunnelUrl !== info.tunnelUrl) {
      tunnelBox.innerHTML = '';
      qrTunnelInstance = new QRCode(tunnelBox, {
        text: info.tunnelUrl,
        width: 220, height: 220,
        colorDark: '#0f172a', colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M,
      });
      qrTunnelUrl = info.tunnelUrl;
    }
    urlTunnelEl.textContent = info.tunnelUrl;
    if (subtitle) subtitle.textContent = 'Scan with your phone camera to open';
  } else {
    tunnelBox.innerHTML = '<div class="qr-unavail">Tunnel unavailable — no internet or service limit reached</div>';
    urlTunnelEl.textContent = '—';
    if (subtitle) subtitle.textContent = 'LAN tab available · Cellular tunnel offline';
  }
}

// ── Clipboard helper ─────────────────────────────────────────────────────────
function copyToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  ta.remove();
}
