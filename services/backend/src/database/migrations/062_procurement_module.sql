-- ============================================================
-- Migration 062: Procurement Module
-- ============================================================

-- Suppliers / Vendors registry (dedicated to procurement)
CREATE TABLE IF NOT EXISTS proc_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  supplier_code VARCHAR(30),
  supplier_name VARCHAR(200) NOT NULL,
  business_registration VARCHAR(100),
  kra_pin VARCHAR(20),
  email VARCHAR(150),
  phone VARCHAR(30),
  address TEXT,
  category VARCHAR(80),         -- e.g. stationery, furniture, ICT, services
  bank_name VARCHAR(100),
  bank_account VARCHAR(50),
  bank_branch VARCHAR(100),
  payment_terms VARCHAR(80),    -- e.g. net30, net60
  rating NUMERIC(3,1) DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','blacklisted')),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_proc_suppliers_tenant ON proc_suppliers(tenant_id);

-- Supplier prequalification
CREATE TABLE IF NOT EXISTS proc_supplier_prequalification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  supplier_id UUID NOT NULL REFERENCES proc_suppliers(id) ON DELETE CASCADE,
  application_date DATE NOT NULL,
  category VARCHAR(80),
  evaluation_score NUMERIC(5,2),
  qualification_criteria TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','expired')),
  approved_by UUID,
  expiry_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_proc_preq_tenant ON proc_supplier_prequalification(tenant_id);

-- Purchase Requisitions
CREATE TABLE IF NOT EXISTS proc_purchase_requisitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  pr_number VARCHAR(30) UNIQUE,
  department VARCHAR(100) NOT NULL,
  requested_by UUID NOT NULL,
  request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  required_date DATE,
  urgency VARCHAR(20) DEFAULT 'medium' CHECK (urgency IN ('low','medium','high','emergency')),
  reason TEXT,
  status VARCHAR(30) DEFAULT 'draft' CHECK (status IN (
    'draft','submitted','pending_approval','approved','rejected',
    'converted_to_rfq','converted_to_po','cancelled'
  )),
  total_estimated_cost NUMERIC(14,2) DEFAULT 0,
  current_approver_role VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_proc_pr_tenant ON proc_purchase_requisitions(tenant_id);

-- PR line items
CREATE TABLE IF NOT EXISTS proc_pr_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  pr_id UUID NOT NULL REFERENCES proc_purchase_requisitions(id) ON DELETE CASCADE,
  item_name VARCHAR(200) NOT NULL,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 1,
  unit VARCHAR(30),
  estimated_unit_cost NUMERIC(14,2) DEFAULT 0,
  estimated_total NUMERIC(14,2) DEFAULT 0,
  specifications TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_proc_pr_items_tenant ON proc_pr_items(tenant_id);

-- Approval steps (trail)
CREATE TABLE IF NOT EXISTS proc_approval_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  reference_type VARCHAR(30) NOT NULL, -- 'pr', 'rfq', 'po', 'invoice', 'payment'
  reference_id UUID NOT NULL,
  step_number INT NOT NULL,
  approver_role VARCHAR(50),
  approver_id UUID,
  action VARCHAR(20) CHECK (action IN ('approved','rejected','delegated','commented')),
  comments TEXT,
  actioned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_proc_approval_tenant ON proc_approval_steps(tenant_id, reference_type, reference_id);

-- Request for Quotation (RFQ)
CREATE TABLE IF NOT EXISTS proc_rfqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  rfq_number VARCHAR(30) UNIQUE,
  pr_id UUID REFERENCES proc_purchase_requisitions(id),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  issue_date DATE DEFAULT CURRENT_DATE,
  deadline DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN (
    'draft','published','awaiting_quotes','quotes_received','closed','awarded','cancelled'
  )),
  evaluation_criteria TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_proc_rfq_tenant ON proc_rfqs(tenant_id);

-- Which suppliers received the RFQ
CREATE TABLE IF NOT EXISTS proc_rfq_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  rfq_id UUID NOT NULL REFERENCES proc_rfqs(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES proc_suppliers(id),
  sent_at TIMESTAMPTZ,
  responded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quotations submitted by suppliers
CREATE TABLE IF NOT EXISTS proc_quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  rfq_id UUID NOT NULL REFERENCES proc_rfqs(id),
  supplier_id UUID NOT NULL REFERENCES proc_suppliers(id),
  quotation_number VARCHAR(50),
  submission_date DATE DEFAULT CURRENT_DATE,
  validity_date DATE,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  delivery_days INT,
  warranty_terms TEXT,
  payment_terms VARCHAR(100),
  quality_score NUMERIC(3,1) DEFAULT 0,
  technical_score NUMERIC(3,1) DEFAULT 0,
  financial_score NUMERIC(3,1) DEFAULT 0,
  overall_score NUMERIC(3,1) DEFAULT 0,
  is_recommended BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'received' CHECK (status IN ('received','evaluated','awarded','rejected')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_proc_quot_tenant ON proc_quotations(tenant_id);

-- Quotation line items
CREATE TABLE IF NOT EXISTS proc_quotation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES proc_quotations(id) ON DELETE CASCADE,
  item_name VARCHAR(200) NOT NULL,
  quantity NUMERIC(12,2),
  unit VARCHAR(30),
  unit_price NUMERIC(14,2) DEFAULT 0,
  total_price NUMERIC(14,2) DEFAULT 0,
  specifications TEXT
);

-- Purchase Orders (procurement-dedicated, separate from legacy finance POs)
CREATE TABLE IF NOT EXISTS proc_purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  po_number VARCHAR(30) UNIQUE,
  pr_id UUID REFERENCES proc_purchase_requisitions(id),
  rfq_id UUID REFERENCES proc_rfqs(id),
  quotation_id UUID REFERENCES proc_quotations(id),
  supplier_id UUID NOT NULL REFERENCES proc_suppliers(id),
  po_date DATE DEFAULT CURRENT_DATE,
  delivery_date DATE,
  subtotal NUMERIC(14,2) DEFAULT 0,
  vat_amount NUMERIC(14,2) DEFAULT 0,
  total_amount NUMERIC(14,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'KES',
  payment_terms TEXT,
  delivery_terms TEXT,
  status VARCHAR(30) DEFAULT 'draft' CHECK (status IN (
    'draft','pending_approval','approved','sent','partially_delivered','completed','cancelled'
  )),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_proc_po_tenant ON proc_purchase_orders(tenant_id);

-- PO line items
CREATE TABLE IF NOT EXISTS proc_po_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  po_id UUID NOT NULL REFERENCES proc_purchase_orders(id) ON DELETE CASCADE,
  item_name VARCHAR(200) NOT NULL,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 1,
  unit VARCHAR(30),
  unit_price NUMERIC(14,2) DEFAULT 0,
  vat_rate NUMERIC(5,2) DEFAULT 0,
  total_price NUMERIC(14,2) DEFAULT 0,
  received_qty NUMERIC(12,2) DEFAULT 0,
  specifications TEXT
);

-- Contracts
CREATE TABLE IF NOT EXISTS proc_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  contract_number VARCHAR(50) UNIQUE,
  supplier_id UUID NOT NULL REFERENCES proc_suppliers(id),
  po_id UUID REFERENCES proc_purchase_orders(id),
  title VARCHAR(200) NOT NULL,
  contract_type VARCHAR(50) DEFAULT 'supply',  -- supply, framework, service
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  contract_value NUMERIC(14,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('draft','active','expired','terminated','renewed')),
  performance_score NUMERIC(3,1) DEFAULT 0,
  terms TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_proc_contracts_tenant ON proc_contracts(tenant_id);

-- Goods Receipt Notes
CREATE TABLE IF NOT EXISTS proc_grn (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  grn_number VARCHAR(30) UNIQUE,
  po_id UUID NOT NULL REFERENCES proc_purchase_orders(id),
  supplier_id UUID REFERENCES proc_suppliers(id),
  delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
  received_by UUID NOT NULL,
  delivery_note_number VARCHAR(80),
  inspection_status VARCHAR(20) DEFAULT 'pending' CHECK (inspection_status IN ('pending','passed','failed','partial')),
  remarks TEXT,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','completed','rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_proc_grn_tenant ON proc_grn(tenant_id);

-- GRN line items
CREATE TABLE IF NOT EXISTS proc_grn_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_id UUID NOT NULL REFERENCES proc_grn(id) ON DELETE CASCADE,
  po_item_id UUID REFERENCES proc_po_items(id),
  item_name VARCHAR(200) NOT NULL,
  ordered_qty NUMERIC(12,2),
  received_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
  rejected_qty NUMERIC(12,2) DEFAULT 0,
  unit VARCHAR(30),
  condition VARCHAR(20) DEFAULT 'good' CHECK (condition IN ('good','damaged','wrong_item')),
  remarks TEXT
);

-- Supplier Invoices
CREATE TABLE IF NOT EXISTS proc_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  invoice_number VARCHAR(80) NOT NULL,
  supplier_id UUID NOT NULL REFERENCES proc_suppliers(id),
  po_id UUID REFERENCES proc_purchase_orders(id),
  grn_id UUID REFERENCES proc_grn(id),
  invoice_date DATE NOT NULL,
  due_date DATE,
  subtotal NUMERIC(14,2) DEFAULT 0,
  vat_amount NUMERIC(14,2) DEFAULT 0,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(14,2) DEFAULT 0,
  balance NUMERIC(14,2) DEFAULT 0,
  three_way_match BOOLEAN DEFAULT FALSE,  -- PR + PO + GRN matched
  match_status VARCHAR(20) DEFAULT 'pending' CHECK (match_status IN ('pending','matched','discrepancy')),
  status VARCHAR(20) DEFAULT 'received' CHECK (status IN (
    'received','verified','approved','partially_paid','paid','rejected','overdue'
  )),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_proc_invoices_tenant ON proc_invoices(tenant_id);

-- Invoice line items
CREATE TABLE IF NOT EXISTS proc_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES proc_invoices(id) ON DELETE CASCADE,
  item_name VARCHAR(200) NOT NULL,
  quantity NUMERIC(12,2),
  unit_price NUMERIC(14,2),
  total_price NUMERIC(14,2),
  vat_rate NUMERIC(5,2) DEFAULT 0
);

-- Supplier Payments
CREATE TABLE IF NOT EXISTS proc_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  payment_voucher_number VARCHAR(50) UNIQUE,
  invoice_id UUID REFERENCES proc_invoices(id),
  supplier_id UUID NOT NULL REFERENCES proc_suppliers(id),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(14,2) NOT NULL,
  payment_method VARCHAR(30) DEFAULT 'bank_transfer' CHECK (payment_method IN (
    'bank_transfer','mpesa','cheque','cash','mobile_money'
  )),
  reference_number VARCHAR(100),
  bank_name VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','paid','rejected')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_proc_payments_tenant ON proc_payments(tenant_id);

-- Department Procurement Budgets
CREATE TABLE IF NOT EXISTS proc_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  department VARCHAR(100) NOT NULL,
  financial_year VARCHAR(20) NOT NULL,
  total_budget NUMERIC(14,2) NOT NULL DEFAULT 0,
  allocated NUMERIC(14,2) DEFAULT 0,
  committed NUMERIC(14,2) DEFAULT 0,  -- reserved via approved PRs/POs
  spent NUMERIC(14,2) DEFAULT 0,
  available NUMERIC(14,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('draft','active','closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_proc_budgets_tenant ON proc_budgets(tenant_id);

-- Procurement Plans
CREATE TABLE IF NOT EXISTS proc_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  plan_number VARCHAR(30),
  title VARCHAR(200) NOT NULL,
  plan_type VARCHAR(20) DEFAULT 'annual' CHECK (plan_type IN ('annual','quarterly','monthly')),
  financial_year VARCHAR(20),
  quarter INT CHECK (quarter BETWEEN 1 AND 4),
  month INT CHECK (month BETWEEN 1 AND 12),
  department VARCHAR(100),
  description TEXT,
  planned_amount NUMERIC(14,2) DEFAULT 0,
  actual_amount NUMERIC(14,2) DEFAULT 0,
  start_date DATE,
  end_date DATE,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','approved','in_progress','completed','cancelled')),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_proc_plans_tenant ON proc_plans(tenant_id);

-- Assets (registered through procurement)
CREATE TABLE IF NOT EXISTS proc_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  asset_tag VARCHAR(80) UNIQUE,
  asset_name VARCHAR(200) NOT NULL,
  category VARCHAR(80),        -- computers, furniture, vehicles, equipment
  po_id UUID REFERENCES proc_purchase_orders(id),
  supplier_id UUID REFERENCES proc_suppliers(id),
  purchase_date DATE,
  purchase_cost NUMERIC(14,2) DEFAULT 0,
  current_value NUMERIC(14,2) DEFAULT 0,
  depreciation_rate NUMERIC(5,2) DEFAULT 0,  -- % per year
  useful_life_years INT,
  location VARCHAR(150),
  assigned_to UUID,
  assigned_department VARCHAR(100),
  serial_number VARCHAR(100),
  barcode VARCHAR(100),
  condition VARCHAR(20) DEFAULT 'good' CHECK (condition IN ('new','good','fair','poor','disposed')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','maintenance','disposed','transferred')),
  warranty_expiry DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_proc_assets_tenant ON proc_assets(tenant_id);
