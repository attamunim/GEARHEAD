const api = window.gearhead;

// Helper to escape HTML to prevent XSS
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr.replace(' ', 'T'));
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr.replace(' ', 'T'));
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

document.addEventListener('DOMContentLoaded', async () => {
  // Apply theme from parent/localStorage
  const theme = localStorage.getItem('gearhead.theme') || 'dark';
  document.body.dataset.theme = theme;

  // Apply translations
  if (window.i18n) {
    i18n.applyAll();
    const lang = i18n.getLang();
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ur' ? 'rtl' : 'ltr';
  }

  // Get customer id from query param
  const urlParams = new URLSearchParams(window.location.search);
  const customerId = Number(urlParams.get('id'));

  if (!customerId) {
    alert('Invalid Customer ID');
    return;
  }

  const report = await api.customer.visits(customerId);
  if (!report) {
    alert('Report not found');
    return;
  }

  // Populate Customer Details
  document.getElementById('customerName').textContent = report.customer.name;
  document.getElementById('customerDetails').textContent = `${report.customer.bike_number} | ${report.customer.mobile}`;
  
  const visitsText = window.i18n && i18n.getLang() === 'ur' 
    ? `${report.visit_count} دورے`
    : `${report.visit_count} visits`;
  document.getElementById('visitCount').textContent = visitsText;

  // Populate Visits
  const listEl = document.getElementById('visitList');
  if (report.visits.length === 0) {
    const emptyText = window.i18n && i18n.getLang() === 'ur'
      ? 'ابھی تک کوئی دورہ ریکارڈ نہیں کیا گیا۔'
      : 'No visits/jobs recorded yet.';
    listEl.innerHTML = `<div class="empty-note">${emptyText}</div>`;
    return;
  }

  listEl.innerHTML = report.visits.map((visit) => {
    const isUr = window.i18n && i18n.getLang() === 'ur';
    const statusText = visit.status === 'done' 
      ? (isUr ? `مکمل ${formatDateTime(visit.completed_at)}` : `Completed ${formatDateTime(visit.completed_at)}`)
      : (isUr ? 'جاری ہے' : 'In progress');
    
    const readingText = visit.meter_reading 
      ? ` | ${Number(visit.meter_reading).toLocaleString()} km` 
      : '';
      
    const itemsText = visit.items.length 
      ? visit.items.map((item) => escapeHtml(item.name)).join(', ') 
      : escapeHtml(visit.notes || (isUr ? 'کوئی کام ریکارڈ نہیں کیا گیا' : 'No items saved'));

    return `
      <div class="visit-card">
        <div class="visit-left">
          <div class="visit-date-str">${formatDateTime(visit.created_at)}</div>
          <div class="visit-sub-meta">
            <span class="status-tag">${statusText}</span>${readingText}
          </div>
          <div class="visit-items-list">${itemsText}</div>
        </div>
        <div class="visit-right">
          <div class="visit-price">Rs ${Number(visit.total).toLocaleString()}</div>
        </div>
      </div>
    `;
  }).join('');
});
