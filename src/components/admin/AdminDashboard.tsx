import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Package,
  Layers,
  Building2,
  Users,
  Receipt,
  BarChart3,
  Shield,
  Settings,
  Plus,
  Search,
  Filter,
  Download,
  Printer,
  Sliders,
  AlertTriangle,
  RotateCcw,
  CheckCircle,
  Clock,
  TrendingUp,
  CreditCard,
  DollarSign,
  FileSpreadsheet,
  RefreshCw,
  QrCode,
  Tag,
  Trash2,
} from 'lucide-react';
import {
  AuditLog,
  Category,
  Customer,
  Product,
  SaleInvoice,
  SalesReturn,
  StockLedgerEntry,
  StoreSettings,
  Supplier,
  User,
} from '../../types';
import { db, subscribeToDB } from '../../services/db';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { downloadCSV } from '../../utils/exportCsv';
import { ProductMasterModal } from './ProductMasterModal';
import { BarcodePrintModal } from './BarcodePrintModal';
import { StockAdjustmentModal } from './StockAdjustmentModal';
import { ThermalReceiptModal } from '../pos/ThermalReceiptModal';
import { AcceptanceTestsView } from './AcceptanceTestsView';
import { ThermalPrinterTestModal } from './ThermalPrinterTestModal';

interface AdminDashboardProps {
  currentUser: User;
}

type AdminTab =
  | 'overview'
  | 'products'
  | 'ledger'
  | 'suppliers'
  | 'customers'
  | 'invoices'
  | 'reports'
  | 'users'
  | 'tests'
  | 'settings';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // DB Collections
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<SaleInvoice[]>([]);
  const [salesReturns, setSalesReturns] = useState<SalesReturn[]>([]);
  const [stockLedger, setStockLedger] = useState<StockLedgerEntry[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(db.getSettings());

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Modals
  const [selectedProductForEdit, setSelectedProductForEdit] = useState<Product | undefined>(undefined);
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProductForBarcode, setSelectedProductForBarcode] = useState<Product | null>(null);
  const [selectedProductForAdjust, setSelectedProductForAdjust] = useState<Product | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<SaleInvoice | null>(null);

  // Supplier / Customer / User creation mini-forms
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showPrinterTestModal, setShowPrinterTestModal] = useState(false);

  const loadData = () => {
    setProducts(db.getProducts());
    setCategories(db.getCategories());
    setSuppliers(db.getSuppliers());
    setCustomers(db.getCustomers());
    setInvoices(db.getInvoices());
    setSalesReturns(db.getSalesReturns());
    setStockLedger(db.getStockLedger());
    setUsers(db.getUsers());
    setAuditLogs(db.getAuditLogs());
    setSettings(db.getSettings());
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeToDB(loadData);
    return () => unsub();
  }, []);

  // Aggregations for Executive Overview
  const totalSalesRevenue = invoices.reduce((s, i) => s + (i.status !== 'CANCELLED' ? i.grandTotal : 0), 0);
  const totalInwardValue = db.getGRNs().filter((g) => g.status === 'CONFIRMED').reduce((s, g) => s + g.grandTotal, 0);

  // Profit Calculation: Selling price - Cost price of items sold
  const totalCOGS = invoices.reduce((sum, inv) => {
    return (
      sum +
      inv.items.reduce((itemSum, item) => {
        const prod = products.find((p) => p.id === item.productId);
        const cost = prod ? prod.purchaseRate : item.unitPrice * 0.8;
        return itemSum + cost * item.quantity;
      }, 0)
    );
  }, 0);
  const estimatedProfit = Math.max(0, totalSalesRevenue - totalCOGS);
  const marginPercent = totalSalesRevenue > 0 ? ((estimatedProfit / totalSalesRevenue) * 100).toFixed(1) : '0';

  const lowStockProducts = products.filter((p) => p.currentStock <= p.minStockAlert);
  const nearExpiryProducts = products.filter((p) => {
    if (!p.expiryDate) return false;
    const diffDays = (new Date(p.expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24);
    return diffDays > 0 && diffDays <= 45;
  });

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const matchCat = categoryFilter === 'ALL' || p.categoryId === categoryFilter;
    const matchSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.includes(searchQuery) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchQuery.toLowerCase());
    const matchLow = !lowStockOnly || p.currentStock <= p.minStockAlert;
    return matchCat && matchSearch && matchLow;
  });

  // Filtered Stock Ledger
  const filteredLedger = stockLedger
    .slice()
    .reverse()
    .filter((l) => {
      return (
        l.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.referenceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.barcode.includes(searchQuery)
      );
    });

  // Export functions
  const exportProductsCSV = () => {
    const headers = ['SKU', 'Barcode', 'Product Name', 'Category', 'Brand', 'Cost (INR)', 'MRP (INR)', 'Sell Price (INR)', 'GST %', 'Stock', 'Min Alert', 'Expiry'];
    const rows = filteredProducts.map((p) => [
      p.sku,
      p.barcode,
      p.name,
      p.categoryName,
      p.brand,
      p.purchaseRate,
      p.mrp,
      p.sellingPrice,
      p.taxRate,
      p.currentStock,
      p.minStockAlert,
      p.expiryDate,
    ]);
    downloadCSV('UrbanMart_Product_Master', headers, rows);
  };

  const exportLedgerCSV = () => {
    const headers = ['Timestamp', 'Type', 'Ref No', 'Product', 'Barcode', 'Delta Qty', 'Opening', 'Closing', 'Rate', 'User', 'Counter', 'Notes'];
    const rows = filteredLedger.map((l) => [
      formatDateTime(l.timestamp),
      l.movementType,
      l.referenceNo,
      l.productName,
      l.barcode,
      l.qtyChanged,
      l.openingStock,
      l.closingStock,
      l.unitRate,
      l.performedBy,
      l.counter,
      l.notes,
    ]);
    downloadCSV('UrbanMart_Stock_Ledger', headers, rows);
  };

  const exportGSTR1Report = () => {
    const headers = ['GST Slab', 'Gross Sales (INR)', 'Taxable Amount (INR)', 'CGST (INR)', 'SGST (INR)', 'Total Tax (INR)'];
    const slabs = [0, 5, 12, 18, 28];
    const rows = slabs.map((rate) => {
      let taxable = 0;
      let cgst = 0;
      let sgst = 0;
      let gross = 0;

      invoices.forEach((inv) => {
        inv.items.forEach((item) => {
          if (item.taxRate === rate) {
            taxable += item.taxableAmount;
            cgst += item.cgstAmount;
            sgst += item.sgstAmount;
            gross += item.totalAmount;
          }
        });
      });

      return [`${rate}% GST`, gross.toFixed(2), taxable.toFixed(2), cgst.toFixed(2), sgst.toFixed(2), (cgst + sgst).toFixed(2)];
    });
    downloadCSV('UrbanMart_GSTR1_Tax_Summary', headers, rows);
  };

  return (
    <div className="flex h-[calc(100vh-60px)] bg-slate-100 overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shrink-0">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block">
              Control Center
            </span>
            <h2 className="font-black text-sm text-white">Owner / Main Admin</h2>
          </div>
          <Shield className="w-5 h-5 text-blue-400" />
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'hover:bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Store Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
              activeTab === 'products'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'hover:bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Product Master & Barcodes</span>
            {lowStockProducts.length > 0 && (
              <span className="ml-auto bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {lowStockProducts.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ledger')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
              activeTab === 'ledger'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'hover:bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Live Stock Ledger</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('suppliers')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
              activeTab === 'suppliers'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'hover:bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Supplier Management</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('customers')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
              activeTab === 'customers'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'hover:bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Customer CRM & Loyalty</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('invoices')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
              activeTab === 'invoices'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'hover:bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Bills & Returns</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
              activeTab === 'reports'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'hover:bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Reports & GST Analytics</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
              activeTab === 'users'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'hover:bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Users & Audit Trail</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tests')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
              activeTab === 'tests'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'hover:bg-slate-800 text-emerald-400 hover:text-white'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            <span>Go-Live & चाचण्या</span>
            <span className="ml-auto bg-emerald-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              7/7
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
              activeTab === 'settings'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'hover:bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Store & Printer Setup</span>
          </button>
        </nav>

        {/* Live System Footnote */}
        <div className="p-3 bg-slate-950/60 border-t border-slate-800 text-[11px] text-slate-400">
          <div className="flex items-center justify-between">
            <span>Branch</span>
            <span className="font-bold text-white">Ghansoli Hub</span>
          </div>
          <div className="flex items-center justify-between mt-1 text-[10px]">
            <span>DB Storage</span>
            <span className="text-emerald-400 font-mono">Synchronized</span>
          </div>
        </div>
      </aside>

      {/* Main Tab Content */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* ================= 1. STORE DASHBOARD OVERVIEW ================= */}
        {activeTab === 'overview' && (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  Supermarket Executive Dashboard
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time sales revenue, inventory valuation, active cashier counters and procurement status.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-3 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 shadow-2xs">
                  Financial Year: 2026-27
                </span>
              </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Total POS Gross Sales
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    ₹
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 mt-2">
                  {formatCurrency(totalSalesRevenue)}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Across {invoices.length} retail invoices generated
                </p>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Estimated Net Margin
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-blue-600 mt-2">
                  {formatCurrency(estimatedProfit)}
                </div>
                <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                  ~{marginPercent}% average gross profit margin
                </p>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Total GRN Inward Value
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                    <Package className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-purple-600 mt-2">
                  {formatCurrency(totalInwardValue)}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Stock received from suppliers into depot
                </p>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Inventory SKU Count
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                    <Tag className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 mt-2">
                  {products.length} Active SKUs
                </div>
                <p className="text-[11px] text-rose-600 font-bold mt-1">
                  {lowStockProducts.length} items below minimum safety threshold
                </p>
              </div>
            </div>

            {/* Low Stock & Expiry Critical Alerts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-rose-600 font-bold text-xs uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Low Stock Reorder Alerts ({lowStockProducts.length})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('products');
                      setLowStockOnly(true);
                    }}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    View All
                  </button>
                </div>
                <div className="divide-y divide-slate-100 mt-2 max-h-52 overflow-y-auto">
                  {lowStockProducts.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center">All SKUs healthy above safety threshold.</p>
                  ) : (
                    lowStockProducts.map((p) => (
                      <div key={p.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-slate-900">{p.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {p.barcode} • {p.brand}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                            Stock: {p.currentStock} / Min: {p.minStockAlert}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-amber-600 font-bold text-xs uppercase tracking-wider">
                    <Clock className="w-4 h-4" />
                    <span>Near Expiry Shelf Radar ({nearExpiryProducts.length})</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Within 45 days</span>
                </div>
                <div className="divide-y divide-slate-100 mt-2 max-h-52 overflow-y-auto">
                  {nearExpiryProducts.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center">No batches near expiration.</p>
                  ) : (
                    nearExpiryProducts.map((p) => (
                      <div key={p.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-slate-900">{p.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            Batch: {p.batchNumber} • Stock: {p.currentStock}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 font-mono">
                            Expires: {p.expiryDate}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Live Counter Shift Monitoring */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wide mb-3">
                Live Register & Counter Operations Status
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {users.map((u) => {
                  const shift = db.getActiveShiftForCashier(u.id);

                  return (
                    <div
                      key={u.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-bold text-slate-900 text-sm">{u.fullName}</span>
                          <p className="text-slate-500 text-[11px]">{u.counterName}</p>
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700 mt-1 uppercase">
                            Role: {u.role}
                          </span>
                        </div>
                        <span
                          className={`w-3 h-3 rounded-full ${
                            shift ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                          }`}
                        ></span>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center text-[11px]">
                        <span className="text-slate-600">Shift Status:</span>
                        <span className="font-bold text-slate-900">
                          {shift ? `OPEN (${shift.totalBillsCount} Bills)` : 'Closed / Idle'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================= 2. PRODUCT MASTER & BARCODES ================= */}
        {activeTab === 'products' && (
          <div className="p-6 space-y-4 flex-1 flex flex-col">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  Product & Barcode Master Catalog
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage inventory SKUs, barcodes, HSN codes, cost rates, MRP, selling price, and print shelf tags.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={exportProductsCSV}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Export CSV
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedProductForEdit(undefined);
                    setShowProductModal(true);
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add New Product SKU
                </button>
              </div>
            </div>

            {/* Filter toolbar */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
              <div className="relative flex-1 max-w-md w-full">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Product Name, Barcode, SKU, Brand..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-medium"
                >
                  <option value="ALL">All Categories ({products.length})</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <label className="flex items-center gap-1.5 cursor-pointer font-bold text-rose-700">
                  <input
                    type="checkbox"
                    checked={lowStockOnly}
                    onChange={(e) => setLowStockOnly(e.target.checked)}
                    className="w-4 h-4 text-rose-600 rounded"
                  />
                  <span>Low Stock Only</span>
                </label>
              </div>
            </div>

            {/* Product Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex-1 overflow-hidden flex flex-col">
              <div className="overflow-y-auto flex-1">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-900 text-slate-200 font-bold uppercase sticky top-0">
                    <tr>
                      <th className="py-3 px-3">SKU & Barcode</th>
                      <th className="py-3 px-3">Product Name</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3 text-right">Cost (₹)</th>
                      <th className="py-3 px-3 text-right">MRP (₹)</th>
                      <th className="py-3 px-3 text-right text-blue-400">Sell Price (₹)</th>
                      <th className="py-3 px-3 text-center">GST %</th>
                      <th className="py-3 px-3 text-center">Stock</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono">
                          <span className="font-bold text-slate-800">{p.sku}</span>
                          <span className="block text-[10px] text-slate-500">{p.barcode}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <p className="font-bold text-slate-900">{p.name}</p>
                          <p className="text-[10px] text-slate-500 font-medium">
                            {p.brand} • {p.packSize || p.uom}
                          </p>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{p.categoryName}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                          ₹{p.purchaseRate.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-500 line-through">
                          ₹{p.mrp.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-700 text-sm">
                          ₹{p.sellingPrice.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">{p.taxRate}%</td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full font-bold text-xs ${
                              p.currentStock <= p.minStockAlert
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {p.currentStock} {p.uom}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedProductForBarcode(p)}
                              className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg title='Print Shelf Label'"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedProductForAdjust(p)}
                              className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-slate-100 rounded-lg title='Stock Audit Adjustment'"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedProductForEdit(p);
                                setShowProductModal(true);
                              }}
                              className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                            >
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= 3. REAL-TIME STOCK LEDGER AUDIT TRAIL ================= */}
        {activeTab === 'ledger' && (
          <div className="p-6 space-y-4 flex-1 flex flex-col">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  Real-Time Stock Movement Ledger
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete immutable audit trail: Opening + Inward GRN - POS Sale + Return ± Adjustment = Closing.
                </p>
              </div>

              <button
                type="button"
                onClick={exportLedgerCSV}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" /> Export Ledger CSV
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex-1 overflow-hidden flex flex-col">
              <div className="overflow-y-auto flex-1">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-900 text-slate-200 font-bold uppercase sticky top-0">
                    <tr>
                      <th className="py-3 px-3">Date & Time</th>
                      <th className="py-3 px-3">Movement Type</th>
                      <th className="py-3 px-3">Reference No</th>
                      <th className="py-3 px-3">Product Name</th>
                      <th className="py-3 px-3 text-center">Opening</th>
                      <th className="py-3 px-3 text-center">Change</th>
                      <th className="py-3 px-3 text-center font-bold text-blue-400">Closing</th>
                      <th className="py-3 px-3">Performed By</th>
                      <th className="py-3 px-3">Notes & Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredLedger.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-400">
                          No stock movement ledger records found.
                        </td>
                      </tr>
                    ) : (
                      filteredLedger.map((l) => (
                        <tr key={l.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                            {formatDateTime(l.timestamp)}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                l.movementType === 'INWARD_GRN'
                                  ? 'bg-purple-100 text-purple-800'
                                  : l.movementType === 'POS_SALE'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : l.movementType === 'SALES_RETURN'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {l.movementType}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                            {l.referenceNo}
                          </td>
                          <td className="py-2.5 px-3">
                            <p className="font-bold text-slate-900">{l.productName}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{l.barcode}</p>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                            {l.openingStock}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold">
                            <span
                              className={
                                l.qtyChanged > 0
                                  ? 'text-emerald-600'
                                  : l.qtyChanged < 0
                                  ? 'text-rose-600'
                                  : 'text-slate-600'
                              }
                            >
                              {l.qtyChanged > 0 ? `+${l.qtyChanged}` : l.qtyChanged}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-black text-slate-900 text-sm">
                            {l.closingStock}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">
                            <div>{l.performedBy}</div>
                            <div className="text-[10px] text-slate-400">{l.counter}</div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 text-[11px] max-w-xs truncate">
                            {l.notes}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= 4. SUPPLIER MANAGEMENT ================= */}
        {activeTab === 'suppliers' && (
          <div className="p-6 space-y-4 flex-1 flex flex-col">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  Supplier Directory & AP Ledgers
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Vendor contact details, GSTIN compliance, payment terms and outstanding credit payables.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSupplierModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Vendor / Supplier
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {suppliers.map((sup) => (
                <div
                  key={sup.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <h3 className="font-bold text-sm text-slate-900">{sup.companyName}</h3>
                      <Building2 className="w-5 h-5 text-slate-400" />
                    </div>
                    <p className="text-xs text-slate-600 mt-1 font-medium">Rep: {sup.name}</p>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">GSTIN: {sup.gstin}</p>
                    <p className="text-xs text-slate-500 mt-1">{sup.phone} • {sup.email}</p>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{sup.address}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Payment Terms</span>
                      <span className="font-semibold text-slate-700">{sup.paymentTerms}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 block text-[10px]">Outstanding Balance</span>
                      <span className="font-bold text-rose-700 text-sm">
                        {formatCurrency(sup.outstandingBalance)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= 5. CUSTOMER CRM & LOYALTY ================= */}
        {activeTab === 'customers' && (
          <div className="p-6 space-y-4 flex-1 flex flex-col">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  Customer CRM & Loyalty Points
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Frequent shopper profiles, reward point balances (1 pt per ₹100 spent), and lifetime revenue.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomerModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Customer
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex-1 overflow-hidden flex flex-col">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-900 text-slate-200 font-bold uppercase">
                  <tr>
                    <th className="py-3 px-4">Customer Name</th>
                    <th className="py-3 px-4">Mobile Number</th>
                    <th className="py-3 px-4">Customer Type</th>
                    <th className="py-3 px-4 text-center">Loyalty Points</th>
                    <th className="py-3 px-4 text-right">Lifetime Spend</th>
                    <th className="py-3 px-4">Member Since</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900">{c.name}</td>
                      <td className="py-3 px-4 font-mono text-slate-700">{c.phone}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                          {c.customerType}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-extrabold text-amber-700 font-mono text-sm">
                          ★ {c.loyaltyPoints} pts
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono text-sm">
                        {formatCurrency(c.totalSpent)}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{formatDateTime(c.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= 6. INVOICES & RETURNS ================= */}
        {activeTab === 'invoices' && (
          <div className="p-6 space-y-4 flex-1 flex flex-col">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  Retail Sales Invoices & Customer Returns
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete record of POS bills, tender details, and processed sales return debit notes.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex-1 overflow-hidden flex flex-col">
              <div className="overflow-y-auto flex-1">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-900 text-slate-200 font-bold uppercase sticky top-0">
                    <tr>
                      <th className="py-3 px-4">Bill No</th>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Cashier</th>
                      <th className="py-3 px-4 text-center">Payment Mode</th>
                      <th className="py-3 px-4 text-right">Bill Total</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Reprint</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono font-bold text-blue-600">{inv.billNumber}</td>
                        <td className="py-3 px-4 text-slate-500">{formatDateTime(inv.createdAt)}</td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900">{inv.customerName}</p>
                          {inv.customerPhone && <p className="text-[10px] text-slate-500">{inv.customerPhone}</p>}
                        </td>
                        <td className="py-3 px-4 text-slate-700">{inv.cashierName}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-bold text-xs uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                            {inv.paymentDetails.method}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-black text-slate-900 text-sm font-mono">
                          {formatCurrency(inv.grandTotal)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              inv.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setViewingInvoice(inv)}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" /> Receipt
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= 7. REPORTS & GST ANALYTICS ================= */}
        {activeTab === 'reports' && (
          <div className="p-6 space-y-6 flex-1 flex flex-col">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  Financial, Tax & Inventory Reports
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Monthly GST-R1 compliance breakdown, Stock Valuation (Cost vs Retail), and Gross Profit metrics.
                </p>
              </div>

              <button
                type="button"
                onClick={exportGSTR1Report}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" /> Download GST-R1 CSV
              </button>
            </div>

            {/* GST Summary Table */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wide mb-3">
                GST Tax Slab Breakdown (GSTR-1 Ready)
              </h3>
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold">
                  <tr>
                    <th className="py-2.5 px-3">Tax Slab</th>
                    <th className="py-2.5 px-3 text-right">Taxable Turnover (₹)</th>
                    <th className="py-2.5 px-3 text-right">CGST (₹)</th>
                    <th className="py-2.5 px-3 text-right">SGST (₹)</th>
                    <th className="py-2.5 px-3 text-right font-bold text-slate-900">Total Tax Liability (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {[0, 5, 12, 18, 28].map((rate) => {
                    let taxable = 0;
                    let cgst = 0;
                    let sgst = 0;

                    invoices.forEach((inv) => {
                      inv.items.forEach((item) => {
                        if (item.taxRate === rate) {
                          taxable += item.taxableAmount;
                          cgst += item.cgstAmount;
                          sgst += item.sgstAmount;
                        }
                      });
                    });

                    return (
                      <tr key={rate} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold">{rate}% GST Slab</td>
                        <td className="py-2.5 px-3 text-right font-mono">₹{taxable.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right font-mono">₹{cgst.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right font-mono">₹{sgst.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-700">
                          ₹{(cgst + sgst).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Stock Valuation Snapshot */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase">Total Inventory (Cost Valuation)</span>
                <p className="text-2xl font-black text-slate-900 mt-1">
                  {formatCurrency(products.reduce((s, p) => s + p.purchaseRate * p.currentStock, 0))}
                </p>
                <span className="text-[11px] text-slate-500 mt-1 block">At inward purchase price</span>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase">Retail Realizable Value (MRP)</span>
                <p className="text-2xl font-black text-emerald-700 mt-1">
                  {formatCurrency(products.reduce((s, p) => s + p.mrp * p.currentStock, 0))}
                </p>
                <span className="text-[11px] text-slate-500 mt-1 block">Full retail realization</span>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase">Unrealized Gross Margin</span>
                <p className="text-2xl font-black text-blue-700 mt-1">
                  {formatCurrency(
                    products.reduce((s, p) => s + (p.sellingPrice - p.purchaseRate) * p.currentStock, 0)
                  )}
                </p>
                <span className="text-[11px] text-slate-500 mt-1 block">Projected future gross profit</span>
              </div>
            </div>
          </div>
        )}

        {/* ================= 8. USERS & AUDIT TRAIL ================= */}
        {activeTab === 'users' && (
          <div className="p-6 space-y-6 flex-1 flex flex-col">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  User Profiles, Role Permissions & Audit Trail
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Three distinct login profiles with role-based access control and system event logging.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowUserModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Staff User
              </button>
            </div>

            {/* Users List */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-sm text-slate-900">{u.fullName}</h3>
                        <p className="text-xs text-slate-500">Username: <strong className="font-mono">{u.username}</strong></p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          u.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : u.role === 'cashier'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {u.role}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-2 font-medium">{u.counterName}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">PIN / Password: •••••••• ({u.pin})</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-emerald-600 font-bold">Active Account</span>
                    <span className="text-slate-400 text-[10px]">Since {u.createdAt.slice(0, 10)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* System Audit Logs */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex-1 overflow-hidden flex flex-col p-4">
              <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wide mb-3">
                Security & Transaction Audit Logs ({auditLogs.length})
              </h3>
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">User</th>
                      <th className="py-2.5 px-3">Role</th>
                      <th className="py-2.5 px-3">Action</th>
                      <th className="py-2.5 px-3">Module</th>
                      <th className="py-2.5 px-3">Event Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {auditLogs.slice(0, 50).map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">
                          {formatDateTime(log.timestamp)}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-900">{log.userName}</td>
                        <td className="py-2 px-3 uppercase text-[10px] text-slate-500">{log.role}</td>
                        <td className="py-2 px-3 font-mono font-bold text-blue-700">{log.action}</td>
                        <td className="py-2 px-3 text-slate-600">{log.module}</td>
                        <td className="py-2 px-3 text-slate-700">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= 9. STORE & PRINTER SETTINGS ================= */}
        {activeTab === 'settings' && (
          <div className="p-6 space-y-6 max-w-4xl">
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Store Setup & Thermal Printer Configuration
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure store tax identification, address on receipts, thermal roll paper width, and database backups.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 text-xs">
              <h3 className="font-bold text-sm text-slate-900 border-b border-slate-200 pb-2">
                Business & Tax Identity
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Store Legal Name</label>
                  <input
                    type="text"
                    value={settings.storeName}
                    onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Branch Name</label>
                  <input
                    type="text"
                    value={settings.branchName}
                    onChange={(e) => setSettings({ ...settings, branchName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">GSTIN Number</label>
                  <input
                    type="text"
                    value={settings.gstin}
                    onChange={(e) => setSettings({ ...settings, gstin: e.target.value })}
                    className="w-full px-3 py-2 font-mono uppercase font-bold border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">FSSAI License No.</label>
                  <input
                    type="text"
                    value={settings.fssai}
                    onChange={(e) => setSettings({ ...settings, fssai: e.target.value })}
                    className="w-full px-3 py-2 font-mono font-bold border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-bold text-slate-700 uppercase mb-1">Store Physical Address</label>
                  <input
                    type="text"
                    value={settings.address}
                    onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Customer Care Phone</label>
                  <input
                    type="text"
                    value={settings.phone}
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Store Email</label>
                  <input
                    type="email"
                    value={settings.email}
                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <h3 className="font-bold text-sm text-slate-900 border-b border-slate-200 pb-2 pt-4">
                Thermal POS Printer Setup
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Receipt Paper Size</label>
                  <select
                    value={settings.printerPaperWidth}
                    onChange={(e) =>
                      setSettings({ ...settings, printerPaperWidth: e.target.value as '80mm' | '58mm' })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-bold"
                  >
                    <option value="80mm">80mm (Standard Supermarket Thermal Roll)</option>
                    <option value="58mm">58mm (Compact Mobile POS Printer)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Currency Symbol</label>
                  <input
                    type="text"
                    value={settings.currencySymbol}
                    readOnly
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 font-bold"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-bold text-slate-700 uppercase mb-1">Receipt Footer Note</label>
                  <input
                    type="text"
                    value={settings.receiptFooter}
                    onChange={(e) => setSettings({ ...settings, receiptFooter: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-between items-center">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      db.saveSettings(settings, currentUser);
                      alert('Settings updated successfully!');
                    }}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    Save Store Settings
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPrinterTestModal(true)}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-blue-400" />
                    <span>Test Hardware Thermal Printer</span>
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const data = db.exportDatabaseJSON();
                      const blob = new Blob([data], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `UrbanMart_Backup_${Date.now()}.json`;
                      a.click();
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                  >
                    Backup DB (JSON)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Reset database to clean sample data? All manual additions will reset.')) {
                        db.resetDatabaseToDefault(currentUser);
                        loadData();
                        alert('Database reset to defaults.');
                      }
                    }}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl"
                  >
                    Reset Demo DB
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= 10. QA ACCEPTANCE TESTS & GO-LIVE CHECKLIST ================= */}
        {activeTab === 'tests' && <AcceptanceTestsView />}
      </main>

      {/* Product Master Modal (Add / Edit) */}
      {showProductModal && (
        <ProductMasterModal
          product={selectedProductForEdit}
          categories={categories}
          user={currentUser}
          onSuccess={loadData}
          onClose={() => setShowProductModal(false)}
        />
      )}

      {/* Barcode Print Modal */}
      {selectedProductForBarcode && (
        <BarcodePrintModal
          product={selectedProductForBarcode}
          settings={settings}
          onClose={() => setSelectedProductForBarcode(null)}
        />
      )}

      {/* Stock Adjustment Modal */}
      {selectedProductForAdjust && (
        <StockAdjustmentModal
          product={selectedProductForAdjust}
          user={currentUser}
          onSuccess={loadData}
          onClose={() => setSelectedProductForAdjust(null)}
        />
      )}

      {/* Receipt Reprint Modal */}
      {viewingInvoice && (
        <ThermalReceiptModal
          invoice={viewingInvoice}
          settings={settings}
          onClose={() => setViewingInvoice(null)}
        />
      )}

      {/* Add Supplier Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-200 space-y-4 text-xs">
            <h3 className="font-bold text-sm text-slate-900">Add New Supplier / Vendor</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const companyName = (form.elements.namedItem('company') as HTMLInputElement).value;
                const name = (form.elements.namedItem('rep') as HTMLInputElement).value;
                const phone = (form.elements.namedItem('phone') as HTMLInputElement).value;
                const gstin = (form.elements.namedItem('gstin') as HTMLInputElement).value;
                const terms = (form.elements.namedItem('terms') as HTMLInputElement).value;

                db.saveSupplier(
                  {
                    id: `sup-${Date.now()}`,
                    name,
                    companyName,
                    phone,
                    email: 'sales@supplier.com',
                    address: 'APMC Market Vashi',
                    gstin: gstin.toUpperCase(),
                    paymentTerms: terms,
                    outstandingBalance: 0,
                    createdAt: new Date().toISOString(),
                  },
                  currentUser
                );
                setShowSupplierModal(false);
                loadData();
              }}
              className="space-y-3"
            >
              <div>
                <label className="block font-bold mb-1">Company / Depot Name *</label>
                <input name="company" required className="w-full px-3 py-1.5 border rounded-lg" />
              </div>
              <div>
                <label className="block font-bold mb-1">Contact Person Name</label>
                <input name="rep" required className="w-full px-3 py-1.5 border rounded-lg" />
              </div>
              <div>
                <label className="block font-bold mb-1">Phone Number *</label>
                <input name="phone" required className="w-full px-3 py-1.5 border rounded-lg" />
              </div>
              <div>
                <label className="block font-bold mb-1">GSTIN</label>
                <input name="gstin" defaultValue="27AAACG0000A1ZA" className="w-full px-3 py-1.5 border rounded-lg font-mono" />
              </div>
              <div>
                <label className="block font-bold mb-1">Payment Credit Terms</label>
                <input name="terms" defaultValue="15 Days Net Credit" className="w-full px-3 py-1.5 border rounded-lg" />
              </div>
              <div className="flex justify-between pt-2">
                <button type="button" onClick={() => setShowSupplierModal(false)} className="px-4 py-2 font-medium">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white font-bold rounded-xl">Save Supplier</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-200 space-y-4 text-xs">
            <h3 className="font-bold text-sm text-slate-900">Add Customer to Loyalty Program</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const name = (form.elements.namedItem('name') as HTMLInputElement).value;
                const phone = (form.elements.namedItem('phone') as HTMLInputElement).value;
                const type = (form.elements.namedItem('type') as HTMLSelectElement).value as Customer['customerType'];

                db.saveCustomer({
                  id: `cust-${Date.now()}`,
                  name,
                  phone,
                  loyaltyPoints: 50,
                  totalSpent: 0,
                  customerType: type,
                  createdAt: new Date().toISOString(),
                });
                setShowCustomerModal(false);
                loadData();
              }}
              className="space-y-3"
            >
              <div>
                <label className="block font-bold mb-1">Customer Full Name *</label>
                <input name="name" required className="w-full px-3 py-1.5 border rounded-lg" />
              </div>
              <div>
                <label className="block font-bold mb-1">Mobile Number (10 digits) *</label>
                <input name="phone" required className="w-full px-3 py-1.5 border rounded-lg font-mono" />
              </div>
              <div>
                <label className="block font-bold mb-1">Customer Type</label>
                <select name="type" className="w-full px-3 py-1.5 border rounded-lg">
                  <option value="Regular">Regular Shopper</option>
                  <option value="Wholesale">Wholesale Bulk Buyer</option>
                  <option value="Staff">Store Staff</option>
                </select>
              </div>
              <div className="flex justify-between pt-2">
                <button type="button" onClick={() => setShowCustomerModal(false)} className="px-4 py-2 font-medium">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white font-bold rounded-xl">Register Customer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-200 space-y-4 text-xs">
            <h3 className="font-bold text-sm text-slate-900">Create Staff User Profile</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const username = (form.elements.namedItem('username') as HTMLInputElement).value;
                const fullName = (form.elements.namedItem('fullName') as HTMLInputElement).value;
                const role = (form.elements.namedItem('role') as HTMLSelectElement).value as User['role'];
                const counterName = (form.elements.namedItem('counter') as HTMLInputElement).value;
                const pin = (form.elements.namedItem('pin') as HTMLInputElement).value;

                db.saveUser({
                  id: `usr-${Date.now()}`,
                  username: username.toLowerCase(),
                  fullName,
                  role,
                  counterName,
                  pin,
                  active: true,
                  createdAt: new Date().toISOString(),
                });
                setShowUserModal(false);
                loadData();
              }}
              className="space-y-3"
            >
              <div>
                <label className="block font-bold mb-1">Username (Login ID) *</label>
                <input name="username" required className="w-full px-3 py-1.5 border rounded-lg font-mono" />
              </div>
              <div>
                <label className="block font-bold mb-1">Full Name *</label>
                <input name="fullName" required className="w-full px-3 py-1.5 border rounded-lg" />
              </div>
              <div>
                <label className="block font-bold mb-1">System Role *</label>
                <select name="role" className="w-full px-3 py-1.5 border rounded-lg font-bold">
                  <option value="cashier">Billing Cashier (POS Counter)</option>
                  <option value="grn">GRN Operator (Stock Inward Counter)</option>
                  <option value="admin">Main Admin / Owner</option>
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">Counter / Station Name</label>
                <input name="counter" defaultValue="POS Counter 02" className="w-full px-3 py-1.5 border rounded-lg" />
              </div>
              <div>
                <label className="block font-bold mb-1">Login Password / PIN *</label>
                <input name="pin" required defaultValue="pass123" className="w-full px-3 py-1.5 border rounded-lg font-mono" />
              </div>
              <div className="flex justify-between pt-2">
                <button type="button" onClick={() => setShowUserModal(false)} className="px-4 py-2 font-medium">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white font-bold rounded-xl">Create Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Thermal Printer Hardware Test Modal */}
      {showPrinterTestModal && (
        <ThermalPrinterTestModal
          settings={settings}
          onClose={() => setShowPrinterTestModal(false)}
        />
      )}
    </div>
  );
};
