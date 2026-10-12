import React, { useState } from 'react';
import {
  X,
  Barcode,
  Plus,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Building2,
  Calendar,
  FileText,
} from 'lucide-react';
import { GRN, GRNItem, Product, Supplier, User } from '../../types';
import { db } from '../../services/db';
import { formatCurrency } from '../../utils/formatters';
import { soundFx } from '../../utils/audio';

interface NewGRNModalProps {
  user: User;
  onSuccess: (grn: GRN, wasConfirmed: boolean) => void;
  onClose: () => void;
}

export const NewGRNModal: React.FC<NewGRNModalProps> = ({ user, onSuccess, onClose }) => {
  const suppliers = db.getSuppliers();
  const products = db.getProducts();

  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(suppliers[0]?.id || '');
  const [invoiceNumber, setInvoiceNumber] = useState<string>(`INV-DEPOT-${Date.now().toString().slice(-4)}`);
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [receivedDate, setReceivedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState<string>('Stock verified physically and count matched against packing slip.');

  // Barcode entry for adding items
  const [barcodeScanInput, setBarcodeScanInput] = useState<string>('');
  const [selectedProductPicker, setSelectedProductPicker] = useState<string>('');

  // GRN items list
  const [items, setItems] = useState<GRNItem[]>([]);

  const handleAddProduct = (prod: Product) => {
    const existingIndex = items.findIndex((i) => i.productId === prod.id);
    if (existingIndex >= 0) {
      // Increment ordered & received
      setItems((prev) =>
        prev.map((it, idx) => {
          if (idx === existingIndex) {
            const newRecv = it.receivedQty + 10;
            const newOrd = it.orderedQty + 10;
            const taxable = (newRecv - it.damagedQty) * it.purchaseRate;
            const tax = (taxable * it.taxRate) / 100;
            return {
              ...it,
              orderedQty: newOrd,
              receivedQty: newRecv,
              taxAmount: tax,
              lineTotal: taxable + tax,
            };
          }
          return it;
        })
      );
      soundFx.playScanBeep();
      return;
    }

    const defaultQty = 20;
    const taxable = defaultQty * prod.purchaseRate;
    const tax = (taxable * prod.taxRate) / 100;

    const newItem: GRNItem = {
      id: `gi-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      productId: prod.id,
      productName: prod.name,
      barcode: prod.barcode,
      batchNumber: prod.batchNumber || `BAT-${Date.now().toString().slice(-4)}`,
      expiryDate: prod.expiryDate || '2027-12-31',
      orderedQty: defaultQty,
      receivedQty: defaultQty,
      damagedQty: 0,
      purchaseRate: prod.purchaseRate,
      mrp: prod.mrp,
      sellingPrice: prod.sellingPrice,
      taxRate: prod.taxRate,
      taxAmount: tax,
      lineTotal: taxable + tax,
      notes: '',
    };

    setItems((prev) => [newItem, ...prev]);
    soundFx.playScanBeep();
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeScanInput.trim()) return;
    const prod = db.getProductByBarcode(barcodeScanInput.trim());
    if (prod) {
      handleAddProduct(prod);
      setBarcodeScanInput('');
    } else {
      soundFx.playErrorBuzz();
      alert(`No product found with barcode or SKU: ${barcodeScanInput}`);
    }
  };

  const updateItem = (id: string, updates: Partial<GRNItem>) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, ...updates };
          const netQty = Math.max(0, updated.receivedQty - updated.damagedQty);
          const taxable = netQty * updated.purchaseRate;
          const tax = (taxable * updated.taxRate) / 100;
          updated.taxAmount = tax;
          updated.lineTotal = taxable + tax;
          return updated;
        }
        return item;
      })
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Calculations
  const subTotal = items.reduce((s, i) => s + (i.receivedQty - i.damagedQty) * i.purchaseRate, 0);
  const totalTax = items.reduce((s, i) => s + i.taxAmount, 0);
  const rawTotal = subTotal + totalTax;
  const grandTotal = Math.round(rawTotal);
  const roundOff = Number((grandTotal - rawTotal).toFixed(2));

  const handleSaveGRN = (andConfirm: boolean) => {
    if (items.length === 0) {
      alert('Please add at least one product to the GRN.');
      return;
    }
    const sup = suppliers.find((s) => s.id === selectedSupplierId);
    if (!sup) {
      alert('Please select a valid supplier.');
      return;
    }

    const grnNumber = db.generateGRNNumber();
    const grnId = `grn-${Date.now()}`;

    const newGRN: GRN = {
      id: grnId,
      grnNumber,
      supplierId: sup.id,
      supplierName: sup.companyName,
      invoiceNumber: invoiceNumber.trim() || 'INV-NA',
      invoiceDate,
      receivedDate,
      items,
      subTotal,
      totalTax,
      roundOff,
      grandTotal,
      status: 'DRAFT',
      createdBy: user.id,
      createdByName: user.fullName,
      counterName: user.counterName,
      remarks,
      createdAt: new Date().toISOString(),
    };

    // Save initial GRN
    db.saveGRN(newGRN);

    if (andConfirm) {
      // Execute strict atomic confirmation
      const res = db.confirmAndApproveGRN(grnId, user);
      if (res.success) {
        soundFx.playSuccessChime();
        const confirmedGRN = db.getGRNById(grnId) || newGRN;
        onSuccess(confirmedGRN, true);
      } else {
        alert(res.message);
      }
    } else {
      soundFx.playSuccessChime();
      onSuccess(newGRN, false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
              Stock Inward Counter
            </span>
            <h2 className="text-lg font-bold">New Goods Receipt Note (GRN)</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Supplier & Invoice metadata */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Select Supplier</label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium text-slate-800"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.companyName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Supplier Invoice No.
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full px-2.5 py-1.5 font-mono uppercase border border-slate-300 rounded-lg bg-white font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Invoice Date</label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Physical Inward Date</label>
              <input
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium"
              />
            </div>
          </div>

          {/* Barcode & Product Quick Scan Bar */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 flex flex-col md:flex-row items-center gap-3">
            <form onSubmit={handleBarcodeSubmit} className="flex-1 flex items-center gap-2 w-full">
              <div className="relative flex-1">
                <Barcode className="w-4 h-4 absolute left-3 top-2.5 text-blue-600" />
                <input
                  type="text"
                  placeholder="Scan SKU barcode or enter number & hit [Enter]..."
                  value={barcodeScanInput}
                  onChange={(e) => setBarcodeScanInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono font-bold border border-blue-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer whitespace-nowrap"
              >
                Scan Barcode
              </button>
            </form>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={selectedProductPicker}
                onChange={(e) => {
                  setSelectedProductPicker(e.target.value);
                  const p = products.find((prod) => prod.id === e.target.value);
                  if (p) handleAddProduct(p);
                }}
                className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-medium max-w-xs"
              >
                <option value="">Or select product from catalog...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Cur. Stock: {p.currentStock})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Line Items Verification Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="bg-slate-900 text-slate-200 text-xs font-bold px-3 py-2 grid grid-cols-12 gap-2 uppercase tracking-wider">
              <span className="col-span-3">Product Name & Barcode</span>
              <span className="col-span-2">Batch & Expiry</span>
              <span className="col-span-1 text-center">Inv Qty</span>
              <span className="col-span-1 text-center">Recv Qty</span>
              <span className="col-span-1 text-center text-rose-300">Damage</span>
              <span className="col-span-1 text-right">Cost (₹)</span>
              <span className="col-span-1 text-right">MRP (₹)</span>
              <span className="col-span-1 text-right">Line Total</span>
              <span className="col-span-1 text-center">Del</span>
            </div>

            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {items.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No products added yet. Scan a barcode above to add inward line items.
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 grid grid-cols-12 gap-2 items-center text-xs hover:bg-slate-50"
                  >
                    {/* Name & Barcode */}
                    <div className="col-span-3 pr-1">
                      <p className="font-bold text-slate-900 leading-snug">{item.productName}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{item.barcode}</p>
                    </div>

                    {/* Batch & Expiry */}
                    <div className="col-span-2 space-y-1">
                      <input
                        type="text"
                        placeholder="Batch No"
                        value={item.batchNumber}
                        onChange={(e) => updateItem(item.id, { batchNumber: e.target.value })}
                        className="w-full px-1.5 py-0.5 text-[11px] font-mono border rounded bg-white"
                      />
                      <input
                        type="date"
                        value={item.expiryDate}
                        onChange={(e) => updateItem(item.id, { expiryDate: e.target.value })}
                        className="w-full px-1.5 py-0.5 text-[10px] border rounded bg-white"
                      />
                    </div>

                    {/* Ordered / Invoice Qty */}
                    <div className="col-span-1 text-center">
                      <input
                        type="number"
                        min="1"
                        value={item.orderedQty}
                        onChange={(e) => updateItem(item.id, { orderedQty: Number(e.target.value) })}
                        className="w-full text-center px-1 py-1 font-semibold border rounded bg-white"
                      />
                    </div>

                    {/* Physical Received Qty */}
                    <div className="col-span-1 text-center">
                      <input
                        type="number"
                        min="0"
                        value={item.receivedQty}
                        onChange={(e) => updateItem(item.id, { receivedQty: Number(e.target.value) })}
                        className="w-full text-center px-1 py-1 font-bold text-blue-700 border border-blue-300 rounded bg-blue-50/50"
                      />
                    </div>

                    {/* Damaged / Rejected Qty */}
                    <div className="col-span-1 text-center">
                      <input
                        type="number"
                        min="0"
                        max={item.receivedQty}
                        value={item.damagedQty}
                        onChange={(e) => updateItem(item.id, { damagedQty: Number(e.target.value) })}
                        className="w-full text-center px-1 py-1 font-bold text-rose-700 border border-rose-300 rounded bg-rose-50/50"
                      />
                    </div>

                    {/* Purchase Rate (Cost) */}
                    <div className="col-span-1 text-right">
                      <input
                        type="number"
                        step="0.01"
                        value={item.purchaseRate}
                        onChange={(e) => updateItem(item.id, { purchaseRate: Number(e.target.value) })}
                        className="w-full text-right px-1 py-1 font-mono border rounded bg-white"
                      />
                    </div>

                    {/* MRP */}
                    <div className="col-span-1 text-right">
                      <input
                        type="number"
                        step="0.01"
                        value={item.mrp}
                        onChange={(e) => updateItem(item.id, { mrp: Number(e.target.value) })}
                        className="w-full text-right px-1 py-1 font-mono border rounded bg-white"
                      />
                    </div>

                    {/* Line Total */}
                    <div className="col-span-1 text-right font-bold font-mono text-slate-900">
                      ₹{item.lineTotal.toFixed(2)}
                    </div>

                    {/* Remove */}
                    <div className="col-span-1 text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5 mx-auto" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Remarks & Totals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Depot Receiving Notes & Packaging Verification
              </label>
              <textarea
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Mention damage condition, seal integrity, temperature compliance..."
                className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-white"
              />
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal (Net Received × Cost):</span>
                <span>₹{subTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Input GST Total:</span>
                <span>₹{totalTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Round Off:</span>
                <span>₹{roundOff.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-slate-900 pt-2 border-t border-slate-300">
                <span>Total GRN Inward Value:</span>
                <span>{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleSaveGRN(false)}
              className="px-4 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Save as Draft (No Stock Change)
            </button>

            <button
              type="button"
              onClick={() => handleSaveGRN(true)}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Confirm & Inward to Inventory</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
