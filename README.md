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
