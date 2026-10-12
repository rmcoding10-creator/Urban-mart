import React, { useState, useEffect, useRef } from 'react';
import {
  Barcode,
  Search,
  Plus,
  Minus,
  Trash2,
  PauseCircle,
  PlayCircle,
  RotateCcw,
  Clock,
  Sparkles,
  ShoppingBag,
  CreditCard,
  Banknote,
  QrCode,
  Tag,
  Percent,
  Check,
  AlertTriangle,
  UserCheck,
  Package,
} from 'lucide-react';
import {
  CartItem,
  CashierShift,
  Customer,
  HeldCart,
  PaymentDetails,
  Product,
  SaleInvoice,
  StoreSettings,
  User,
} from '../../types';
import { db, subscribeToDB } from '../../services/db';
import { formatCurrency } from '../../utils/formatters';
import { soundFx } from '../../utils/audio';
import { PaymentModal } from './PaymentModal';
import { ThermalReceiptModal } from './ThermalReceiptModal';
import { ShiftModal } from './ShiftModal';
import { HoldBillsModal } from './HoldBillsModal';
import { SalesReturnModal } from './SalesReturnModal';

interface POSBillingScreenProps {
  currentUser: User;
}

export const POSBillingScreen: React.FC<POSBillingScreenProps> = ({ currentUser }) => {
  // DB States
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(db.getSettings());
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>([]);
  const [activeShift, setActiveShift] = useState<CashierShift | undefined>(undefined);

  // Cart State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [billDiscount, setBillDiscount] = useState<number>(0);

  // Customer State
  const [customerPhoneInput, setCustomerPhoneInput] = useState('');
  const [attachedCustomer, setAttachedCustomer] = useState<Customer | undefined>(undefined);

  // UI Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [latestInvoice, setLatestInvoice] = useState<SaleInvoice | null>(null);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showCatalogDrawer, setShowCatalogDrawer] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [catalogSearch, setCatalogSearch] = useState('');

  // Status message toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const loadData = () => {
    setProducts(db.getProducts());
    setCustomers(db.getCustomers());
    setSettings(db.getSettings());
    setHeldCarts(db.getHeldCarts());
    setActiveShift(db.getActiveShiftForCashier(currentUser.id));
  };

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToDB(loadData);
    return () => unsubscribe();
  }, [currentUser.id]);

  useEffect(() => {
    // Focus barcode input by default
    barcodeInputRef.current?.focus();
  }, []);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showPaymentModal || showReceiptModal || showShiftModal || showHoldModal || showReturnModal) {
        return;
      }
      if (e.key === 'F2') {
        e.preventDefault();
        barcodeInputRef.current?.focus();
      } else if (e.key === 'F4') {
        e.preventDefault();
        handleHoldBill();
      } else if (e.key === 'F8') {
        e.preventDefault();
        if (cartItems.length > 0) setShowPaymentModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cartItems, showPaymentModal, showReceiptModal, showShiftModal, showHoldModal, showReturnModal]);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Add Product to Cart by Barcode or Object
  const addProductToCart = (product: Product, qtyToAdd: number = 1) => {
    if (product.currentStock <= 0) {
      soundFx.playErrorBuzz();
      showToast(`Warning: ${product.name} is out of stock!`, 'error');
    }

    setCartItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.productId === product.id);
      const taxRate = product.taxRate || 0;
      const unitPrice = product.sellingPrice;
      const mrp = product.mrp;

      if (existingIndex >= 0) {
        const updated = [...prev];
        const item = updated[existingIndex];
        const newQty = item.quantity + qtyToAdd;

        const taxableAmount = (newQty * unitPrice) / (1 + taxRate / 100);
        const totalTax = newQty * unitPrice - taxableAmount;
        const cgstAmount = totalTax / 2;
        const sgstAmount = totalTax / 2;

        updated[existingIndex] = {
          ...item,
          quantity: newQty,
          taxableAmount,
          cgstAmount,
          sgstAmount,
          totalAmount: newQty * unitPrice,
          availableStock: product.currentStock,
        };
        soundFx.playScanBeep();
        return updated;
      } else {
        const taxableAmount = (qtyToAdd * unitPrice) / (1 + taxRate / 100);
        const totalTax = qtyToAdd * unitPrice - taxableAmount;
        const cgstAmount = totalTax / 2;
        const sgstAmount = totalTax / 2;

        const newItem: CartItem = {
          productId: product.id,
          productName: product.name,
          barcode: product.barcode,
          batchNumber: product.batchNumber,
          expiryDate: product.expiryDate,
          hsnCode: product.hsnCode,
          mrp,
          unitPrice,
          quantity: qtyToAdd,
          discountPerUnit: Math.max(0, mrp - unitPrice),
          taxRate,
          taxableAmount,
          cgstAmount,
          sgstAmount,
          totalAmount: qtyToAdd * unitPrice,
          availableStock: product.currentStock,
        };
        soundFx.playScanBeep();
        return [newItem, ...prev];
      }
    });

    setBarcodeInput('');
    barcodeInputRef.current?.focus();
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const clean = barcodeInput.trim();
    const product = db.getProductByBarcode(clean);

    if (product) {
      addProductToCart(product, 1);
      showToast(`Added: ${product.name}`, 'success');
    } else {
      soundFx.playErrorBuzz();
      showToast(`Barcode ${clean} not found in catalog!`, 'error');
    }
    setBarcodeInput('');
  };

  const updateQuantity = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          const taxableAmount = (newQty * item.unitPrice) / (1 + item.taxRate / 100);
          const totalTax = newQty * item.unitPrice - taxableAmount;
          return {
            ...item,
            quantity: newQty,
            taxableAmount,
            cgstAmount: totalTax / 2,
            sgstAmount: totalTax / 2,
            totalAmount: newQty * item.unitPrice,
          };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId: string) => {
    setCartItems((prev) => prev.filter((i) => i.productId !== productId));
    soundFx.playScanBeep();
  };

  const clearCart = () => {
    if (cartItems.length === 0) return;
    if (confirm('Are you sure you want to clear the entire cart?')) {
      setCartItems([]);
      setBillDiscount(0);
      setAttachedCustomer(undefined);
      setCustomerPhoneInput('');
    }
  };

  // Customer attach
  const handleCustomerPhoneLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerPhoneInput.trim()) return;
    const found = db.getCustomerByPhone(customerPhoneInput);
    if (found) {
      setAttachedCustomer(found);
      showToast(`Customer identified: ${found.name} (${found.loyaltyPoints} points)`, 'success');
    } else {
      setAttachedCustomer({
        id: `cust-temp-${Date.now()}`,
        name: 'New Customer',
        phone: customerPhoneInput.trim(),
        loyaltyPoints: 0,
        totalSpent: 0,
        customerType: 'Regular',
        createdAt: new Date().toISOString(),
      });
      showToast('New customer phone attached to bill', 'info');
    }
  };

  // Hold current cart
  const handleHoldBill = () => {
    if (cartItems.length === 0) {
      showToast('Cannot hold an empty cart!', 'error');
      return;
    }
    const custName = attachedCustomer?.name || `Customer ${heldCarts.length + 1}`;
    db.holdCart(custName, cartItems, currentUser, attachedCustomer?.phone);
    setCartItems([]);
    setBillDiscount(0);
    setAttachedCustomer(undefined);
    setCustomerPhoneInput('');
    soundFx.playSuccessChime();
    showToast(`Bill parked on hold successfully!`, 'success');
  };

  // Resume a held cart
  const handleResumeCart = (held: HeldCart) => {
    if (cartItems.length > 0) {
      if (!confirm('Current cart has items. Replace with resumed held bill?')) return;
    }
    setCartItems(held.items);
    if (held.customerPhone) {
      setCustomerPhoneInput(held.customerPhone);
      const found = db.getCustomerByPhone(held.customerPhone);
      if (found) setAttachedCustomer(found);
    }
    db.removeHeldCart(held.id);
    setShowHoldModal(false);
    showToast(`Resumed cart ${held.tokenNumber} (${held.customerName})`, 'success');
  };

  // Computations
  const subTotal = cartItems.reduce((s, i) => s + i.totalAmount, 0);
  const totalMRP = cartItems.reduce((s, i) => s + i.mrp * i.quantity, 0);
  const totalSavings = Math.max(0, totalMRP - subTotal + billDiscount);
  const cgstTotal = cartItems.reduce((s, i) => s + i.cgstAmount, 0);
  const sgstTotal = cartItems.reduce((s, i) => s + i.sgstAmount, 0);
  const totalTax = cgstTotal + sgstTotal;
  const rawGrandTotal = Math.max(0, subTotal - billDiscount);
  const grandTotal = Math.round(rawGrandTotal);
  const roundOff = Number((grandTotal - rawGrandTotal).toFixed(2));
  const totalQty = cartItems.reduce((s, i) => s + i.quantity, 0);

  // Settlement execution
  const handleConfirmPayment = (paymentDetails: PaymentDetails, pointsToRedeem: number) => {
    if (!activeShift) {
      // Auto open shift if missing
      const shift = db.openShift(currentUser, 2000);
      setActiveShift(shift);
    }

    const currentShiftId = activeShift ? activeShift.id : `shift-${Date.now()}`;

    const res = db.processSaleInvoice(
      {
        customerId: attachedCustomer?.id,
        customerName: attachedCustomer?.name || 'Walk-in Customer',
        customerPhone: attachedCustomer?.phone || customerPhoneInput,
        items: cartItems,
        subTotal,
        totalSavings,
        billDiscount,
        cgstTotal,
        sgstTotal,
        totalTax,
        roundOff,
        grandTotal,
        paymentDetails,
        pointsToRedeem,
      },
      currentUser,
      currentShiftId
    );

    if (res.success && res.invoice) {
      soundFx.playSuccessChime();
      setLatestInvoice(res.invoice);
      setShowPaymentModal(false);
      setShowReceiptModal(true);
      // Reset cart
      setCartItems([]);
      setBillDiscount(0);
      setAttachedCustomer(undefined);
      setCustomerPhoneInput('');
      showToast(`Sale completed! Bill #${res.invoice.billNumber}`, 'success');
    } else {
      soundFx.playErrorBuzz();
      alert(`Sale failed: ${res.message}`);
    }
  };

  // Filtered catalog products for touch/click picker
  const filteredCatalog = products.filter((p) => {
    const matchCat = selectedCategoryFilter === 'ALL' || p.categoryId === selectedCategoryFilter;
    const matchSearch =
      p.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      p.barcode.includes(catalogSearch) ||
      p.brand.toLowerCase().includes(catalogSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] bg-slate-100 overflow-hidden select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-18 right-6 z-50 px-4 py-2.5 rounded-xl shadow-xl text-xs font-bold text-white flex items-center gap-2 transition-all transform animate-bounce ${
            toastMessage.type === 'success'
              ? 'bg-emerald-600'
              : toastMessage.type === 'error'
              ? 'bg-rose-600'
              : 'bg-blue-600'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <Check className="w-4 h-4" />
          ) : (
            <AlertTriangle className="w-4 h-4" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* POS Sub-Header / Cashier Action Bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between gap-4">
        {/* Left: Cashier & Shift status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold text-slate-800">{currentUser.counterName}</span>
          </div>

          <div className="h-4 w-px bg-slate-300"></div>

          <button
            type="button"
            onClick={() => setShowShiftModal(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>Shift: {activeShift ? 'Active (Open)' : 'Not Started'}</span>
          </button>
        </div>

        {/* Center: Customer phone quick attachment */}
        <form onSubmit={handleCustomerPhoneLookup} className="flex items-center gap-2 max-w-sm w-full">
          <div className="relative flex-1">
            <UserCheck className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="tel"
              placeholder="Customer Phone (e.g. 9820199887)..."
              value={customerPhoneInput}
              onChange={(e) => setCustomerPhoneInput(e.target.value)}
              className="w-full pl-8 pr-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-2.5 py-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition-colors"
          >
            Attach
          </button>
          {attachedCustomer && (
            <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 font-semibold whitespace-nowrap">
              <Sparkles className="w-3 h-3 text-amber-600" />
              <span>{attachedCustomer.name} ({attachedCustomer.loyaltyPoints} pts)</span>
            </div>
          )}
        </form>

        {/* Right: POS Operations Buttons */}
        <div className="flex items-center gap-2">
          {/* Quick Catalog / Product Search Drawer */}
          <button
            type="button"
            onClick={() => setShowCatalogDrawer(!showCatalogDrawer)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
              showCatalogDrawer
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Catalog Picker</span>
          </button>

          {/* Hold Bill Button */}
          <button
            type="button"
            onClick={handleHoldBill}
            disabled={cartItems.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 disabled:opacity-40 transition-colors cursor-pointer"
            title="Park current bill on hold (F4)"
          >
            <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>Hold Bill [F4]</span>
          </button>

          {/* Held Bills Badge Button */}
          <button
            type="button"
            onClick={() => setShowHoldModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors relative cursor-pointer"
          >
            <PlayCircle className="w-3.5 h-3.5 text-blue-600" />
            <span>Held ({heldCarts.length})</span>
            {heldCarts.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 absolute -top-1 -right-1"></span>
            )}
          </button>

          {/* Sales Return / Refund */}
          <button
            type="button"
            onClick={() => setShowReturnModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
            <span>Return / Refund</span>
          </button>

          {/* Clear Cart */}
          <button
            type="button"
            onClick={clearCart}
            disabled={cartItems.length === 0}
            className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 rounded-lg hover:bg-rose-50 transition-colors"
            title="Clear Cart"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main POS Grid */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Laser Scanner, Quick SKU Bar, and Cart Table */}
        <div className="flex-1 flex flex-col p-3 overflow-hidden">
          {/* Barcode Laser Scan Bar */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-3 mb-3">
            <form onSubmit={handleBarcodeSubmit} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Barcode className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
                <input
                  ref={barcodeInputRef}
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Scan barcode with laser or enter SKU / number & press [Enter]..."
                  className="w-full pl-11 pr-4 py-2.5 text-sm font-mono border-2 border-blue-500/40 focus:border-blue-600 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-3 focus:ring-blue-100 transition-all font-semibold"
                />
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                + Add SKU [Enter]
              </button>
            </form>

            {/* Quick-Barcode Simulator for rapid demo testing */}
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto text-[11px]">
              <span className="text-slate-400 font-semibold whitespace-nowrap">Fast Scan Test:</span>
              {products.slice(0, 6).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addProductToCart(p, 1)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 rounded-lg whitespace-nowrap font-medium text-slate-700 transition-colors"
                >
                  +{p.name.split(' ')[0]} ({formatCurrency(p.sellingPrice)})
                </button>
              ))}
            </div>
          </div>

          {/* Cart Table */}
          <div className="flex-1 bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-slate-900 text-slate-200 text-xs font-bold px-4 py-2.5 grid grid-cols-12 gap-2 uppercase tracking-wider">
              <span className="col-span-1">#</span>
              <span className="col-span-4">Item Details</span>
              <span className="col-span-2 text-center">Qty</span>
              <span className="col-span-1 text-right">MRP</span>
              <span className="col-span-1 text-right">Rate</span>
              <span className="col-span-1 text-center">GST</span>
              <span className="col-span-1 text-right">Total</span>
              <span className="col-span-1 text-center">Del</span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {cartItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8">
                  <ShoppingBag className="w-12 h-12 text-slate-300 mb-3" />
                  <p className="text-base font-bold text-slate-700">Billing Register Empty</p>
                  <p className="text-xs text-slate-500 text-center max-w-sm mt-1">
                    Scan any product barcode or click quick SKU tags above to add items to customer bill.
                  </p>
                </div>
              ) : (
                cartItems.map((item, index) => (
                  <div
                    key={item.productId}
                    className="px-4 py-2.5 grid grid-cols-12 gap-2 items-center text-xs hover:bg-blue-50/40 transition-colors"
                  >
                    <span className="col-span-1 font-bold text-slate-400">{index + 1}</span>

                    {/* Item Details */}
                    <div className="col-span-4 pr-2">
                      <p className="font-bold text-slate-900 leading-snug line-clamp-1">
                        {item.productName}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
                        <span>{item.barcode}</span>
                        <span>•</span>
                        <span>HSN:{item.hsnCode}</span>
                        {item.availableStock <= 15 && (
                          <span className="px-1 rounded bg-amber-100 text-amber-800 font-bold">
                            Stock: {item.availableStock}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Qty +/- Controls */}
                    <div className="col-span-2 flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.productId, Math.max(1, Number(e.target.value)))}
                        className="w-11 px-1 py-1 text-center font-bold text-xs border border-slate-300 rounded bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* MRP */}
                    <span className="col-span-1 text-right text-slate-400 line-through">
                      ₹{item.mrp.toFixed(2)}
                    </span>

                    {/* Rate */}
                    <span className="col-span-1 text-right font-semibold text-slate-800">
                      ₹{item.unitPrice.toFixed(2)}
                    </span>

                    {/* GST % */}
                    <span className="col-span-1 text-center font-mono text-[11px] text-slate-600">
                      {item.taxRate}%
                    </span>

                    {/* Total Amount */}
                    <span className="col-span-1 text-right font-bold text-slate-900 text-sm">
                      ₹{item.totalAmount.toFixed(2)}
                    </span>

                    {/* Delete */}
                    <div className="col-span-1 text-center">
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.productId)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5 mx-auto" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Cart footer counter */}
            {cartItems.length > 0 && (
              <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex justify-between text-xs text-slate-600 font-medium">
                <span>Unique SKUs: {cartItems.length}</span>
                <span>Total Units: {totalQty}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Bill Breakdown & Pay Panel */}
        <div className="w-88 p-3 flex flex-col gap-3">
          {/* Main Grand Total Card */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg flex flex-col justify-between border border-slate-800">
            <div>
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <span>Amount Due</span>
                <span>{cartItems.length} items</span>
              </div>
              <div className="text-4xl font-black tracking-tight text-white mt-1">
                {formatCurrency(grandTotal)}
              </div>
            </div>

            {totalSavings > 0 && (
              <div className="mt-3 py-1.5 px-3 bg-emerald-500/20 border border-emerald-400/30 rounded-xl text-emerald-300 text-xs font-bold flex items-center justify-between">
                <span>Total Customer Savings:</span>
                <span>{formatCurrency(totalSavings)}</span>
              </div>
            )}
          </div>

          {/* Bill Calculation Breakdown */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-4 space-y-2.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Gross Total (MRP):</span>
              <span className="font-semibold text-slate-900">{formatCurrency(totalMRP)}</span>
            </div>

            <div className="flex justify-between text-emerald-700 font-medium">
              <span>Retail Price Discount:</span>
              <span>-{formatCurrency(Math.max(0, totalMRP - subTotal))}</span>
            </div>

            {/* Bill Level Special Discount */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-100">
              <span className="text-slate-700 font-semibold flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-blue-600" /> Bill Discount (₹):
              </span>
              <input
                type="number"
                min="0"
                value={billDiscount || ''}
                onChange={(e) => setBillDiscount(Math.max(0, Number(e.target.value)))}
                placeholder="0.00"
                className="w-20 px-2 py-1 text-right text-xs font-bold border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-between text-slate-500 text-[11px] pt-1 border-t border-slate-100">
              <span>Total GST (CGST+SGST):</span>
              <span>{formatCurrency(totalTax)}</span>
            </div>

            {roundOff !== 0 && (
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>Round Off Adjustment:</span>
                <span>{roundOff > 0 ? `+₹${roundOff}` : `-₹${Math.abs(roundOff)}`}</span>
              </div>
            )}

            <div className="pt-2 border-t border-slate-200 flex justify-between font-extrabold text-slate-900 text-sm">
              <span>Net Payable:</span>
              <span>{formatCurrency(grandTotal)}</span>
            </div>
          </div>

          {/* Big Action Pay Buttons */}
          <div className="flex-1 flex flex-col justify-end gap-2">
            <button
              type="button"
              disabled={cartItems.length === 0}
              onClick={() => setShowPaymentModal(true)}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-extrabold text-base rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <CreditCard className="w-5 h-5" />
              <span>COLLECT & PRINT [F8]</span>
            </button>

            {/* Quick 1-Click Cash / UPI shortcuts */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={cartItems.length === 0}
                onClick={() => {
                  handleConfirmPayment(
                    {
                      method: 'CASH',
                      cashAmount: grandTotal,
                      upiAmount: 0,
                      cardAmount: 0,
                      tenderedAmount: grandTotal,
                      changeAmount: 0,
                    },
                    0
                  );
                }}
                className="py-2.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Banknote className="w-4 h-4 text-emerald-400" />
                <span>Exact Cash</span>
              </button>

              <button
                type="button"
                disabled={cartItems.length === 0}
                onClick={() => setShowPaymentModal(true)}
                className="py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-white" />
                <span>UPI QR Pay</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Catalog Drawer Sidebar */}
      {showCatalogDrawer && (
        <div className="fixed inset-y-0 right-0 z-40 w-96 bg-white shadow-2xl border-l border-slate-200 flex flex-col">
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm">Product Master Picker</h3>
              <p className="text-[11px] text-slate-400">Click SKU to add directly to cart</p>
            </div>
            <button
              onClick={() => setShowCatalogDrawer(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="p-3 border-b border-slate-200 space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search products by brand, title, SKU..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:bg-white"
              />
            </div>

            <div className="flex gap-1 overflow-x-auto pb-1 text-[11px]">
              <button
                type="button"
                onClick={() => setSelectedCategoryFilter('ALL')}
                className={`px-2 py-1 rounded-md font-medium whitespace-nowrap ${
                  selectedCategoryFilter === 'ALL'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All
              </button>
              {db.getCategories().map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCategoryFilter(c.id)}
                  className={`px-2 py-1 rounded-md font-medium whitespace-nowrap ${
                    selectedCategoryFilter === c.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 divide-y divide-slate-100">
            {filteredCatalog.map((prod) => (
              <div
                key={prod.id}
                onClick={() => addProductToCart(prod, 1)}
                className="py-2.5 px-2 hover:bg-blue-50 rounded-lg cursor-pointer flex items-center justify-between group transition-colors"
              >
                <div>
                  <p className="text-xs font-bold text-slate-900 group-hover:text-blue-700">
                    {prod.name}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {prod.barcode} • {prod.brand} • Stock: {prod.currentStock}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-extrabold text-slate-900">
                    {formatCurrency(prod.sellingPrice)}
                  </span>
                  <span className="block text-[10px] text-slate-400 line-through">
                    ₹{prod.mrp}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Settlement Modal */}
      {showPaymentModal && (
        <PaymentModal
          grandTotal={grandTotal}
          customer={attachedCustomer}
          onConfirmPayment={handleConfirmPayment}
          onClose={() => setShowPaymentModal(false)}
        />
      )}

      {/* Thermal Receipt Print Modal */}
      {showReceiptModal && latestInvoice && (
        <ThermalReceiptModal
          invoice={latestInvoice}
          settings={settings}
          onClose={() => setShowReceiptModal(false)}
        />
      )}

      {/* Shift Drawer Modal */}
      {showShiftModal && (
        <ShiftModal
          user={currentUser}
          activeShift={activeShift}
          onShiftUpdated={loadData}
          onClose={() => setShowShiftModal(false)}
        />
      )}

      {/* Hold Bills Modal */}
      {showHoldModal && (
        <HoldBillsModal
          heldCarts={heldCarts}
          onResume={handleResumeCart}
          onDelete={(id) => {
            db.removeHeldCart(id);
            loadData();
          }}
          onClose={() => setShowHoldModal(false)}
        />
      )}

      {/* Sales Return Modal */}
      {showReturnModal && (
        <SalesReturnModal
          user={currentUser}
          onReturnSuccess={(retNo) => {
            setShowReturnModal(false);
            loadData();
            showToast(`Processed Return #${retNo} successfully!`, 'success');
          }}
          onClose={() => setShowReturnModal(false)}
        />
      )}
    </div>
  );
};
