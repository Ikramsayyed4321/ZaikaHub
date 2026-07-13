import PDFDocument from 'pdfkit';
import { config } from '../config.js';
export function createBillPdf(invoice) {
    const doc = new PDFDocument({ margin: 48 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.fontSize(22).text(config.restaurant.name, { align: 'center' });
    doc.fontSize(10).text(config.restaurant.address, { align: 'center' });
    doc.text(`GST: ${config.restaurant.gstNumber}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(`Invoice: ${invoice.invoiceNumber}`);
    doc.fontSize(10).text(`Date: ${new Date().toLocaleString()}`);
    doc.text(`Table: ${invoice.tableNumber}`);
    doc.moveDown();
    doc.text('Item', 48, doc.y, { continued: true });
    doc.text('Qty', 280, doc.y, { continued: true });
    doc.text('Price', 360, doc.y, { align: 'right' });
    doc.moveTo(48, doc.y + 4).lineTo(560, doc.y + 4).stroke();
    doc.moveDown();
    for (const item of invoice.items) {
        doc.text(item.name, 48, doc.y, { continued: true });
        doc.text(String(item.quantity), 280, doc.y, { continued: true });
        doc.text(`Rs. ${(item.price * item.quantity).toFixed(2)}`, 360, doc.y, { align: 'right' });
    }
    doc.moveDown();
    doc.text(`Tax: Rs. ${invoice.taxAmount.toFixed(2)}`, { align: 'right' });
    doc.text(`Discount: Rs. ${invoice.discountAmount.toFixed(2)}`, { align: 'right' });
    doc.fontSize(14).text(`Grand Total: Rs. ${invoice.grandTotal.toFixed(2)}`, { align: 'right' });
    doc.fontSize(10).text(`Payment Method: ${invoice.paymentMethod || 'cash'}`, { align: 'right' });
    doc.moveDown();
    doc.rect(48, doc.y, 80, 80).stroke();
    doc.text('QR Code', 64, doc.y + 34);
    doc.end();
    return new Promise((resolve) => {
        doc.on('end', () => resolve(Buffer.concat(chunks)));
    });
}
