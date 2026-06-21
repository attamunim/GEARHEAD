# GEARHEAD

GEARHEAD is a desktop workshop app for bike service shops. It is built with Electron and SQLite, and keeps customer, job, bill, reminder, report, and backup data on the local computer.

## Features

- Add new customers with bike number, mobile number, meter reading, notes, date, and time.
- Search old customers by name, bike number, or mobile number.
- Add a new job/repair visit for an existing customer.
- Generate bills from completed jobs.
- View all customers.
- Edit or delete customer records.
- Open a customer report showing visit count with visit date/time.
- View daily, weekly, and monthly sales reports.
- Show 30-day service reminders based on the last completed job.
- Create manual backup files.
- Create daily automatic backups.
- Choose the folder used for automatic daily backups.

## Requirements

- Node.js
- npm

## Install

```bash
npm install
```

## Run

```bash
npm start
```

## Build Windows Installer

```bash
npm run build
```

The installer output is created in the `dist` folder.

## Main Workflows

### Add A New Customer

1. Open **New Customer**.
2. Enter customer and bike details.
3. Click **Save Customer & Bike**.
4. The app moves to **Add Job / Repair** for the first job.

### Add Next Visit For Old Customer

1. Open **Add Job / Repair**.
2. Search by bike number, mobile, or name.
3. Select the existing customer.
4. Choose service items or add custom work.
5. Click **Mark Job Done -> Generate Bill**.

This creates a new job record for the same customer. The customer report will count it as another visit and show its date/time.

### View Customer Report

1. Open **Customers**.
2. Find the customer.
3. Click **Report**.

The report shows total visits and the date/time for every recorded job.

### Choose Auto Backup Folder

1. Open **Settings**.
2. Click **Choose Auto Backup Folder**.
3. Select the folder where daily backups should be saved.

The selected folder is saved and reused on the next app launch.

## Data Storage

The main SQLite database is stored in Electron's per-user app data folder:

- Windows: `C:\Users\<you>\AppData\Roaming\gearhead\gearhead.db`
- macOS: `~/Library/Application Support/gearhead/gearhead.db`
- Linux: `~/.config/gearhead/gearhead.db`

Automatic backup settings are saved in:

```text
settings.json
```

inside the same app data folder.

## Backups

Manual backups are created from **Settings -> Create Backup**.

Automatic backups are created once per local calendar day using this filename format:

```text
gearhead-auto-YYYY-MM-DD.db
```

The app keeps the latest 14 automatic backups in the selected auto backup folder.

## Project Files

- `main.js` - Electron main process and IPC handlers.
- `preload.js` - Safe renderer API bridge.
- `renderer.js` - Frontend behavior and screen logic.
- `db.js` - SQLite connection, schema, queries, backup, and restore logic.
- `index.html` - App layout.
- `styles.css` - App styling.
- `package.json` - Scripts, dependencies, and build config.

## Notes

This app is local-first. Data stays on the computer unless you copy or move backup files yourself.

---

# GEARHEAD - اردو

GEARHEAD بائیک سروس ورکشاپس کے لیے ایک ڈیسک ٹاپ ایپ ہے۔ یہ Electron اور SQLite پر بنی ہے۔ کسٹمر، جاب، بل، ریمائنڈر، رپورٹ، اور بیک اپ کا ڈیٹا لوکل کمپیوٹر پر محفوظ ہوتا ہے۔

## فیچرز

- نیا کسٹمر شامل کریں: بائیک نمبر، موبائل نمبر، میٹر ریڈنگ، نوٹس، تاریخ، اور وقت کے ساتھ۔
- پرانے کسٹمر کو نام، بائیک نمبر، یا موبائل نمبر سے تلاش کریں۔
- موجودہ کسٹمر کے لیے نیا جاب/ریپیئر وزٹ شامل کریں۔
- مکمل شدہ جابز سے بل بنائیں۔
- تمام کسٹمرز دیکھیں۔
- کسٹمر ریکارڈ ایڈٹ یا ڈیلیٹ کریں۔
- کسٹمر رپورٹ کھولیں جہاں وزٹ کاؤنٹ اور ہر وزٹ کی تاریخ/وقت نظر آئے۔
- روزانہ، ہفتہ وار، اور ماہانہ سیلز رپورٹس دیکھیں۔
- آخری مکمل شدہ جاب کی بنیاد پر 30 دن کے سروس ریمائنڈرز دیکھیں۔
- مینوئل بیک اپ فائلز بنائیں۔
- روزانہ آٹومیٹک بیک اپ بنائیں۔
- آٹومیٹک روزانہ بیک اپ کے لیے اپنی پسند کا فولڈر منتخب کریں۔

## ضروریات

- Node.js
- npm

## انسٹال

```bash
npm install
```

## چلائیں

```bash
npm start
```

## ونڈوز انسٹالر بنائیں

```bash
npm run build
```

انسٹالر آؤٹ پٹ `dist` فولڈر میں بنتی ہے۔

## اہم طریقہ کار

### نیا کسٹمر شامل کرنا

1. **New Customer** کھولیں۔
2. کسٹمر اور بائیک کی تفصیلات درج کریں۔
3. **Save Customer & Bike** پر کلک کریں۔
4. ایپ پہلے جاب کے لیے **Add Job / Repair** اسکرین پر چلی جائے گی۔

### پرانے کسٹمر کی اگلی وزٹ شامل کرنا

1. **Add Job / Repair** کھولیں۔
2. بائیک نمبر، موبائل، یا نام سے تلاش کریں۔
3. موجودہ کسٹمر منتخب کریں۔
4. سروس آئٹمز منتخب کریں یا کسٹم کام شامل کریں۔
5. **Mark Job Done -> Generate Bill** پر کلک کریں۔

اس سے اسی کسٹمر کے لیے نیا جاب ریکارڈ بنتا ہے۔ کسٹمر رپورٹ میں یہ ایک اور وزٹ شمار ہوگی اور اس کی تاریخ/وقت دکھائی دے گا۔

### کسٹمر رپورٹ دیکھنا

1. **Customers** کھولیں۔
2. کسٹمر تلاش کریں۔
3. **Report** پر کلک کریں۔

رپورٹ کل وزٹس اور ہر ریکارڈ شدہ جاب کی تاریخ/وقت دکھاتی ہے۔

### آٹو بیک اپ فولڈر منتخب کرنا

1. **Settings** کھولیں۔
2. **Choose Auto Backup Folder** پر کلک کریں۔
3. وہ فولڈر منتخب کریں جہاں روزانہ بیک اپ محفوظ کرنے ہیں۔

منتخب شدہ فولڈر محفوظ ہو جاتا ہے اور اگلی بار ایپ کھلنے پر بھی استعمال ہوتا ہے۔

## ڈیٹا اسٹوریج

مین SQLite ڈیٹابیس Electron کے فی یوزر app data فولڈر میں محفوظ ہوتی ہے:

- Windows: `C:\Users\<you>\AppData\Roaming\gearhead\gearhead.db`
- macOS: `~/Library/Application Support/gearhead/gearhead.db`
- Linux: `~/.config/gearhead/gearhead.db`

آٹومیٹک بیک اپ سیٹنگز اسی app data فولڈر کے اندر محفوظ ہوتی ہیں:

```text
settings.json
```

## بیک اپس

مینوئل بیک اپ **Settings -> Create Backup** سے بنتا ہے۔

آٹومیٹک بیک اپ لوکل کیلنڈر دن میں ایک بار بنتا ہے۔ فائل نام کا فارمیٹ:

```text
gearhead-auto-YYYY-MM-DD.db
```

ایپ منتخب شدہ آٹو بیک اپ فولڈر میں تازہ ترین 14 آٹومیٹک بیک اپس رکھتی ہے۔

## پروجیکٹ فائلز

- `main.js` - Electron مین پروسیس اور IPC handlers۔
- `preload.js` - محفوظ renderer API bridge۔
- `renderer.js` - فرنٹ اینڈ behavior اور screen logic۔
- `db.js` - SQLite connection، schema، queries، backup، اور restore logic۔
- `index.html` - ایپ layout۔
- `styles.css` - ایپ styling۔
- `package.json` - scripts، dependencies، اور build config۔

## نوٹس

یہ ایپ local-first ہے۔ ڈیٹا کمپیوٹر پر ہی رہتا ہے جب تک آپ بیک اپ فائلز کو خود copy یا move نہ کریں۔
