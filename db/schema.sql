-- ============================================================================
-- URBAN MART CRM & SUPERMARKET MANAGEMENT SYSTEM
-- AUTHORITATIVE POSTGRESQL PRODUCTION DATABASE SCHEMA
-- Branch: Ghansoli Hub / Sector 8, Navi Mumbai
-- Target Database: PostgreSQL 14+
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. STORES & CONFIGURATION
-- ----------------------------------------------------------------------------
CREATE TABLE stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_name VARCHAR(150) NOT NULL DEFAULT 'URBAN MART SUPERMARKET',
    branch_name VARCHAR(100) NOT NULL DEFAULT 'Ghansoli Hub / Sector 8',
    tagline VARCHAR(200) DEFAULT 'Fresh Groceries • Best Value • Daily Savings',
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL DEFAULT 'Navi Mumbai',
    state VARCHAR(100) NOT NULL DEFAULT 'Maharashtra',
    pincode VARCHAR(20) NOT NULL DEFAULT '400701',
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    gstin VARCHAR(20) NOT NULL,
    fssai_licence VARCHAR(50) NOT NULL,
    receipt_footer TEXT DEFAULT 'Thank You For Shopping at Urban Mart! Returns accepted within 48h with original bill.',
    printer_paper_width VARCHAR(10) DEFAULT '80mm' CHECK (printer_paper_width IN ('80mm', '58mm')),
    auto_print_receipt BOOLEAN DEFAULT true,
    sound_alerts BOOLEAN DEFAULT true,
    currency_symbol VARCHAR(10) DEFAULT '₹',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 2. USERS, ROLES & SESSIONS
-- ----------------------------------------------------------------------------
CREATE TYPE user_role_enum AS ENUM ('admin', 'cashier', 'grn');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role user_role_enum NOT NULL,
    counter_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);

-- ----------------------------------------------------------------------------
-- 3. PRODUCT CATEGORIES & UNITS
-- ----------------------------------------------------------------------------
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    default_tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (default_tax_rate >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 4. PRODUCTS & BARCODE MASTER
-- ----------------------------------------------------------------------------
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(60) UNIQUE NOT NULL,
    primary_barcode VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE RESTRICT,
    brand VARCHAR(100) NOT NULL DEFAULT 'Urban Mart',
    uom VARCHAR(20) NOT NULL DEFAULT 'PACK' CHECK (uom IN ('PCS', 'KG', 'GM', 'LITER', 'ML', 'PACK', 'BOTTLE')),
    hsn_code VARCHAR(30) NOT NULL,
    purchase_rate NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (purchase_rate >= 0),
    mrp NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (mrp >= 0),
    selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (selling_price >= 0),
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (tax_rate IN (0, 5, 12, 18, 28)),
    current_stock NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    min_stock_alert NUMERIC(12, 3) NOT NULL DEFAULT 10.000,
    max_stock_level NUMERIC(12, 3) NOT NULL DEFAULT 100.000,
    batch_number VARCHAR(60),
    expiry_date DATE,
    pack_size VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_barcode ON products(primary_barcode);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_current_stock ON products(current_stock);

-- Multi-barcode lookup table (supports multiple packaging barcodes per product)
CREATE TABLE product_barcodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    barcode VARCHAR(60) UNIQUE NOT NULL,
    description VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 5. SUPPLIERS & AP CREDIT
-- ----------------------------------------------------------------------------
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(150) NOT NULL,
    contact_person VARCHAR(100) NOT NULL,
    gstin VARCHAR(20) UNIQUE NOT NULL,
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(100),
    address TEXT NOT NULL,
    payment_terms VARCHAR(100) DEFAULT '15 Days Net Credit',
    outstanding_balance NUMERIC(14, 2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 6. CUSTOMERS & LOYALTY CRM
-- ----------------------------------------------------------------------------
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(100),
    address TEXT,
    loyalty_points INTEGER DEFAULT 0 CHECK (loyalty_points >= 0),
    total_spent NUMERIC(14, 2) DEFAULT 0.00,
    customer_type VARCHAR(30) DEFAULT 'Regular' CHECK (customer_type IN ('Regular', 'Wholesale', 'Staff')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customers_phone ON customers(phone);

-- ----------------------------------------------------------------------------
-- 7. CASHIER SHIFTS & DRAWER RECONCILIATION
-- ----------------------------------------------------------------------------
CREATE TABLE cashier_shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cashier_id UUID NOT NULL REFERENCES users(id),
    counter_name VARCHAR(100) NOT NULL,
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP WITH TIME ZONE,
    opening_float NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_cash_sales NUMERIC(12, 2) DEFAULT 0.00,
    total_upi_sales NUMERIC(12, 2) DEFAULT 0.00,
    total_card_sales NUMERIC(12, 2) DEFAULT 0.00,
    total_bills_count INTEGER DEFAULT 0,
    closing_declared_cash NUMERIC(12, 2),
    expected_cash NUMERIC(12, 2),
    cash_difference NUMERIC(12, 2),
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
    notes TEXT
);

-- ----------------------------------------------------------------------------
-- 8. GOODS RECEIPT NOTE (GRN) & INWARD WORKFLOW
-- ----------------------------------------------------------------------------
CREATE TYPE grn_status_enum AS ENUM ('DRAFT', 'VERIFIED', 'CONFIRMED', 'CANCELLED');

CREATE TABLE goods_receipt_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grn_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    supplier_invoice_number VARCHAR(100) NOT NULL,
    invoice_date DATE NOT NULL,
    received_date DATE NOT NULL,
    sub_total NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_tax NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    round_off NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    grand_total NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    status grn_status_enum NOT NULL DEFAULT 'DRAFT',
    created_by_user_id UUID NOT NULL REFERENCES users(id),
    counter_name VARCHAR(100) NOT NULL,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    confirmed_by_user_id UUID REFERENCES users(id),
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_supplier_invoice UNIQUE(supplier_id, supplier_invoice_number)
);

CREATE TABLE grn_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grn_id UUID NOT NULL REFERENCES goods_receipt_notes(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    product_name VARCHAR(200) NOT NULL,
    barcode VARCHAR(60) NOT NULL,
    batch_number VARCHAR(60),
    expiry_date DATE,
    ordered_qty NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    received_qty NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    damaged_qty NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    purchase_rate NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    mrp NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    line_total NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    notes TEXT
);

CREATE INDEX idx_grn_items_grn ON grn_items(grn_id);

-- ----------------------------------------------------------------------------
-- 9. SALES INVOICES & POS BILLING
-- ----------------------------------------------------------------------------
CREATE TYPE invoice_status_enum AS ENUM ('COMPLETED', 'CANCELLED', 'RETURNED', 'PARTIALLY_RETURNED');
CREATE TYPE payment_method_enum AS ENUM ('CASH', 'UPI', 'CARD', 'SPLIT');

CREATE TABLE sale_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_number VARCHAR(60) UNIQUE NOT NULL,
    shift_id UUID REFERENCES cashier_shifts(id),
    cashier_id UUID NOT NULL REFERENCES users(id),
    counter_number VARCHAR(100) NOT NULL,
    customer_id UUID REFERENCES customers(id),
    customer_name VARCHAR(100) NOT NULL DEFAULT 'Walk-in Customer',
    customer_phone VARCHAR(20),
    sub_total NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_savings NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    bill_discount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    cgst_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    sgst_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_tax NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    round_off NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    grand_total NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    payment_method payment_method_enum NOT NULL DEFAULT 'CASH',
    cash_amount NUMERIC(14, 2) DEFAULT 0.00,
    upi_amount NUMERIC(14, 2) DEFAULT 0.00,
    card_amount NUMERIC(14, 2) DEFAULT 0.00,
    upi_ref VARCHAR(100),
    card_last4 VARCHAR(10),
    tendered_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    change_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    loyalty_points_earned INTEGER DEFAULT 0,
    loyalty_points_redeemed INTEGER DEFAULT 0,
    status invoice_status_enum NOT NULL DEFAULT 'COMPLETED',
    print_count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sale_invoices_bill_number ON sale_invoices(bill_number);
CREATE INDEX idx_sale_invoices_created_at ON sale_invoices(created_at);

CREATE TABLE sale_invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES sale_invoices(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    product_name VARCHAR(200) NOT NULL,
    barcode VARCHAR(60) NOT NULL,
    batch_number VARCHAR(60),
    hsn_code VARCHAR(30),
    mrp NUMERIC(12, 2) NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL,
    quantity NUMERIC(12, 3) NOT NULL,
    discount_per_unit NUMERIC(12, 2) DEFAULT 0.00,
    tax_rate NUMERIC(5, 2) NOT NULL,
    taxable_amount NUMERIC(12, 2) NOT NULL,
    cgst_amount NUMERIC(12, 2) NOT NULL,
    sgst_amount NUMERIC(12, 2) NOT NULL,
    total_amount NUMERIC(14, 2) NOT NULL
);

CREATE INDEX idx_sale_invoice_items_invoice ON sale_invoice_items(invoice_id);

-- ----------------------------------------------------------------------------
-- 10. REAL-TIME STOCK LEDGER (IMMUTABLE AUDIT TRAIL)
-- ----------------------------------------------------------------------------
CREATE TYPE stock_movement_type_enum AS ENUM (
    'INWARD_GRN',
    'POS_SALE',
    'SALES_RETURN',
    'PURCHASE_RETURN',
    'DAMAGE_ADJUSTMENT',
    'AUDIT_CORRECTION'
);

CREATE TABLE stock_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    product_id UUID NOT NULL REFERENCES products(id),
    product_name VARCHAR(200) NOT NULL,
    barcode VARCHAR(60) NOT NULL,
    movement_type stock_movement_type_enum NOT NULL,
    reference_no VARCHAR(100) NOT NULL,
    qty_changed NUMERIC(12, 3) NOT NULL, -- Positive for in, negative for out
    opening_stock NUMERIC(12, 3) NOT NULL,
    closing_stock NUMERIC(12, 3) NOT NULL,
    unit_rate NUMERIC(12, 2) NOT NULL,
    performed_by_name VARCHAR(100) NOT NULL,
    counter VARCHAR(100) NOT NULL,
    notes TEXT NOT NULL
);

CREATE INDEX idx_stock_ledger_product ON stock_ledger(product_id);
CREATE INDEX idx_stock_ledger_timestamp ON stock_ledger(timestamp);
CREATE INDEX idx_stock_ledger_movement ON stock_ledger(movement_type);

-- ----------------------------------------------------------------------------
-- 11. SALES RETURNS & PURCHASE RETURNS
-- ----------------------------------------------------------------------------
CREATE TABLE sales_returns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    return_number VARCHAR(60) UNIQUE NOT NULL,
    original_bill_number VARCHAR(60) NOT NULL,
    invoice_id UUID NOT NULL REFERENCES sale_invoices(id),
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20),
    total_refund_amount NUMERIC(12, 2) NOT NULL,
    refund_method VARCHAR(30) NOT NULL DEFAULT 'CASH',
    processed_by VARCHAR(100) NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    restored_to_stock BOOLEAN NOT NULL DEFAULT true,
    notes TEXT
);

CREATE TABLE sales_return_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    return_id UUID NOT NULL REFERENCES sales_returns(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    product_name VARCHAR(200) NOT NULL,
    barcode VARCHAR(60) NOT NULL,
    returned_qty NUMERIC(12, 3) NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL,
    refund_amount NUMERIC(12, 2) NOT NULL,
    condition VARCHAR(30) NOT NULL CHECK (condition IN ('RESALABLE', 'DAMAGED')),
    reason TEXT NOT NULL
);

-- ----------------------------------------------------------------------------
-- 12. AUDIT LOGS
-- ----------------------------------------------------------------------------
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id UUID REFERENCES users(id),
    user_name VARCHAR(100) NOT NULL,
    role VARCHAR(30) NOT NULL,
    action VARCHAR(60) NOT NULL,
    module VARCHAR(60) NOT NULL,
    details TEXT NOT NULL,
    ip_address VARCHAR(50) DEFAULT '127.0.0.1'
);

CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
