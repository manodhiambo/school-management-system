import pool from '../config/database.js';

// Helper to generate PO number
async function generatePONumber() {
  const result = await pool.query(`
    SELECT po_number FROM purchase_orders
    WHERE po_number LIKE 'PO-%'
    ORDER BY po_number DESC
    LIMIT 1
  `);

  if (result.rows.length === 0) {
    return 'PO-00001';
  }

  const lastNumber = result.rows[0].po_number;
  const numPart = parseInt(lastNumber.replace('PO-', '')) + 1;
  return `PO-${String(numPart).padStart(5, '0')}`;
}

class PurchaseOrderController {
  async getPurchaseOrders(req, res) {
    try {
      const { status } = req.query;
      
      let query = `
        SELECT 
          po.*,
          v.vendor_name,
          u.email as created_by_name
        FROM purchase_orders po
        LEFT JOIN vendors v ON po.vendor_id = v.id
        LEFT JOIN users u ON po.created_by = u.id
        WHERE 1=1
      `;
      
      const params = [];
      if (status) {
        query += ` AND po.status = $1`;
        params.push(status);
      }
      
      query += ` ORDER BY po.created_at DESC`;
      
      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      res.status(500).json({ error: 'Failed to fetch purchase orders' });
    }
  }

  async createPurchaseOrder(req, res) {
    try {
      const {
        vendor_id,
        po_date,
        delivery_date,
        subtotal,
        vat_amount,
        total_amount,
        terms_conditions,
        notes
      } = req.body;

      const po_number = await generatePONumber();

      const result = await pool.query(`
        INSERT INTO purchase_orders (
          po_number, vendor_id, po_date, delivery_date,
          subtotal, vat_amount, total_amount, terms_conditions, notes,
          status, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft', $10, NOW(), NOW())
        RETURNING *
      `, [
        po_number, vendor_id, po_date, delivery_date,
        subtotal, vat_amount, total_amount, terms_conditions, notes,
        req.user.id
      ]);

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating purchase order:', error);
      res.status(500).json({ error: 'Failed to create purchase order' });
    }
  }

  async updatePurchaseOrder(req, res) {
    try {
      const { id } = req.params;
      const data = req.body;

      const result = await pool.query(`
        UPDATE purchase_orders
        SET
          vendor_id = COALESCE($1, vendor_id),
          po_date = COALESCE($2, po_date),
          delivery_date = COALESCE($3, delivery_date),
          subtotal = COALESCE($4, subtotal),
          vat_amount = COALESCE($5, vat_amount),
          total_amount = COALESCE($6, total_amount),
          terms_conditions = COALESCE($7, terms_conditions),
          notes = COALESCE($8, notes),
          updated_at = NOW()
        WHERE id = $9
        RETURNING *
      `, [
        data.vendor_id, data.po_date, data.delivery_date,
        data.subtotal, data.vat_amount, data.total_amount,
        data.terms_conditions, data.notes, id
      ]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Purchase order not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating purchase order:', error);
      res.status(500).json({ error: 'Failed to update purchase order' });
    }
  }

  async deletePurchaseOrder(req, res) {
    try {
      const { id } = req.params;

      const result = await pool.query(`
        DELETE FROM purchase_orders
        WHERE id = $1 AND status = 'draft'
        RETURNING *
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Purchase order not found or cannot be deleted' });
      }

      res.json({ message: 'Purchase order deleted successfully' });
    } catch (error) {
      console.error('Error deleting purchase order:', error);
      res.status(500).json({ error: 'Failed to delete purchase order' });
    }
  }

  async approvePurchaseOrder(req, res) {
    try {
      const { id } = req.params;

      const result = await pool.query(`
        UPDATE purchase_orders
        SET status = 'approved', updated_at = NOW()
        WHERE id = $1 AND status = 'draft'
        RETURNING *
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Purchase order not found or already processed' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error approving purchase order:', error);
      res.status(500).json({ error: 'Failed to approve purchase order' });
    }
  }
}

export default new PurchaseOrderController();
