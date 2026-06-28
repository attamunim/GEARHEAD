// i18n.js — Translation dictionary for GEARHEAD
// Usage: window.i18n.t('key') returns the translated string for the active language.

(function () {
  'use strict';

  const translations = {
    en: {
      // ── Brand ──────────────────────────────────────────────────────────
      brand_name:   'HAMZA HONDA',
      brand_tag:    'Bike Service',

      // ── Sidebar nav ────────────────────────────────────────────────────
      nav_intake:    'New Customer',
      nav_customers: 'Customers',
      nav_job:       'Add Job / Repair',
      nav_bill:      'Bills',
      nav_reminders: 'Reminders',
      nav_reports:   'Reports',
      nav_settings:  'Settings',

      // ── Sidebar footer ─────────────────────────────────────────────────
      sidebar_owner: 'Shop Owner',
      sidebar_role:  'HAMZA HONDA',

      // ── Topbar ─────────────────────────────────────────────────────────
      topbar_intake:     'New Customer Intake',
      topbar_intake_sub: 'When a bike arrives at the shop, log it here first',
      topbar_customers:     'All Customers',
      topbar_customers_sub: 'Search, update and view full visit history',
      topbar_job:     'Add Job / Repair Done',
      topbar_job_sub: 'Find the customer first, then log the work',
      topbar_bill:     'Bills',
      topbar_bill_sub: 'Print or view any generated bill',
      topbar_reminders:     '30-Day Reminders',
      topbar_reminders_sub: 'Customers due for their next service',
      topbar_reports:     'Reports',
      topbar_reports_sub: 'Sales and service totals',
      topbar_settings:     'Settings',
      topbar_settings_sub: 'Theme, catalog, backup and phone access',

      // ── Language button ────────────────────────────────────────────────
      lang_btn: 'اردو',

      // ── Screen 1: Intake ───────────────────────────────────────────────
      intake_panel_title:  'Customer & Bike Details',
      intake_panel_desc:   'Fill this in once when the bike comes in. Date & time are stamped automatically.',
      lbl_name:            'Customer Name',
      ph_name:             'e.g. Bilal Ahmed',
      lbl_bike:            'Bike Number',
      ph_bike:             'e.g. LEF-19-4471',
      lbl_mobile:          'Mobile Number',
      ph_mobile:           'e.g. 0301-2345678',
      lbl_meter:           'Meter Reading (km)',
      ph_meter:            'e.g. 14820',
      lbl_date:            'Date',
      lbl_time:            'Time',
      lbl_note:            "What's it in for?",
      ph_note:             'e.g. Strange noise from engine, brakes feel loose…',
      auto_tag:            'auto',
      optional_tag:        'optional note',
      btn_clear:           'Clear',
      btn_save_customer:   'Save Customer & Bike →',
      recent_added_title:  'Recently Added',
      recent_added_desc:   'Last few customers logged in.',

      // ── Screen 2: Customers ────────────────────────────────────────────
      customers_panel_title: 'All Customers',
      customers_panel_desc:  'View, update, delete, and open each customer\'s visit report.',
      ph_customer_filter:    'Filter by name, bike number, or mobile...',
      btn_refresh:           'Refresh',
      customer_report_title: 'Customer Report',
      customer_report_desc:  'Visit count with date and time for every recorded job.',
      report_win_title:      'Customer Visit Report',
      report_win_subtitle:   'Detailed service history for this customer',
      btn_print_report:      '🖨 Print',
      btn_close_report:      'Close',

      // ── Screen 3: Job ──────────────────────────────────────────────────
      job_panel_title:   'Add Job — What Was Done',
      job_panel_desc:    'Find the customer by bike number or mobile, then log what work was completed.',
      ph_job_search:     'Search by bike number, mobile, or name…',
      btn_find:          'Find',
      lbl_work_done:     'Work Completed',
      work_done_tag:     'tick what was done — price auto-fills, you can edit it',
      ph_custom_item:    '+ Add a custom item (e.g. Headlight bulb)',
      ph_custom_price:   'Rs price',
      btn_add:           'Add',
      lbl_mech_notes:    'Mechanic Notes',
      optional_tag2:     'optional',
      ph_mech_notes:     'Anything worth remembering for next visit…',
      lbl_running_total: 'Running Total',
      btn_save_draft:    'Save Draft',
      btn_complete_job:  'Mark Job Done → Generate Bill',
      active_drafts_title: 'Active Drafts',
      active_drafts_desc:  'Unfinished jobs saved as drafts. Click to edit, or delete to remove.',
      no_drafts:           'No active drafts.',
      btn_cancel_edit:     'Cancel Edit',

      // ── Screen 4: Bills ────────────────────────────────────────────────
      bill_panel_title:  'Bill',
      bill_panel_desc:   'Generated automatically when a job is marked done.',
      bill_empty:        'No bill selected yet. Complete a job, or pick one from Recent Bills below.',
      btn_back_job:      'Back to Job',
      btn_print_bill:    '🖨 Print Bill',
      recent_bills_title: 'Recent Bills',

      // ── Screen 5: Reminders ────────────────────────────────────────────
      reminders_title:    '30-Day Service Reminders',
      reminders_desc:     'Auto-created 30 days after each customer\'s last completed job. Use Call when a reminder is due.',
      reminders_empty:    'No reminders due right now. Nice and quiet.',
      reminders_note:     '⏱ Reminder = last completed job date + 30 days. Updates automatically as jobs finish.',

      // ── Screen 6: Reports ──────────────────────────────────────────────
      reports_title:       'Reports',
      reports_desc:        'Simple totals for today, this week, and this month.',
      recent_work_title:   'Recent Work',

      // ── Screen 7: Settings ─────────────────────────────────────────────
      settings_theme_title: 'Theme',
      settings_theme_desc:  'Pick the look that is easiest on the eyes.',
      theme_dark:           'Dark',
      theme_light:          'Light',
      theme_comfort:        'Comfort',

      settings_backup_title: 'Backup & Restore',
      settings_backup_desc:  'Save a copy of shop data, or restore from an older backup file.',
      btn_create_backup:    'Create Backup',
      btn_auto_backup_dir:  'Choose Auto Backup Folder',
      btn_restore_backup:   'Restore Backup',
      backup_status_default: 'Backup files contain customers, jobs, bills, services, and reminders.',
      settings_mobile_title: '📱 Mobile & Phone Access',
      settings_mobile_desc:  'Access GEARHEAD from your phone — scan the QR code or open the link directly.',
      mobile_server_starting: 'Starting server…',
      btn_show_qr:          '📷 Show QR Code',
      btn_copy_lan:         'Copy LAN Link',
      btn_copy_cellular:    'Copy Cellular Link',
      mobile_note:          'Devices on the same Wi-Fi use the LAN link. The Cellular link works anywhere in the world.',

      // ── QR Modal ───────────────────────────────────────────────────────
      qr_title:        'HAMZA HONDA Mobile',
      qr_subtitle:     'Scan to open on your phone',
      qr_tab_lan:      '📶 Same Wi-Fi (LAN)',
      qr_tab_tunnel:   '🌐 Cellular / Anywhere',
      btn_copy_link:   'Copy Link',
      qr_tunnel_note:  'Powered by localtunnel. Works over cellular data worldwide. First visit may show a tunnel warning page — just click Continue.',
    },

    ur: {
      // ── Brand ──────────────────────────────────────────────────────────
      brand_name:   'حمزہ ہونڈا',
      brand_tag:    'بائیک سروس',

      // ── Sidebar nav ────────────────────────────────────────────────────
      nav_intake:    'نیا کسٹمر',
      nav_customers: 'کسٹمرز',
      nav_job:       'کام درج کریں',
      nav_bill:      'بل',
      nav_reminders: 'یاد دہانیاں',
      nav_reports:   'رپورٹ',
      nav_settings:  'ترتیبات',

      // ── Sidebar footer ─────────────────────────────────────────────────
      sidebar_owner: 'دکان مالک',
      sidebar_role:  'حمزہ ہونڈا',

      // ── Topbar ─────────────────────────────────────────────────────────
      topbar_intake:     'نئے کسٹمر کا اندراج',
      topbar_intake_sub: 'بائیک آنے پر پہلے یہاں درج کریں',
      topbar_customers:     'تمام کسٹمرز',
      topbar_customers_sub: 'تلاش کریں، تفصیل دیکھیں اور پوری تاریخ جانیں',
      topbar_job:     'کام / مرمت درج کریں',
      topbar_job_sub: 'پہلے کسٹمر تلاش کریں، پھر کام درج کریں',
      topbar_bill:     'بل',
      topbar_bill_sub: 'بل پرنٹ کریں یا دیکھیں',
      topbar_reminders:     '۳۰ روزہ یاد دہانیاں',
      topbar_reminders_sub: 'جن کسٹمرز کی سروس کا وقت ہو گیا',
      topbar_reports:     'رپورٹ',
      topbar_reports_sub: 'فروخت اور سروس کا خلاصہ',
      topbar_settings:     'ترتیبات',
      topbar_settings_sub: 'تھیم، کیٹلاگ، بیک اپ اور موبائل رسائی',

      // ── Language button ────────────────────────────────────────────────
      lang_btn: 'English',

      // ── Screen 1: Intake ───────────────────────────────────────────────
      intake_panel_title:  'کسٹمر اور بائیک کی تفصیل',
      intake_panel_desc:   'بائیک آنے پر ایک بار یہ فارم بھریں۔ تاریخ اور وقت خود بخود درج ہو گا۔',
      lbl_name:            'کسٹمر کا نام',
      ph_name:             'مثلاً: بلال احمد',
      lbl_bike:            'بائیک نمبر',
      ph_bike:             'مثلاً: LEF-19-4471',
      lbl_mobile:          'موبائل نمبر',
      ph_mobile:           'مثلاً: 0301-2345678',
      lbl_meter:           'میٹر ریڈنگ (کلومیٹر)',
      ph_meter:            'مثلاً: 14820',
      lbl_date:            'تاریخ',
      lbl_time:            'وقت',
      lbl_note:            'کیا مسئلہ ہے؟',
      ph_note:             'مثلاً: انجن سے آواز آ رہی ہے، بریک ڈھیلی ہے…',
      auto_tag:            'خودکار',
      optional_tag:        'اختیاری نوٹ',
      btn_clear:           'صاف کریں',
      btn_save_customer:   'کسٹمر محفوظ کریں →',
      recent_added_title:  'حال ہی میں شامل',
      recent_added_desc:   'آخری چند کسٹمرز۔',

      // ── Screen 2: Customers ────────────────────────────────────────────
      customers_panel_title: 'تمام کسٹمرز',
      customers_panel_desc:  'دیکھیں، اپ ڈیٹ کریں، حذف کریں اور ہر کسٹمر کی رپورٹ کھولیں۔',
      ph_customer_filter:    'نام، بائیک نمبر یا موبائل سے فلٹر کریں...',
      btn_refresh:           'تازہ کریں',
      customer_report_title: 'کسٹمر رپورٹ',
      customer_report_desc:  'ہر کام کی تاریخ اور وقت کے ساتھ دوروں کی تعداد۔',
      report_win_title:      'کسٹمر وزٹ رپورٹ',
      report_win_subtitle:   'اس کسٹمر کے کام کی تفصیلی تفصیلات',
      btn_print_report:      '🖨 پرنٹ کریں',
      btn_close_report:      'بند کریں',

      // ── Screen 3: Job ──────────────────────────────────────────────────
      job_panel_title:   'کام درج کریں — کیا ہوا',
      job_panel_desc:    'بائیک نمبر یا موبائل سے کسٹمر تلاش کریں، پھر کام درج کریں۔',
      ph_job_search:     'بائیک نمبر، موبائل یا نام سے تلاش کریں…',
      btn_find:          'تلاش',
      lbl_work_done:     'مکمل کام',
      work_done_tag:     'جو کام ہوا اسے ٹِک کریں — قیمت خود بھر جائے گی، آپ بدل سکتے ہیں',
      ph_custom_item:    '+ خود سے شامل کریں (مثلاً: ہیڈلائٹ بلب)',
      ph_custom_price:   'روپے قیمت',
      btn_add:           'شامل کریں',
      lbl_mech_notes:    'مکینک نوٹس',
      optional_tag2:     'اختیاری',
      ph_mech_notes:     'اگلی ملاقات کے لیے کوئی اہم بات…',
      lbl_running_total: 'کل رقم',
      btn_save_draft:    'مسودہ محفوظ کریں',
      btn_complete_job:  'کام مکمل → بل بنائیں',
      active_drafts_title: 'مسودات (ڈرافٹس)',
      active_drafts_desc:  'نامکمل کام جو مسودہ کے طور پر محفوظ ہیں۔ دیکھنے/ترمیم کے لیے کلک کریں، یا ڈیلیٹ دبائیں۔',
      no_drafts:           'کوئی ڈرافٹ موجود نہیں۔',
      btn_cancel_edit:     'ترمیم منسوخ کریں',

      // ── Screen 4: Bills ────────────────────────────────────────────────
      bill_panel_title:  'بل',
      bill_panel_desc:   'کام مکمل ہونے پر خودکار بنتا ہے۔',
      bill_empty:        'ابھی کوئی بل منتخب نہیں۔ کام مکمل کریں یا نیچے سے بل چنیں۔',
      btn_back_job:      'کام پر واپس',
      btn_print_bill:    '🖨 بل پرنٹ کریں',
      recent_bills_title: 'حالیہ بل',

      // ── Screen 5: Reminders ────────────────────────────────────────────
      reminders_title:    '۳۰ روزہ سروس یاد دہانیاں',
      reminders_desc:     'آخری مکمل کام کے ۳۰ دن بعد خودکار یاد دہانی۔ وقت پر کال کریں۔',
      reminders_empty:    'ابھی کوئی یاد دہانی نہیں۔ سب ٹھیک ہے!',
      reminders_note:     '⏱ یاد دہانی = آخری کام کی تاریخ + ۳۰ دن۔ کام ختم ہونے پر خود اپ ڈیٹ ہوتی ہے۔',

      // ── Screen 6: Reports ──────────────────────────────────────────────
      reports_title:       'رپورٹ',
      reports_desc:        'آج، اس ہفتے اور اس مہینے کے سادہ اعداد و شمار۔',
      recent_work_title:   'حالیہ کام',

      // ── Screen 7: Settings ─────────────────────────────────────────────
      settings_theme_title: 'تھیم',
      settings_theme_desc:  'اپنی پسند کا رنگ چنیں۔',
      theme_dark:           'تاریک',
      theme_light:          'روشن',
      theme_comfort:        'آرام دہ',

      settings_backup_title: 'بیک اپ اور بحالی',
      settings_backup_desc:  'دکان کا ڈیٹا محفوظ کریں یا پرانے بیک اپ سے بحال کریں۔',
      btn_create_backup:    'بیک اپ بنائیں',
      btn_auto_backup_dir:  'خودکار بیک اپ فولڈر چنیں',
      btn_restore_backup:   'بیک اپ بحال کریں',
      backup_status_default: 'بیک اپ میں کسٹمرز، کام، بل، سروسز اور یاد دہانیاں شامل ہیں۔',
      settings_mobile_title: '📱 موبائل رسائی',
      settings_mobile_desc:  'اپنے فون سے گیئرہیڈ کھولیں — QR اسکین کریں یا لنک استعمال کریں۔',
      mobile_server_starting: 'سرور شروع ہو رہا ہے…',
      btn_show_qr:          '📷 QR کوڈ دکھائیں',
      btn_copy_lan:         'LAN لنک کاپی کریں',
      btn_copy_cellular:    'سیلولر لنک کاپی کریں',
      mobile_note:          'ایک ہی Wi-Fi پر موجود آلات LAN لنک استعمال کریں۔ سیلولر لنک دنیا میں کہیں بھی کام کرتا ہے۔',

      // ── QR Modal ───────────────────────────────────────────────────────
      qr_title:        'حمزہ ہونڈا موبائل',
      qr_subtitle:     'فون سے اسکین کریں',
      qr_tab_lan:      '📶 ایک ہی Wi-Fi',
      qr_tab_tunnel:   '🌐 سیلولر / کہیں بھی',
      btn_copy_link:   'لنک کاپی کریں',
      qr_tunnel_note:  'localtunnel سے چلتا ہے۔ دنیا میں کہیں بھی کام کرتا ہے۔ پہلی بار ایک انتباہ آ سکتا ہے — صرف Continue دبائیں۔',
    },
  };

  // ── Public API ───────────────────────────────────────────────────────────
  let currentLang = localStorage.getItem('gh_lang') || 'en';

  window.i18n = {
    /** Return translated string for key in current language. */
    t(key) {
      const dict = translations[currentLang] || translations.en;
      return dict[key] ?? translations.en[key] ?? key;
    },

    /** Switch language and re-render every data-i18n element. */
    setLang(lang) {
      currentLang = lang;
      localStorage.setItem('gh_lang', lang);
      this.applyAll();
      // RTL / font toggle
      document.documentElement.lang = lang;
      document.documentElement.dir  = lang === 'ur' ? 'rtl' : 'ltr';
    },

    getLang() { return currentLang; },

    /**
     * Apply translations to all elements that carry a data-i18n attribute.
     * data-i18n="key"            → sets textContent
     * data-i18n-placeholder="key"→ sets placeholder
     */
    applyAll() {
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = this.t(key);
      });
      document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.placeholder = this.t(key);
      });
    },
  };
})();
