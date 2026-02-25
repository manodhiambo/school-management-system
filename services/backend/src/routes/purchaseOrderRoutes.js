import express from 'express';
import purchaseOrderController from '../controllers/purchaseOrderController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { tenantContext, requireActiveTenant } from '../middleware/tenantMiddleware.js';

const router = express.Router();

router.use(authenticate);
router.use(tenantContext);
router.use(requireActiveTenant);
router.use(authorize(['admin', 'finance_officer']));

router.get('/', purchaseOrderController.getPurchaseOrders);
router.post('/', purchaseOrderController.createPurchaseOrder);
router.put('/:id', purchaseOrderController.updatePurchaseOrder);
router.delete('/:id', purchaseOrderController.deletePurchaseOrder);
router.put('/:id/approve', purchaseOrderController.approvePurchaseOrder);

export default router;
