export type UserRole = 'admin' | 'cashier' | 'grn';

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  counterName: string;
  pin: string;
  active: boolean;
  avatar?: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  code: string;
  taxRate: number; // default GST %
}

export interface Product {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  categoryId: string;
  categoryName: string;
  brand: string;
  uom: 'PCS' | 'KG' | 'GM' | 'LITER' | 'ML' | 'PACK' | 'BOTTLE';
  hsnCode: string;
  purchaseRate: number; // Inward cost price (₹)
  mrp: number; // Maximum Retail Price (₹)
  sellingPrice: number; // Counter selling price (₹)
  taxRate: number; // 0, 5, 12, 18, 28 %
  currentStock: number;
  minStockAlert: number;
  maxStockLevel: number;
  batchNumber: string;
  expiryDate: string; // YYYY-MM-DD
  packSize?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  companyName: string;
  gstin: string;
  phone: string;
  email: string;
  address: string;
  paymentTerms: string;
  outstandingBalance: number;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  loyaltyPoints: number;
  totalSpent: number;
  customerType: 'Regular' | 'Wholesale' | 'Staff';
  createdAt: string;
}

export interface GRNItem {
  id: string;
  productId: string;
  productName: string;
  barcode: string;
  batchNumber: string;
  expiryDate: string;
  orderedQty: number;
  receivedQty: number;
  damagedQty: number; // Stock is receivedQty - damagedQty
  purchaseRate: number;
  mrp: number;
  sellingPrice: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
  notes?: string;
}

export type GRNStatus = 'DRAFT' | 'VERIFIED' | 'CONFIRMED' | 'CANCELLED';

export interface GRN {
  id: string;
  grnNumber: string; // e.g. GRN-2026-0042
  supplierId: string;
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: string;
  receivedDate: string;
  items: GRNItem[];
  subTotal: number;
  totalTax: number;
  roundOff: number;
  grandTotal: number;
  status: GRNStatus;
  createdBy: string;
  createdByName: string;
  counterName: string;
  confirmedAt?: string;
  confirmedBy?: string;
  remarks?: string;
  createdAt: string;
}

export interface CartItem {
  productId: string;
  productName: string;
  barcode: string;
  batchNumber: string;
  expiryDate: string;
  hsnCode: string;
  mrp: number;
  unitPrice: number;
  quantity: number;
  discountPerUnit: number;
  taxRate: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  totalAmount: number;
  availableStock: number;
}

export type PaymentMethod = 'CASH' | 'UPI' | 'CARD' | 'SPLIT';

export interface PaymentDetails {
  method: PaymentMethod;
  cashAmount: number;
  upiAmount: number;
  cardAmount: number;
  upiRef?: string;
  cardLast4?: string;
  tenderedAmount: number;
  changeAmount: number;
}

export type InvoiceStatus = 'COMPLETED' | 'CANCELLED' | 'RETURNED' | 'PARTIALLY_RETURNED';

export interface SaleInvoice {
  id: string;
  billNumber: string; // e.g. UM-POS-2026-1049
  shiftId: string;
  cashierId: string;
  cashierName: string;
  counterNumber: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  items: CartItem[];
  subTotal: number;
  totalSavings: number; // MRP - Final Price
  billDiscount: number;
  cgstTotal: number;
  sgstTotal: number;
  totalTax: number;
  roundOff: number;
  grandTotal: number;
  paymentDetails: PaymentDetails;
  loyaltyPointsEarned: number;
  loyaltyPointsRedeemed: number;
  status: InvoiceStatus;
  createdAt: string;
  printCount: number;
}

export type StockMovementType =
  | 'INWARD_GRN'
  | 'POS_SALE'
  | 'SALES_RETURN'
  | 'PURCHASE_RETURN'
  | 'DAMAGE_ADJUSTMENT'
  | 'AUDIT_CORRECTION';

export interface StockLedgerEntry {
  id: string;
  timestamp: string;
  productId: string;
  productName: string;
  barcode: string;
  movementType: StockMovementType;
  referenceNo: string;
  qtyChanged: number; // positive or negative
  openingStock: number;
  closingStock: number;
  unitRate: number;
  performedBy: string;
  counter: string;
  notes: string;
}

export interface CashierShift {
  id: string;
  cashierId: string;
  cashierName: string;
  counterName: string;
  openedAt: string;
  closedAt?: string;
  openingFloat: number;
  totalCashSales: number;
  totalUpiSales: number;
  totalCardSales: number;
  totalBillsCount: number;
  closingDeclaredCash?: number;
  expectedCash?: number;
  cashDifference?: number;
  status: 'OPEN' | 'CLOSED';
  notes?: string;
}

export interface HeldCart {
  id: string;
  tokenNumber: string;
  customerName: string;
  customerPhone?: string;
  items: CartItem[];
  heldAt: string;
  heldBy: string;
}

export interface SalesReturnItem {
  productId: string;
  productName: string;
  barcode: string;
  returnedQty: number;
  unitPrice: number;
  refundAmount: number;
  condition: 'RESALABLE' | 'DAMAGED';
  reason: string;
}

export interface SalesReturn {
  id: string;
  returnNumber: string;
  originalBillNumber: string;
  invoiceId: string;
  customerName: string;
  customerPhone?: string;
  items: SalesReturnItem[];
  totalRefundAmount: number;
  refundMethod: 'CASH' | 'CREDIT_NOTE' | 'UPI';
  processedBy: string;
  processedAt: string;
  restoredToStock: boolean;
  notes?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  role: UserRole;
  action: string;
  module: string;
  details: string;
}

export interface StoreSettings {
  storeName: string;
  branchName: string;
  tagline: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  gstin: string;
  fssai: string;
  receiptFooter: string;
  printerPaperWidth: '80mm' | '58mm';
  autoPrintReceipt: boolean;
  soundAlerts: boolean;
  enableHoldBills: boolean;
  currencySymbol: string;
}
