import {
  AuditLog,
  CartItem,
  CashierShift,
  Category,
  Customer,
  GRN,
  GRNItem,
  HeldCart,
  PaymentDetails,
  Product,
  SaleInvoice,
  SalesReturn,
  SalesReturnItem,
  StockLedgerEntry,
  StoreSettings,
  Supplier,
  User,
} from '../types';
import {
  INITIAL_CATEGORIES,
  INITIAL_CUSTOMERS,
  INITIAL_PRODUCTS,
  INITIAL_SETTINGS,
  INITIAL_SUPPLIERS,
  INITIAL_USERS,
} from './seedData';

const STORAGE_KEYS = {
  USERS: 'um_users_v1',
  CATEGORIES: 'um_categories_v1',
  PRODUCTS: 'um_products_v1',
  SUPPLIERS: 'um_suppliers_v1',
  CUSTOMERS: 'um_customers_v1',
  GRNS: 'um_grns_v1',
  INVOICES: 'um_invoices_v1',
  STOCK_LEDGER: 'um_stock_ledger_v1',
  SHIFTS: 'um_shifts_v1',
  HELD_CARTS: 'um_held_carts_v1',
  SALES_RETURNS: 'um_sales_returns_v1',
  AUDIT_LOGS: 'um_audit_logs_v1',
  SETTINGS: 'um_settings_v1',
};

// Listeners for real-time reactivity within app
type DBListener = () => void;
const listeners: Set<DBListener> = new Set();

export const subscribeToDB = (listener: DBListener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const notifyListeners = () => {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.error('DB Notification error:', e);
    }
  });
};

function getFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    return JSON.parse(item) as T;
  } catch (e) {
    console.error(`Error reading ${key} from localStorage:`, e);
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error saving ${key} to localStorage:`, e);
  }
}

// Initial seed setup if first time
export function initializeDB(): void {
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    saveToStorage(STORAGE_KEYS.USERS, INITIAL_USERS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.CATEGORIES)) {
    saveToStorage(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
  }
  if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
    saveToStorage(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.SUPPLIERS)) {
    saveToStorage(STORAGE_KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.CUSTOMERS)) {
    saveToStorage(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
    saveToStorage(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
  }

  // Pre-seed an initial completed GRN and sample invoice if empty so dashboard is rich
  const existingGRNs = getFromStorage<GRN[]>(STORAGE_KEYS.GRNS, []);
  if (existingGRNs.length === 0) {
    const seedGRN: GRN = {
      id: 'grn-seed-01',
      grnNumber: 'GRN-2026-0001',
      supplierId: 'sup-01',
      supplierName: 'Gujarat Co-op Milk Marketing (Amul Depot Vashi)',
      invoiceNumber: 'INV-AMUL-9821',
      invoiceDate: '2026-10-10',
      receivedDate: '2026-10-11',
      items: [
        {
          id: 'gi-1',
          productId: 'prod-01',
          productName: 'Amul Butter Salted 500g',
          barcode: '8901262010051',
          batchNumber: 'B-AM2602',
          expiryDate: '2026-11-20',
          orderedQty: 50,
          receivedQty: 50,
          damagedQty: 2,
          purchaseRate: 242.0,
          mrp: 285.0,
          sellingPrice: 275.0,
          taxRate: 5,
          taxAmount: 580.8,
          lineTotal: 12196.8,
          notes: '2 cartons received with outer packaging puncture, segregated as damaged',
        },
      ],
      subTotal: 11616.0,
      totalTax: 580.8,
      roundOff: 0.2,
      grandTotal: 12197.0,
      status: 'CONFIRMED',
      createdBy: 'usr-grn-01',
      createdByName: 'Amit Shinde',
      counterName: 'Stock Inward / GRN Dock 1',
      confirmedAt: '2026-10-11T11:30:00Z',
      confirmedBy: 'Amit Shinde',
      remarks: 'Goods verified and batch labels verified. Cold storage checked.',
      createdAt: '2026-10-11T11:00:00Z',
    };
    saveToStorage(STORAGE_KEYS.GRNS, [seedGRN]);
  }

  const existingLedger = getFromStorage<StockLedgerEntry[]>(STORAGE_KEYS.STOCK_LEDGER, []);
  if (existingLedger.length === 0) {
    const seedLedger: StockLedgerEntry[] = [
      {
        id: 'ledg-01',
        timestamp: '2026-10-11T11:30:00Z',
        productId: 'prod-01',
        productName: 'Amul Butter Salted 500g',
        barcode: '8901262010051',
        movementType: 'INWARD_GRN',
        referenceNo: 'GRN-2026-0001',
        qtyChanged: 48, // 50 received - 2 damaged
        openingStock: 0,
        closingStock: 48,
        unitRate: 242.0,
        performedBy: 'Amit Shinde',
        counter: 'GRN Dock 1',
        notes: 'Inward verification via Purchase Invoice INV-AMUL-9821',
      },
    ];
    saveToStorage(STORAGE_KEYS.STOCK_LEDGER, seedLedger);
  }

  const existingInvoices = getFromStorage<SaleInvoice[]>(STORAGE_KEYS.INVOICES, []);
  if (existingInvoices.length === 0) {
    const seedInvoice: SaleInvoice = {
      id: 'inv-seed-01',
      billNumber: 'UM-POS-2026-0101',
      shiftId: 'shift-seed-01',
      cashierId: 'usr-cashier-01',
      cashierName: 'Pooja Patil',
      counterNumber: 'Counter 01',
      customerId: 'cust-01',
      customerName: 'Anjali Deshmukh',
      customerPhone: '9820199887',
      items: [
        {
          productId: 'prod-02',
          productName: 'Tata Salt Vacuum Evaporated Iodised 1kg',
          barcode: '8901058852339',
          batchNumber: 'TS-26090',
          expiryDate: '2027-08-30',
          hsnCode: '25010010',
          mrp: 30.0,
          unitPrice: 28.0,
          quantity: 2,
          discountPerUnit: 0,
          taxRate: 0,
          taxableAmount: 56.0,
          cgstAmount: 0,
          sgstAmount: 0,
          totalAmount: 56.0,
          availableStock: 120,
        },
        {
          productId: 'prod-05',
          productName: 'Nestle Maggi 2-Minute Masala Noodles 70g',
          barcode: '8901058862147',
          batchNumber: 'MAG-26011',
          expiryDate: '2027-03-20',
          hsnCode: '19023010',
          mrp: 14.0,
          unitPrice: 14.0,
          quantity: 4,
          discountPerUnit: 0,
          taxRate: 12,
          taxableAmount: 50.0,
          cgstAmount: 3.0,
          sgstAmount: 3.0,
          totalAmount: 56.0,
          availableStock: 180,
        },
      ],
      subTotal: 112.0,
      totalSavings: 4.0,
      billDiscount: 0,
      cgstTotal: 3.0,
      sgstTotal: 3.0,
      totalTax: 6.0,
      roundOff: 0.0,
      grandTotal: 112.0,
      paymentDetails: {
        method: 'UPI',
        cashAmount: 0,
        upiAmount: 112.0,
        cardAmount: 0,
        upiRef: 'UPI/261011/98201',
        tenderedAmount: 112.0,
        changeAmount: 0,
      },
      loyaltyPointsEarned: 1,
      loyaltyPointsRedeemed: 0,
      status: 'COMPLETED',
      createdAt: '2026-10-12T08:15:00Z',
      printCount: 1,
    };
    saveToStorage(STORAGE_KEYS.INVOICES, [seedInvoice]);
  }

  const existingAudit = getFromStorage<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
  if (existingAudit.length === 0) {
    const seedAudit: AuditLog[] = [
      {
        id: 'aud-01',
        timestamp: '2026-10-11T09:00:00Z',
        userId: 'usr-admin-01',
        userName: 'Rajesh Sharma',
        role: 'admin',
        action: 'SYSTEM_BOOT',
        module: 'System',
        details: 'Urban Mart Central DB initialized with master catalogs and settings',
      },
    ];
    saveToStorage(STORAGE_KEYS.AUDIT_LOGS, seedAudit);
  }
}

// Ensure initialized on module load
initializeDB();

// ---------------------- DATABASE API ----------------------

export const db = {
  // Users
  getUsers: (): User[] => getFromStorage(STORAGE_KEYS.USERS, INITIAL_USERS),
  getUserById: (id: string): User | undefined => {
    return db.getUsers().find((u) => u.id === id);
  },
  authenticate: (username: string, pin: string): User | null => {
    const users = db.getUsers();
    const user = users.find(
      (u) =>
        u.username.trim().toLowerCase() === username.trim().toLowerCase() &&
        u.pin === pin &&
        u.active
    );
    if (user) {
      db.addAuditLog(user.id, user.fullName, user.role, 'LOGIN', 'Authentication', `Successful login at ${user.counterName}`);
    }
    return user || null;
  },
  saveUser: (user: User): void => {
    const users = db.getUsers();
    const index = users.findIndex((u) => u.id === user.id);
    if (index >= 0) {
      users[index] = user;
    } else {
      users.push(user);
    }
    saveToStorage(STORAGE_KEYS.USERS, users);
    notifyListeners();
  },

  // Categories
  getCategories: (): Category[] => getFromStorage(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES),
  saveCategory: (category: Category): void => {
    const cats = db.getCategories();
    const index = cats.findIndex((c) => c.id === category.id);
    if (index >= 0) cats[index] = category;
    else cats.push(category);
    saveToStorage(STORAGE_KEYS.CATEGORIES, cats);
    notifyListeners();
  },

  // Products & Barcodes
  getProducts: (): Product[] => getFromStorage(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS),
  getProductById: (id: string): Product | undefined => {
    return db.getProducts().find((p) => p.id === id);
  },
  getProductByBarcode: (barcode: string): Product | undefined => {
    const clean = barcode.trim();
    return db.getProducts().find((p) => p.barcode === clean || p.sku.toLowerCase() === clean.toLowerCase());
  },
  saveProduct: (product: Product, user?: User): void => {
    const products = db.getProducts();
    const index = products.findIndex((p) => p.id === product.id);
    const isNew = index < 0;

    if (isNew) {
      products.push(product);
      if (user) {
        db.addAuditLog(user.id, user.fullName, user.role, 'PRODUCT_CREATE', 'Inventory Master', `Created new SKU: ${product.sku} (${product.name})`);
      }
    } else {
      products[index] = { ...product, updatedAt: new Date().toISOString() };
      if (user) {
        db.addAuditLog(user.id, user.fullName, user.role, 'PRODUCT_UPDATE', 'Inventory Master', `Updated product: ${product.name} (MRP: ₹${product.mrp}, Stock: ${product.currentStock})`);
      }
    }
    saveToStorage(STORAGE_KEYS.PRODUCTS, products);
    notifyListeners();
  },
  deleteProduct: (id: string, user?: User): boolean => {
    const products = db.getProducts();
    const target = products.find((p) => p.id === id);
    if (!target) return false;
    const filtered = products.filter((p) => p.id !== id);
    saveToStorage(STORAGE_KEYS.PRODUCTS, filtered);
    if (user) {
      db.addAuditLog(user.id, user.fullName, user.role, 'PRODUCT_DELETE', 'Inventory Master', `Deleted SKU: ${target.sku} (${target.name})`);
    }
    notifyListeners();
    return true;
  },

  // Suppliers
  getSuppliers: (): Supplier[] => getFromStorage(STORAGE_KEYS.SUPPLIERS, INITIAL_SUPPLIERS),
  saveSupplier: (supplier: Supplier, user?: User): void => {
    const suppliers = db.getSuppliers();
    const index = suppliers.findIndex((s) => s.id === supplier.id);
    if (index >= 0) suppliers[index] = supplier;
    else suppliers.push(supplier);
    saveToStorage(STORAGE_KEYS.SUPPLIERS, suppliers);
    if (user) {
      db.addAuditLog(user.id, user.fullName, user.role, 'SUPPLIER_SAVE', 'Suppliers', `Saved supplier: ${supplier.companyName}`);
    }
    notifyListeners();
  },

  // Customers CRM
  getCustomers: (): Customer[] => getFromStorage(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS),
  getCustomerByPhone: (phone: string): Customer | undefined => {
    const clean = phone.trim().replace(/\D/g, '');
    return db.getCustomers().find((c) => c.phone.replace(/\D/g, '').endsWith(clean.slice(-10)));
  },
  saveCustomer: (customer: Customer): void => {
    const customers = db.getCustomers();
    const index = customers.findIndex((c) => c.id === customer.id);
    if (index >= 0) customers[index] = customer;
    else customers.push(customer);
    saveToStorage(STORAGE_KEYS.CUSTOMERS, customers);
    notifyListeners();
  },

  // GRN (Goods Receipt Note) Management
  getGRNs: (): GRN[] => getFromStorage(STORAGE_KEYS.GRNS, []),
  getGRNById: (id: string): GRN | undefined => {
    return db.getGRNs().find((g) => g.id === id);
  },
  generateGRNNumber: (): string => {
    const count = db.getGRNs().length + 1;
    return `GRN-2026-${String(count).padStart(4, '0')}`;
  },
  saveGRN: (grn: GRN): void => {
    const grns = db.getGRNs();
    const index = grns.findIndex((g) => g.id === grn.id);
    if (index >= 0) grns[index] = grn;
    else grns.push(grn);
    saveToStorage(STORAGE_KEYS.GRNS, grns);
    notifyListeners();
  },

  /**
   * CRITICAL BUSINESS RULE:
   * Approving GRN increases inventory EXACTLY ONCE.
   * Atomic stock ledger entry written for each product item received (minus damaged).
   */
  confirmAndApproveGRN: (
    grnId: string,
    confirmingUser: User
  ): { success: boolean; message: string; updatedStockItems: number } => {
    const grns = db.getGRNs();
    const grnIndex = grns.findIndex((g) => g.id === grnId);
    if (grnIndex < 0) {
      return { success: false, message: 'GRN not found', updatedStockItems: 0 };
    }

    const grn = grns[grnIndex];
    if (grn.status === 'CONFIRMED') {
      return { success: false, message: 'GRN has already been confirmed and stock is already updated!', updatedStockItems: 0 };
    }

    const products = db.getProducts();
    const stockLedger = db.getStockLedger();
    const nowIso = new Date().toISOString();
    let updatedCount = 0;

    for (const item of grn.items) {
      const netReceived = Number(item.receivedQty) - Number(item.damagedQty);
      if (netReceived <= 0) continue;

      const pIndex = products.findIndex((p) => p.id === item.productId);
      if (pIndex >= 0) {
        const prod = products[pIndex];
        const oldStock = prod.currentStock;
        const newStock = oldStock + netReceived;

        // Update product stock and optionally cost / MRP if revised in GRN
        prod.currentStock = newStock;
        if (item.purchaseRate > 0) prod.purchaseRate = item.purchaseRate;
        if (item.mrp > 0) prod.mrp = item.mrp;
        if (item.sellingPrice > 0) prod.sellingPrice = item.sellingPrice;
        if (item.batchNumber) prod.batchNumber = item.batchNumber;
        if (item.expiryDate) prod.expiryDate = item.expiryDate;
        prod.updatedAt = nowIso;

        // Record atomic movement in Stock Ledger
        const ledgerEntry: StockLedgerEntry = {
          id: `ledg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: nowIso,
          productId: prod.id,
          productName: prod.name,
          barcode: prod.barcode,
          movementType: 'INWARD_GRN',
          referenceNo: grn.grnNumber,
          qtyChanged: netReceived,
          openingStock: oldStock,
          closingStock: newStock,
          unitRate: item.purchaseRate,
          performedBy: confirmingUser.fullName,
          counter: grn.counterName || confirmingUser.counterName,
          notes: `GRN Inward: ${grn.grnNumber} (Supplier: ${grn.supplierName}, Inv: ${grn.invoiceNumber}${item.damagedQty > 0 ? `, Damaged: ${item.damagedQty}` : ''})`,
        };
        stockLedger.push(ledgerEntry);
        updatedCount++;
      }
    }

    // Mark GRN as CONFIRMED
    grn.status = 'CONFIRMED';
    grn.confirmedAt = nowIso;
    grn.confirmedBy = confirmingUser.fullName;
    grns[grnIndex] = grn;

    // Update supplier outstanding balance
    const suppliers = db.getSuppliers();
    const sup = suppliers.find((s) => s.id === grn.supplierId);
    if (sup) {
      sup.outstandingBalance = (sup.outstandingBalance || 0) + grn.grandTotal;
      saveToStorage(STORAGE_KEYS.SUPPLIERS, suppliers);
    }

    // Persist all together
    saveToStorage(STORAGE_KEYS.PRODUCTS, products);
    saveToStorage(STORAGE_KEYS.STOCK_LEDGER, stockLedger);
    saveToStorage(STORAGE_KEYS.GRNS, grns);

    db.addAuditLog(
      confirmingUser.id,
      confirmingUser.fullName,
      confirmingUser.role,
      'GRN_CONFIRM',
      'GRN Counter',
      `Confirmed GRN ${grn.grnNumber}. Updated inventory for ${updatedCount} items. Net invoice: ₹${grn.grandTotal}`
    );

    notifyListeners();
    return { success: true, message: `GRN ${grn.grnNumber} approved! Stock increased for ${updatedCount} SKUs.`, updatedStockItems: updatedCount };
  },

  // POS Invoices & Sales
  getInvoices: (): SaleInvoice[] => getFromStorage(STORAGE_KEYS.INVOICES, []),
  getInvoiceByBillNumber: (billNo: string): SaleInvoice | undefined => {
    const clean = billNo.trim().toUpperCase();
    return db.getInvoices().find((inv) => inv.billNumber.toUpperCase() === clean);
  },
  generateBillNumber: (): string => {
    const count = db.getInvoices().length + 1;
    return `UM-POS-2026-${String(count).padStart(4, '0')}`;
  },

  /**
   * CRITICAL BUSINESS RULE:
   * Completed sale decreases inventory EXACTLY ONCE.
   * Atomically verifies stock, deducts stock, writes ledger, updates cashier shift totals, and updates customer loyalty.
   */
  processSaleInvoice: (
    saleData: {
      customerId?: string;
      customerName: string;
      customerPhone?: string;
      items: CartItem[];
      subTotal: number;
      totalSavings: number;
      billDiscount: number;
      cgstTotal: number;
      sgstTotal: number;
      totalTax: number;
      roundOff: number;
      grandTotal: number;
      paymentDetails: PaymentDetails;
      pointsToRedeem?: number;
    },
    cashierUser: User,
    activeShiftId: string
  ): { success: boolean; invoice?: SaleInvoice; message: string } => {
    if (!saleData.items || saleData.items.length === 0) {
      return { success: false, message: 'Cart is empty!' };
    }

    const products = db.getProducts();
    const stockLedger = db.getStockLedger();
    const invoices = db.getInvoices();
    const nowIso = new Date().toISOString();
    const billNumber = db.generateBillNumber();

    // 1. Stock check: Ensure items exist and log warnings if negative stock
    for (const item of saleData.items) {
      const p = products.find((prod) => prod.id === item.productId);
      if (!p) {
        return { success: false, message: `Product not found: ${item.productName}` };
      }
    }

    // 2. Atomic stock deduction
    for (const item of saleData.items) {
      const pIndex = products.findIndex((p) => p.id === item.productId);
      const prod = products[pIndex];
      const oldStock = prod.currentStock;
      const newStock = oldStock - item.quantity;
      prod.currentStock = newStock;
      prod.updatedAt = nowIso;

      // Ledger entry
      const ledgerEntry: StockLedgerEntry = {
        id: `ledg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: nowIso,
        productId: prod.id,
        productName: prod.name,
        barcode: prod.barcode,
        movementType: 'POS_SALE',
        referenceNo: billNumber,
        qtyChanged: -item.quantity,
        openingStock: oldStock,
        closingStock: newStock,
        unitRate: item.unitPrice,
        performedBy: cashierUser.fullName,
        counter: cashierUser.counterName,
        notes: `POS Sale to ${saleData.customerName || 'Walk-in'} (Bill: ${billNumber})`,
      };
      stockLedger.push(ledgerEntry);
    }

    // 3. Loyalty points computation (1 point per ₹100 spent)
    const pointsEarned = Math.floor(saleData.grandTotal / 100);
    const pointsRedeemed = saleData.pointsToRedeem || 0;

    if (saleData.customerId) {
      const customers = db.getCustomers();
      const c = customers.find((cust) => cust.id === saleData.customerId);
      if (c) {
        c.totalSpent += saleData.grandTotal;
        c.loyaltyPoints = Math.max(0, c.loyaltyPoints - pointsRedeemed + pointsEarned);
        saveToStorage(STORAGE_KEYS.CUSTOMERS, customers);
      }
    } else if (saleData.customerPhone && saleData.customerPhone.trim().length >= 10) {
      // Auto register walk-in if phone provided
      const existing = db.getCustomerByPhone(saleData.customerPhone);
      if (existing) {
        existing.totalSpent += saleData.grandTotal;
        existing.loyaltyPoints += pointsEarned;
        saveToStorage(STORAGE_KEYS.CUSTOMERS, db.getCustomers());
      } else {
        const newCust: Customer = {
          id: `cust-${Date.now()}`,
          name: saleData.customerName || 'Loyal Customer',
          phone: saleData.customerPhone.trim(),
          loyaltyPoints: pointsEarned,
          totalSpent: saleData.grandTotal,
          customerType: 'Regular',
          createdAt: nowIso,
        };
        db.saveCustomer(newCust);
      }
    }

    // 4. Create invoice record
    const newInvoice: SaleInvoice = {
      id: `inv-${Date.now()}`,
      billNumber,
      shiftId: activeShiftId,
      cashierId: cashierUser.id,
      cashierName: cashierUser.fullName,
      counterNumber: cashierUser.counterName,
      customerId: saleData.customerId,
      customerName: saleData.customerName || 'Walk-in Customer',
      customerPhone: saleData.customerPhone,
      items: saleData.items,
      subTotal: saleData.subTotal,
      totalSavings: saleData.totalSavings,
      billDiscount: saleData.billDiscount,
      cgstTotal: saleData.cgstTotal,
      sgstTotal: saleData.sgstTotal,
      totalTax: saleData.totalTax,
      roundOff: saleData.roundOff,
      grandTotal: saleData.grandTotal,
      paymentDetails: saleData.paymentDetails,
      loyaltyPointsEarned: pointsEarned,
      loyaltyPointsRedeemed: pointsRedeemed,
      status: 'COMPLETED',
      createdAt: nowIso,
      printCount: 1,
    };

    invoices.push(newInvoice);

    // 5. Update Cashier Shift Totals
    const shifts = db.getShifts();
    const activeShift = shifts.find((s) => s.id === activeShiftId && s.status === 'OPEN');
    if (activeShift) {
      if (saleData.paymentDetails.method === 'CASH') {
        activeShift.totalCashSales += saleData.grandTotal;
      } else if (saleData.paymentDetails.method === 'UPI') {
        activeShift.totalUpiSales += saleData.grandTotal;
      } else if (saleData.paymentDetails.method === 'CARD') {
        activeShift.totalCardSales += saleData.grandTotal;
      } else if (saleData.paymentDetails.method === 'SPLIT') {
        activeShift.totalCashSales += saleData.paymentDetails.cashAmount || 0;
        activeShift.totalUpiSales += saleData.paymentDetails.upiAmount || 0;
        activeShift.totalCardSales += saleData.paymentDetails.cardAmount || 0;
      }
      activeShift.totalBillsCount += 1;
      saveToStorage(STORAGE_KEYS.SHIFTS, shifts);
    }

    // Persist changes
    saveToStorage(STORAGE_KEYS.PRODUCTS, products);
    saveToStorage(STORAGE_KEYS.STOCK_LEDGER, stockLedger);
    saveToStorage(STORAGE_KEYS.INVOICES, invoices);

    db.addAuditLog(
      cashierUser.id,
      cashierUser.fullName,
      cashierUser.role,
      'POS_SALE',
      'POS Counter',
      `Completed bill ${billNumber} for ₹${saleData.grandTotal} (${saleData.paymentDetails.method})`
    );

    notifyListeners();
    return { success: true, invoice: newInvoice, message: `Bill ${billNumber} generated successfully!` };
  },

  // Sales Returns
  getSalesReturns: (): SalesReturn[] => getFromStorage(STORAGE_KEYS.SALES_RETURNS, []),
  processSalesReturn: (
    returnData: {
      originalBillNumber: string;
      invoiceId: string;
      customerName: string;
      customerPhone?: string;
      items: SalesReturnItem[];
      totalRefundAmount: number;
      refundMethod: 'CASH' | 'CREDIT_NOTE' | 'UPI';
      notes?: string;
    },
    user: User
  ): { success: boolean; returnNumber: string; message: string } => {
    const products = db.getProducts();
    const stockLedger = db.getStockLedger();
    const returns = db.getSalesReturns();
    const invoices = db.getInvoices();
    const nowIso = new Date().toISOString();
    const returnNumber = `RET-2026-${String(returns.length + 1).padStart(4, '0')}`;

    // Restore stock for resalable items
    let restoredCount = 0;
    for (const item of returnData.items) {
      if (item.condition === 'RESALABLE' && item.returnedQty > 0) {
        const pIndex = products.findIndex((p) => p.id === item.productId);
        if (pIndex >= 0) {
          const prod = products[pIndex];
          const oldStock = prod.currentStock;
          const newStock = oldStock + item.returnedQty;
          prod.currentStock = newStock;
          prod.updatedAt = nowIso;

          // Ledger entry
          stockLedger.push({
            id: `ledg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            timestamp: nowIso,
            productId: prod.id,
            productName: prod.name,
            barcode: prod.barcode,
            movementType: 'SALES_RETURN',
            referenceNo: returnNumber,
            qtyChanged: item.returnedQty,
            openingStock: oldStock,
            closingStock: newStock,
            unitRate: item.unitPrice,
            performedBy: user.fullName,
            counter: user.counterName,
            notes: `Sales Return on Bill ${returnData.originalBillNumber}: ${item.reason} (Condition: ${item.condition})`,
          });
          restoredCount++;
        }
      }
    }

    // Update original invoice status
    const inv = invoices.find((i) => i.id === returnData.invoiceId);
    if (inv) {
      inv.status = 'RETURNED';
      saveToStorage(STORAGE_KEYS.INVOICES, invoices);
    }

    const newReturn: SalesReturn = {
      id: `ret-${Date.now()}`,
      returnNumber,
      originalBillNumber: returnData.originalBillNumber,
      invoiceId: returnData.invoiceId,
      customerName: returnData.customerName,
      customerPhone: returnData.customerPhone,
      items: returnData.items,
      totalRefundAmount: returnData.totalRefundAmount,
      refundMethod: returnData.refundMethod,
      processedBy: user.fullName,
      processedAt: nowIso,
      restoredToStock: restoredCount > 0,
      notes: returnData.notes,
    };

    returns.push(newReturn);
    saveToStorage(STORAGE_KEYS.PRODUCTS, products);
    saveToStorage(STORAGE_KEYS.STOCK_LEDGER, stockLedger);
    saveToStorage(STORAGE_KEYS.SALES_RETURNS, returns);

    db.addAuditLog(
      user.id,
      user.fullName,
      user.role,
      'SALES_RETURN',
      'Returns Counter',
      `Processed Return ${returnNumber} against Bill ${returnData.originalBillNumber} (Refund: ₹${returnData.totalRefundAmount})`
    );

    notifyListeners();
    return { success: true, returnNumber, message: `Return ${returnNumber} processed. Refund: ₹${returnData.totalRefundAmount}` };
  },

  // Manual Stock Adjustment
  adjustStock: (
    productId: string,
    adjustedQty: number,
    movementType: 'DAMAGE_ADJUSTMENT' | 'AUDIT_CORRECTION',
    reason: string,
    user: User
  ): boolean => {
    const products = db.getProducts();
    const stockLedger = db.getStockLedger();
    const pIndex = products.findIndex((p) => p.id === productId);
    if (pIndex < 0) return false;

    const prod = products[pIndex];
    const oldStock = prod.currentStock;
    const newStock = oldStock + adjustedQty;
    const nowIso = new Date().toISOString();

    prod.currentStock = newStock;
    prod.updatedAt = nowIso;

    stockLedger.push({
      id: `ledg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: nowIso,
      productId: prod.id,
      productName: prod.name,
      barcode: prod.barcode,
      movementType,
      referenceNo: `ADJ-${Date.now().toString().slice(-4)}`,
      qtyChanged: adjustedQty,
      openingStock: oldStock,
      closingStock: newStock,
      unitRate: prod.purchaseRate,
      performedBy: user.fullName,
      counter: user.counterName,
      notes: `Manual adjustment: ${reason}`,
    });

    saveToStorage(STORAGE_KEYS.PRODUCTS, products);
    saveToStorage(STORAGE_KEYS.STOCK_LEDGER, stockLedger);

    db.addAuditLog(
      user.id,
      user.fullName,
      user.role,
      'STOCK_ADJUSTMENT',
      'Inventory',
      `Stock adjusted for ${prod.name}: ${adjustedQty > 0 ? '+' : ''}${adjustedQty} (New Stock: ${newStock}). Reason: ${reason}`
    );

    notifyListeners();
    return true;
  },

  // Stock Ledger
  getStockLedger: (): StockLedgerEntry[] => getFromStorage(STORAGE_KEYS.STOCK_LEDGER, []),

  // Held Bills
  getHeldCarts: (): HeldCart[] => getFromStorage(STORAGE_KEYS.HELD_CARTS, []),
  holdCart: (customerName: string, items: CartItem[], user: User, phone?: string): HeldCart => {
    const held = db.getHeldCarts();
    const tokenNumber = `T-${String(held.length + 1).padStart(3, '0')}`;
    const newHold: HeldCart = {
      id: `hold-${Date.now()}`,
      tokenNumber,
      customerName: customerName.trim() || `Customer ${tokenNumber}`,
      customerPhone: phone,
      items,
      heldAt: new Date().toISOString(),
      heldBy: user.fullName,
    };
    held.push(newHold);
    saveToStorage(STORAGE_KEYS.HELD_CARTS, held);
    notifyListeners();
    return newHold;
  },
  removeHeldCart: (holdId: string): void => {
    const held = db.getHeldCarts().filter((h) => h.id !== holdId);
    saveToStorage(STORAGE_KEYS.HELD_CARTS, held);
    notifyListeners();
  },

  // Shifts
  getShifts: (): CashierShift[] => getFromStorage(STORAGE_KEYS.SHIFTS, []),
  getActiveShiftForCashier: (cashierId: string): CashierShift | undefined => {
    return db.getShifts().find((s) => s.cashierId === cashierId && s.status === 'OPEN');
  },
  openShift: (cashierUser: User, openingFloat: number): CashierShift => {
    const shifts = db.getShifts();
    // close any dangling open shift for this user
    shifts.forEach((s) => {
      if (s.cashierId === cashierUser.id && s.status === 'OPEN') {
        s.status = 'CLOSED';
        s.closedAt = new Date().toISOString();
      }
    });

    const newShift: CashierShift = {
      id: `shift-${Date.now()}`,
      cashierId: cashierUser.id,
      cashierName: cashierUser.fullName,
      counterName: cashierUser.counterName,
      openedAt: new Date().toISOString(),
      openingFloat: openingFloat || 0,
      totalCashSales: 0,
      totalUpiSales: 0,
      totalCardSales: 0,
      totalBillsCount: 0,
      status: 'OPEN',
    };

    shifts.push(newShift);
    saveToStorage(STORAGE_KEYS.SHIFTS, shifts);
    db.addAuditLog(cashierUser.id, cashierUser.fullName, cashierUser.role, 'SHIFT_OPEN', 'POS Cash Management', `Shift opened with float ₹${openingFloat}`);
    notifyListeners();
    return newShift;
  },
  closeShift: (
    shiftId: string,
    declaredCash: number,
    notes: string,
    user: User
  ): CashierShift | null => {
    const shifts = db.getShifts();
    const s = shifts.find((shift) => shift.id === shiftId);
    if (!s) return null;

    const expectedCash = (s.openingFloat || 0) + (s.totalCashSales || 0);
    const cashDifference = declaredCash - expectedCash;

    s.closedAt = new Date().toISOString();
    s.closingDeclaredCash = declaredCash;
    s.expectedCash = expectedCash;
    s.cashDifference = cashDifference;
    s.status = 'CLOSED';
    s.notes = notes;

    saveToStorage(STORAGE_KEYS.SHIFTS, shifts);
    db.addAuditLog(
      user.id,
      user.fullName,
      user.role,
      'SHIFT_CLOSE',
      'POS Cash Management',
      `Shift closed. Float: ₹${s.openingFloat}, Cash Sales: ₹${s.totalCashSales}, Declared: ₹${declaredCash}, Difference: ₹${cashDifference}`
    );
    notifyListeners();
    return s;
  },

  // Audit Logs
  getAuditLogs: (): AuditLog[] => getFromStorage(STORAGE_KEYS.AUDIT_LOGS, []),
  addAuditLog: (
    userId: string,
    userName: string,
    role: User['role'],
    action: string,
    module: string,
    details: string
  ): void => {
    const logs = db.getAuditLogs();
    logs.unshift({
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      userId,
      userName,
      role,
      action,
      module,
      details,
    });
    // Keep max 500 audit logs to prevent storage bloating
    if (logs.length > 500) logs.length = 500;
    saveToStorage(STORAGE_KEYS.AUDIT_LOGS, logs);
  },

  // Settings
  getSettings: (): StoreSettings => getFromStorage(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS),
  saveSettings: (settings: StoreSettings, user?: User): void => {
    saveToStorage(STORAGE_KEYS.SETTINGS, settings);
    if (user) {
      db.addAuditLog(user.id, user.fullName, user.role, 'SETTINGS_UPDATE', 'System Configuration', 'Store and printer settings updated');
    }
    notifyListeners();
  },

  // Database Backup / Reset
  exportDatabaseJSON: (): string => {
    const fullState = {
      users: db.getUsers(),
      categories: db.getCategories(),
      products: db.getProducts(),
      suppliers: db.getSuppliers(),
      customers: db.getCustomers(),
      grns: db.getGRNs(),
      invoices: db.getInvoices(),
      stockLedger: db.getStockLedger(),
      shifts: db.getShifts(),
      salesReturns: db.getSalesReturns(),
      auditLogs: db.getAuditLogs(),
      settings: db.getSettings(),
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
    };
    return JSON.stringify(fullState, null, 2);
  },
  resetDatabaseToDefault: (user?: User): void => {
    localStorage.clear();
    initializeDB();
    if (user) {
      db.addAuditLog(user.id, user.fullName, user.role, 'DATABASE_RESET', 'System Maintenance', 'Database restored to initial pristine state');
    }
    notifyListeners();
  },
};
