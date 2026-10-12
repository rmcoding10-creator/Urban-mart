import React, { useState } from 'react';
import { X, Barcode, Save, Sparkles } from 'lucide-react';
import { Category, Product, User } from '../../types';
import { db } from '../../services/db';

interface ProductMasterModalProps {
  product?: Product; // If provided, edit mode
  categories: Category[];
  user: User;
  onSuccess: () => void;
  onClose: () => void;
}

export const ProductMasterModal: React.FC<ProductMasterModalProps> = ({
  product,
  categories,
  user,
  onSuccess,
  onClose,
}) => {
  const isEdit = !!product;

  const [sku, setSku] = useState(product?.sku || `SKU-${Date.now().toString().slice(-6)}`);
  const [barcode, setBarcode] = useState(product?.barcode || `890${Math.floor(1000000000 + Math.random() * 9000000000)}`);
  const [name, setName] = useState(product?.name || '');
  const [categoryId, setCategoryId] = useState(product?.categoryId || categories[0]?.id || '');
  const [brand, setBrand] = useState(product?.brand || '');
  const [uom, setUom] = useState<Product['uom']>(product?.uom || 'PACK');
  const [hsnCode, setHsnCode] = useState(product?.hsnCode || '21069099');
  const [purchaseRate, setPurchaseRate] = useState<number>(product?.purchaseRate || 100);
  const [mrp, setMrp] = useState<number>(product?.mrp || 125);
  const [sellingPrice, setSellingPrice] = useState<number>(product?.sellingPrice || 120);
  const [taxRate, setTaxRate] = useState<number>(product?.taxRate || 12);
  const [currentStock, setCurrentStock] = useState<number>(product?.currentStock || 50);
  const [minStockAlert, setMinStockAlert] = useState<number>(product?.minStockAlert || 15);
  const [maxStockLevel, setMaxStockLevel] = useState<number>(product?.maxStockLevel || 150);
  const [batchNumber, setBatchNumber] = useState(product?.batchNumber || `BAT-${Date.now().toString().slice(-4)}`);
  const [expiryDate, setExpiryDate] = useState(product?.expiryDate || '2027-12-31');
  const [packSize, setPackSize] = useState(product?.packSize || '');

  const handleGenerateEanBarcode = () => {
    // Generate valid 13-digit Indian EAN barcode starting with 890
    const randomDigits = Math.floor(100000000 + Math.random() * 900000000);
    setBarcode(`890${randomDigits}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Product Name is required.');
      return;
    }
    if (!barcode.trim()) {
      alert('Barcode is required.');
      return;
    }

    const cat = categories.find((c) => c.id === categoryId);

    const savedProduct: Product = {
      id: product?.id || `prod-${Date.now()}`,
      sku: sku.trim().toUpperCase(),
      barcode: barcode.trim(),
      name: name.trim(),
      categoryId,
      categoryName: cat?.name || 'General',
      brand: brand.trim() || 'Urban Mart',
      uom,
      hsnCode: hsnCode.trim(),
      purchaseRate: Number(purchaseRate),
      mrp: Number(mrp),
      sellingPrice: Number(sellingPrice),
      taxRate: Number(taxRate),
      currentStock: Number(currentStock),
      minStockAlert: Number(minStockAlert),
      maxStockLevel: Number(maxStockLevel),
      batchNumber: batchNumber.trim(),
      expiryDate,
      packSize: packSize.trim(),
      createdAt: product?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.saveProduct(savedProduct, user);
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
              Product & Barcode Master
            </span>
            <h2 className="text-lg font-bold">
              {isEdit ? `Edit Product: ${product.name}` : 'Register New Product'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* General Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Product Title / Item Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Amul Butter Salted 500g"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Brand Name</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Amul, Britannia, Tata"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium"
              />
            </div>
          </div>

          {/* Barcode & SKU */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">SKU Code *</label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full px-3 py-2 font-mono uppercase font-bold border border-slate-300 rounded-lg bg-white"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 uppercase mb-1">
                EAN-13 Barcode *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="w-full px-3 py-2 font-mono font-bold border border-slate-300 rounded-lg bg-white"
                />
                <button
                  type="button"
                  onClick={handleGenerateEanBarcode}
                  className="px-3 py-2 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-lg font-bold whitespace-nowrap transition-colors flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Auto-Generate
                </button>
              </div>
            </div>
          </div>

          {/* Category, Tax, and UOM */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">GST Tax Slab</label>
              <select
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-bold"
              >
                <option value={0}>0% (Exempted / Staples)</option>
                <option value={5}>5% (Dairy & Edible Oils)</option>
                <option value={12}>12% (Packaged Snacks)</option>
                <option value={18}>18% (Personal & Home Care)</option>
                <option value={28}>28% (Aerated Drinks)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">HSN Code</label>
              <input
                type="text"
                value={hsnCode}
                onChange={(e) => setHsnCode(e.target.value)}
                placeholder="e.g. 2106"
                className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">UOM Unit</label>
              <select
                value={uom}
                onChange={(e) => setUom(e.target.value as Product['uom'])}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="PACK">PACK</option>
                <option value="PCS">PCS</option>
                <option value="KG">KG</option>
                <option value="GM">GM</option>
                <option value="LITER">LITER</option>
                <option value="ML">ML</option>
                <option value="BOTTLE">BOTTLE</option>
              </select>
            </div>
          </div>

          {/* Pricing & Margins */}
          <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Purchase Cost Rate (₹)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={purchaseRate}
                onChange={(e) => setPurchaseRate(Number(e.target.value))}
                className="w-full px-3 py-2 font-mono font-bold border border-slate-300 rounded-lg bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Maximum Retail Price - MRP (₹)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={mrp}
                onChange={(e) => setMrp(Number(e.target.value))}
                className="w-full px-3 py-2 font-mono font-bold border border-slate-300 rounded-lg bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Store Selling Price (₹)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={sellingPrice}
                onChange={(e) => setSellingPrice(Number(e.target.value))}
                className="w-full px-3 py-2 font-mono font-bold text-blue-700 border border-blue-300 rounded-lg bg-white"
              />
            </div>
          </div>

          {/* Stock Levels & Batches */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Current Stock</label>
              <input
                type="number"
                value={currentStock}
                onChange={(e) => setCurrentStock(Number(e.target.value))}
                className="w-full px-3 py-2 font-bold border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Low Stock Alert</label>
              <input
                type="number"
                value={minStockAlert}
                onChange={(e) => setMinStockAlert(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Batch / Lot No</label>
              <input
                type="text"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Expiry Date</label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isEdit ? 'Save Changes' : 'Register Product'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
