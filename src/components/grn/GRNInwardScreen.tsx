import React, { useState, useEffect } from 'react';
import {
  PackageCheck,
  Plus,
  Search,
  Filter,
  FileText,
  Printer,
  CheckCircle,
  Clock,
  AlertTriangle,
  Download,
  Building2,
  Calendar,
} from 'lucide-react';
import { GRN, StoreSettings, User } from '../../types';
import { db, subscribeToDB } from '../../services/db';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { downloadCSV } from '../../utils/exportCsv';
import { NewGRNModal } from './NewGRNModal';
import { GRNReceiptSlip } from './GRNReceiptSlip';

interface GRNInwardScreenProps {
  currentUser: User;
}

export const GRNInwardScreen: React.FC<GRNInwardScreenProps> = ({ currentUser }) => {
  const [grns, setGRNs] = useState<GRN[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(db.getSettings());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'CONFIRMED'>('ALL');

  const [showNewGRNModal, setShowNewGRNModal] = useState(false);
  const [viewingGRN, setViewingGRN] = useState<GRN | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = () => {
    setGRNs(db.getGRNs());
    setSettings(db.getSettings());
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeToDB(loadData);
    return () => unsub();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleApproveDraft = (grn: GRN) => {
    if (confirm(`Confirm and approve ${grn.grnNumber}? This will immediately increase store inventory.`)) {
      const res = db.confirmAndApproveGRN(grn.id, currentUser);
      if (res.success) {
        showToast(res.message);
        loadData();
      } else {
        alert(res.message);
      }
    }
  };

  const handleExportCSV = () => {
    const headers = ['GRN Number', 'Supplier', 'Invoice No', 'Invoice Date', 'Status', 'Inward Value (INR)', 'Created By', 'Confirmed At'];
    const rows = filteredGRNs.map((g) => [
      g.grnNumber,
      g.supplierName,
      g.invoiceNumber,
      g.invoiceDate,
      g.status,
      g.grandTotal,
      g.createdByName,
      g.confirmedAt ? formatDateTime(g.confirmedAt) : 'Pending',
    ]);
    downloadCSV('UrbanMart_GRN_Inwards', headers, rows);
  };

  // Filtered GRNs
  const filteredGRNs = grns.filter((g) => {
    const matchStatus = statusFilter === 'ALL' || g.status === statusFilter;
    const matchSearch =
      g.grnNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  // Analytics
  const totalInwardValue = grns
    .filter((g) => g.status === 'CONFIRMED')
    .reduce((s, g) => s + g.grandTotal, 0);

  const pendingDraftsCount = grns.filter((g) => g.status === 'DRAFT').length;

  const totalInwardUnits = grns
    .filter((g) => g.status === 'CONFIRMED')
    .reduce(
      (s, g) => s + g.items.reduce((sum, i) => sum + (i.receivedQty - i.damagedQty), 0),
      0
    );

  const totalDamagedUnits = grns.reduce(
    (s, g) => s + g.items.reduce((sum, i) => sum + (i.damagedQty || 0), 0),
    0
  );

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-60px)] bg-slate-100 overflow-hidden">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-18 right-6 z-50 px-4 py-2.5 rounded-xl shadow-xl text-xs font-bold text-white bg-emerald-600 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Screen Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <PackageCheck className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Stock Inward & GRN Counter
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Depot receiving, supplier invoice verification, batch tracking and atomic inventory entry.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>

          <button
            type="button"
            onClick={() => setShowNewGRNModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Goods Receipt Note (GRN)</span>
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="p-6 pb-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase">
              Confirmed Inward Value
            </span>
            <p className="text-2xl font-black text-slate-900 mt-1">
              {formatCurrency(totalInwardValue)}
            </p>
            <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
              Direct inventory addition
            </span>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase">
              Pending Draft GRNs
            </span>
            <p className="text-2xl font-black text-amber-600 mt-1">{pendingDraftsCount}</p>
            <span className="text-[11px] text-amber-700 font-medium mt-1 block">
              Waiting for supervisor approval
            </span>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase">
              Total Inward Units
            </span>
            <p className="text-2xl font-black text-blue-600 mt-1">
              {totalInwardUnits.toLocaleString('en-IN')} pcs
            </p>
            <span className="text-[11px] text-slate-500 font-medium mt-1 block">
              Received across all orders
            </span>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase">
              Damaged / Short Deliveries
            </span>
            <p className="text-2xl font-black text-rose-600 mt-1">
              {totalDamagedUnits.toLocaleString('en-IN')} pcs
            </p>
            <span className="text-[11px] text-rose-700 font-medium mt-1 block">
              Segregated from salable stock
            </span>
          </div>
        </div>
      </div>

      {/* Table & Controls Section */}
      <div className="flex-1 p-6 pt-2 overflow-hidden flex flex-col">
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 flex flex-col flex-1 overflow-hidden">
          {/* Search & Filter Toolbar */}
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md w-full">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by GRN Number, Supplier Name, Invoice No..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50 focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Status:</span>
              <div className="flex bg-slate-100 rounded-lg p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  All ({grns.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('DRAFT')}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    statusFilter === 'DRAFT' ? 'bg-white text-amber-800 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Drafts ({pendingDraftsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('CONFIRMED')}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    statusFilter === 'CONFIRMED' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Confirmed ({grns.length - pendingDraftsCount})
                </button>
              </div>
            </div>
          </div>

          {/* GRN Ledger Table */}
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-900 text-slate-200 uppercase font-bold sticky top-0">
                <tr>
                  <th className="py-3 px-4">GRN #</th>
                  <th className="py-3 px-4">Supplier & Company</th>
                  <th className="py-3 px-4">Invoice Ref</th>
                  <th className="py-3 px-4">Inward Date</th>
                  <th className="py-3 px-4 text-center">Items (Qty)</th>
                  <th className="py-3 px-4 text-right">Inward Value</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredGRNs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No Goods Receipt Notes found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredGRNs.map((g) => {
                    const totalQty = g.items.reduce((s, i) => s + i.receivedQty, 0);
                    const damagedQty = g.items.reduce((s, i) => s + (i.damagedQty || 0), 0);

                    return (
                      <tr key={g.id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-blue-600">{g.grnNumber}</td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900">{g.supplierName}</p>
                          <p className="text-[10px] text-slate-500 font-mono">By: {g.createdByName}</p>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-700">
                          <div>{g.invoiceNumber}</div>
                          <div className="text-[10px] text-slate-400">{g.invoiceDate}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {formatDateTime(g.receivedDate)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-bold text-slate-800">{g.items.length} SKUs</span>
                          <span className="block text-[10px] text-slate-500">
                            {totalQty} pcs {damagedQty > 0 && `(-${damagedQty} dmg)`}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono text-sm">
                          {formatCurrency(g.grandTotal)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              g.status === 'CONFIRMED'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}
                          >
                            {g.status === 'CONFIRMED' ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : (
                              <Clock className="w-3 h-3" />
                            )}
                            {g.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {g.status === 'DRAFT' && (
                              <button
                                type="button"
                                onClick={() => handleApproveDraft(g)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs transition-colors cursor-pointer"
                              >
                                Approve & Inward
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setViewingGRN(g)}
                              className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors title='View Voucher'"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* New GRN Modal */}
      {showNewGRNModal && (
        <NewGRNModal
          user={currentUser}
          onSuccess={(newGrn, wasConfirmed) => {
            setShowNewGRNModal(false);
            loadData();
            showToast(
              wasConfirmed
                ? `GRN ${newGrn.grnNumber} inwarded and stock updated successfully!`
                : `GRN ${newGrn.grnNumber} saved as draft!`
            );
            setViewingGRN(newGrn);
          }}
          onClose={() => setShowNewGRNModal(false)}
        />
      )}

      {/* View GRN Voucher Modal */}
      {viewingGRN && (
        <GRNReceiptSlip
          grn={viewingGRN}
          settings={settings}
          onClose={() => setViewingGRN(null)}
        />
      )}
    </div>
  );
};
