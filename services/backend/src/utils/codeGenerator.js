import QRCode from 'qrcode';

/**
 * Shared QR/barcode generation for physically-trackable assets (hostel inventory
 * units today; reusable later by School Store, Kitchen, and Library).
 */

export async function generateQrDataUrl(value) {
  return QRCode.toDataURL(value, { margin: 1, width: 240 });
}

export function generateBarcodeValue(prefix = 'ITM') {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`;
}
