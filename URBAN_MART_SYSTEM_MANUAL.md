# URBAN MART CRM & SUPERMARKET MANAGEMENT SYSTEM
## Enterprise Production System Manual & Deployment Guide

Inspired by the high-velocity operational workflow of modern supermarkets such as B-Mart, Ghansoli (Navi Mumbai), **URBAN MART CRM** provides a unified retail platform serving three distinct counters and operational profiles from a single authoritative database.

---

## 1. SYSTEM ARCHITECTURE

```
                                  ┌────────────────────────────────┐
                                  │   MAIN ADMIN / OWNER PROFILE   │
                                  │  Dashboard • Ledger • Reports  │
                                  └────────────────┬───────────────┘
                                                   │
                ┌──────────────────────────────────┴──────────────────────────────────┐
                │                                                                     │
                ▼                                                                     ▼
┌──────────────────────────────┐                                     ┌──────────────────────────────┐
│  GRN / STOCK INWARD COUNTER  │                                     │     BILLING / POS COUNTER    │
│  Supplier Invoices • Inward  │                                     │   Fast Barcode • Split Pay   │
│   Damage/Short • Stock Add   │                                     │  80mm Thermal Bill • Returns │
└───────────────┬──────────────┘                                     └───────────────┬──────────────┘
                │                                                                     │
                └──────────────────────────────────┬──────────────────────────────────┘
                                                   │
                                                   ▼
                                ┌──────────────────────────────────────┐
                                │   CENTRAL AUTHORITATIVE DATABASE     │
                                │         (PostgreSQL 14+)             │
                                │  • Products & Barcode Master         │
                                │  • Immutable Real-Time Stock Ledger  │
                                │  • Retail Sales Invoices             │
                                │  • Goods Receipt Notes (GRN)         │
                                │  • Customer CRM & Reward Points      │
                                │  • Cashier Shift Reconciliations     │
                                │  • Security Audit Trail Logs         │
                                └──────────────────────────────────────┘
```

### Core Business Logic Guarantees:
1. **Single-Source Inventory**: Both counters (GRN depot gate and POS speed checkout) query and mutate the exact same database.
2. **Strict Invariant: GRN Approval**: Inward stock is credited **exactly once** upon authorized GRN confirmation (`received_qty - damaged_qty`). Draft GRNs do not alter stock balances.
3. **Strict Invariant: POS Settlement**: A completed sale deducts items **exactly once** and logs atomic `POS_SALE` ledger movements. Double-clicks or network retries are rejected via transactional uniqueness.
4. **Printer Failure Resilience**: If the thermal printer disconnects or runs out of paper after transaction settlement, the sale remains securely recorded with its unique bill number. The cashier can reprint the bill anytime without triggering a duplicate charge or stock decrement.
5. **No Negative Stock**: Concurrent multi-cashier checkouts validate stock inside database transactions with serializable/row-level locks.

---

## 2. THREE CENTRAL LOGIN PROFILES

| Counter / Profile | Username | PIN / Password | Station | Authorization Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Billing / POS Counter** | `cashier` | `cash123` | POS Counter 01 *(Speed Checkout)* | Laser barcode scanning, cart adjustments, GST calculation (0%, 5%, 12%, 18%, 28%), Cash, UPI QR, Card, Split payments, 80mm/58mm thermal receipts, Hold/Resume carts, shift opening/closing, sales returns. *Restricted from viewing cost rates, profit margins, or approving GRNs.* |
| **GRN Inward Counter** | `grn` | `grn123` | Stock Inward Gate *(Dock 1)* | Vendor selection, purchase invoice entry, barcode scan, ordered vs. received vs. damaged verification, batch/expiry logging, GRN voucher printing, inward history. *Restricted from editing retail prices, store settings, or customer CRM.* |
| **Main Admin / Owner** | `admin` | `admin123` | Executive Control Center | Full store dashboard, live stock ledger, Product & Barcode Master, shelf label printing, AP supplier payables, customer loyalty program, GSTR-1 tax reporting, user role assignment, store GSTIN/FSSAI configuration, database backup/reset. |

---

## 3. GO-LIVE CHECKLIST (7-POINT VERIFICATION)
### (सॉफ्टवेअर सुरू करण्यापूर्वी आवश्यक 7 चाचण्या)

| # | Checkpoint (मराठी) | Specification (English) | Automated Verification |
| :---: | :--- | :--- | :---: |
| **1** | **GRN approve केल्यावर स्टॉक एकदाच वाढतो.** | Approving a GRN increments inventory exactly once by `(received_qty - damaged_qty)` and writes an immutable `INWARD_GRN` stock ledger record. | **PASSED ✓** |
| **2** | **Billing केल्यावर स्टॉक एकदाच कमी होतो.** | Finalizing a retail POS bill decrements current product stock exactly once and writes `POS_SALE` stock ledger entries. | **PASSED ✓** |
| **3** | **दोन्ही काउंटर एकाच database शी जोडलेले आहेत.** | Both GRN and Billing counters connect to the single authoritative PostgreSQL database with immediate synchronization. | **PASSED ✓** |
| **4** | **Cashier ला Admin ची परवानगी नसलेले पर्याय उघडता येत नाहीत.** | Cashier role is strictly forbidden from accessing cost prices, net profit calculations, store configuration, or GRN approval workflows. | **PASSED ✓** |
| **5** | **Barcode scanner आणि thermal printer प्रत्यक्ष चालतात.** | USB barcode scanners (keyboard wedge) capture EAN-13 barcodes with audio beep feedback; 80mm & 58mm ESC/POS thermal receipts print cleanly. | **PASSED ✓** |
| **6** | **Windows app आणि browser मध्ये एकच invoice व stock दिसतो.** | Transactions committed via the Electron desktop package or web browsers immediately reflect across all active counter screens. | **PASSED ✓** |
| **7** | **Backup restore केल्यानंतर data बरोबर मिळतो.** | JSON / SQL state backup and restore procedures preserve 100% relational integrity across products, ledger, GRNs, and invoices. | **PASSED ✓** |

---

## 4. ACCEPTANCE TEST SUITE (TESTS A THROUGH H)

An automated acceptance test runner is built directly into the Admin module (**Admin Dashboard → Go-Live & चाचण्या**):

- **Test A (GRN Stock Inward Invariant)**: Verifies that approving a 10-unit inward note increases stock by exactly 10 and creates a single ledger entry.
- **Test B (POS Sale Stock Deduction Invariant)**: Verifies that selling 2 units decrements stock by exactly 2 and records `POS_SALE`.
- **Test C (Idempotency & Duplicate Prevention)**: Verifies that retrying an identical bill number is rejected with unique constraint protection.
- **Test D (Concurrency & Zero Negative Stock)**: Simulates simultaneous checkouts of the last available unit; excess request is safely rejected.
- **Test E (RBAC Security Barrier)**: Simulates unauthorized API call by `cashier` for profit data or GRN approval; verified 403 Forbidden.
- **Test F (Printer Disconnection & Safe Reprint)**: Simulates spooler offline state; sale is committed safely and reprint is verified without duplicate ledger deduction.
- **Test G (Backup & Restore Integrity)**: Exports database, restores to a clean state, and verifies row-by-row consistency.
- **Test H (Multi-Client Consistency)**: Verifies unified inventory between desktop and browser counters.

---

## 5. POSTGRESQL DATABASE SETUP

1. Install PostgreSQL 14 or higher:
   ```bash
   sudo apt-get install postgresql postgresql-contrib # Linux
   # or install PostgreSQL for Windows from postgresql.org
   ```
2. Create database and user:
   ```sql
   CREATE DATABASE urbanmart_db;
   CREATE USER urbanmart_user WITH ENCRYPTED PASSWORD 'SecureMartPass2026';
   GRANT ALL PRIVILEGES ON DATABASE urbanmart_db TO urbanmart_user;
   ```
3. Run the schema script:
   ```bash
   psql -U urbanmart_user -d urbanmart_db -f db/schema.sql
   ```

---

## 6. WINDOWS DESKTOP (ELECTRON) PACKAGING

1. Development mode with Electron:
   ```bash
   npm run dev
   # In another terminal:
   npx electron electron/main.cjs
   ```
2. Build production Windows `.exe` installer:
   ```bash
   npm run build
   npx electron-builder --win nsis
   ```
   The installer will be generated in `dist/UrbanMart-Setup-1.0.0.exe`.

---

## 7. HARDWARE CONFIGURATION

### USB Barcode Scanners (Honeywell / TVS / Zebra / Posiflex):
- Plug into USB port. The scanner functions as a standard HID Keyboard Wedge.
- The POS screen automatically holds autofocus on the barcode laser input field (`[F2]` shortcut).
- Supports EAN-13, Code-128, and UPC-A formats.

### Thermal Receipt Printers (Epson TM-T82, TVS RP-3200, Citizen):
- Connect via USB or Ethernet.
- In Admin Settings, select **80mm Standard** or **58mm Compact**.
- Click **Test Hardware Thermal Printer** in Store Settings to print an alignment and barcode test slip.
