import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Hook to generate professional invoices with tenant-specific styling
 */
export const useInvoiceGenerator = () => {
  const { getInvoiceTemplate, tenant } = useAuth();
  const { language } = useLanguage();
  const isAr = language === 'ar';

  // Convert hex to RGB
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 26, g: 86, b: 219 };
  };

  const generateInvoicePDF = (invoice, items, options = {}) => {
    const template = getInvoiceTemplate();
    const doc = new jsPDF();
    const { showWatermark = false, watermarkText = '' } = options;
    
    // Colors from template
    const primaryColor = template.primaryColor || '#1a56db';
    const secondaryColor = template.secondaryColor || '#6b7280';
    const primary = hexToRgb(primaryColor);
    const secondary = hexToRgb(secondaryColor);
    
    let yPos = 15;
    
    // Watermark (if enabled)
    if (showWatermark && watermarkText) {
      doc.setFontSize(60);
      doc.setTextColor(200, 200, 200);
      doc.text(watermarkText, 105, 150, { align: 'center', angle: 45 });
    }
    
    // Header background
    doc.setFillColor(primary.r, primary.g, primary.b);
    doc.rect(0, 0, 210, 40, 'F');
    
    // Logo in header
    if (template.showLogo && template.logo) {
      try {
        doc.addImage(template.logo, 'PNG', 15, 5, 30, 30);
      } catch (e) {
        console.log('Could not add logo');
      }
    }
    
    // Company name in header (white text)
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    const companyName = isAr ? (template.companyName || tenant?.name) : (template.companyNameEn || tenant?.nameEn);
    doc.text(companyName || 'Company Name', 195, 15, { align: 'right' });
    
    // Company details in header (light text)
    doc.setFontSize(9);
    doc.setTextColor(220, 220, 220);
    
    let headerY = 22;
    const address = isAr ? template.address : template.addressEn;
    if (address) {
      doc.text(address, 195, headerY, { align: 'right' });
      headerY += 5;
    }
    
    if (template.phone) {
      doc.text(`${isAr ? 'هاتف:' : 'Tel:'} ${template.phone}`, 195, headerY, { align: 'right' });
      headerY += 5;
    }
    
    if (template.email) {
      doc.text(template.email, 195, headerY, { align: 'right' });
    }
    
    yPos = 50;
    
    // Invoice title box
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(60, yPos - 5, 90, 25, 3, 3, 'F');
    
    doc.setFontSize(18);
    doc.setTextColor(primary.r, primary.g, primary.b);
    doc.text(isAr ? 'فاتورة ضريبية' : 'TAX INVOICE', 105, yPos + 5, { align: 'center' });
    
    doc.setFontSize(11);
    doc.setTextColor(secondary.r, secondary.g, secondary.b);
    doc.text(`#${invoice.invoiceNumber || invoice._id?.slice(-8) || 'INV-0001'}`, 105, yPos + 14, { align: 'center' });
    
    yPos += 30;
    
    // Invoice details (2 columns)
    doc.setFontSize(10);
    
    // Left column - Invoice info
    doc.setTextColor(secondary.r, secondary.g, secondary.b);
    doc.text(isAr ? 'تاريخ الفاتورة:' : 'Invoice Date:', 15, yPos);
    doc.setTextColor(0, 0, 0);
    doc.text(new Date(invoice.createdAt || Date.now()).toLocaleDateString(isAr ? 'ar-SA' : 'en-US'), 55, yPos);
    
    yPos += 6;
    doc.setTextColor(secondary.r, secondary.g, secondary.b);
    doc.text(isAr ? 'طريقة الدفع:' : 'Payment:', 15, yPos);
    doc.setTextColor(0, 0, 0);
    doc.text(invoice.paymentMethod || (isAr ? 'نقدي' : 'Cash'), 55, yPos);
    
    // Right column - Customer info
    yPos -= 6;
    if (invoice.customer) {
      const customerName = typeof invoice.customer === 'object' 
        ? (isAr ? invoice.customer.name : (invoice.customer.nameEn || invoice.customer.name))
        : invoice.customer;
      
      doc.setTextColor(secondary.r, secondary.g, secondary.b);
      doc.text(isAr ? 'العميل:' : 'Customer:', 120, yPos);
      doc.setTextColor(0, 0, 0);
      doc.text(customerName || '-', 150, yPos);
      
      if (invoice.customer?.phone) {
        yPos += 6;
        doc.setTextColor(secondary.r, secondary.g, secondary.b);
        doc.text(isAr ? 'الهاتف:' : 'Phone:', 120, yPos);
        doc.setTextColor(0, 0, 0);
        doc.text(invoice.customer.phone, 150, yPos);
      }
    }
    
    yPos += 15;
    
    // Tax number (if enabled)
    if (template.showTaxNumber && template.taxNumber) {
      doc.setFillColor(255, 250, 230);
      doc.roundedRect(15, yPos - 4, 180, 12, 2, 2, 'F');
      doc.setFontSize(9);
      doc.setTextColor(secondary.r, secondary.g, secondary.b);
      doc.text(`${isAr ? 'الرقم الضريبي:' : 'Tax Registration No:'} ${template.taxNumber}`, 105, yPos + 3, { align: 'center' });
      yPos += 15;
    }
    
    // Items table
    const tableHead = [[
      isAr ? '#' : '#',
      isAr ? 'الصنف' : 'Item',
      isAr ? 'الكمية' : 'Qty',
      isAr ? 'السعر' : 'Unit Price',
      isAr ? 'الإجمالي' : 'Total'
    ]];
    
    const tableBody = (items || []).map((item, idx) => [
      idx + 1,
      isAr ? item.name : (item.nameEn || item.name),
      item.quantity || 1,
      `$${(item.price || item.salePrice || 0).toFixed(2)}`,
      `$${((item.quantity || 1) * (item.price || item.salePrice || 0)).toFixed(2)}`
    ]);
    
    doc.autoTable({
      startY: yPos,
      head: tableHead,
      body: tableBody,
      theme: 'striped',
      headStyles: {
        fillColor: [primary.r, primary.g, primary.b],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
        cellPadding: 4
      },
      bodyStyles: {
        halign: 'center',
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { halign: isAr ? 'right' : 'left', cellWidth: 70 },
        2: { cellWidth: 25 },
        3: { cellWidth: 35 },
        4: { cellWidth: 35 }
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250]
      },
      margin: { left: 15, right: 15 }
    });
    
    yPos = doc.lastAutoTable.finalY + 10;
    
    // Totals box
    const totalsWidth = 80;
    const totalsX = 195 - totalsWidth;
    
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(totalsX - 5, yPos - 3, totalsWidth + 10, 45, 3, 3, 'F');
    
    const subtotal = invoice.subtotal || items?.reduce((sum, item) => sum + ((item.quantity || 1) * (item.price || item.salePrice || 0)), 0) || 0;
    const taxRate = invoice.taxRate || 0.15;
    const tax = invoice.tax ?? (subtotal * taxRate);
    const discount = invoice.discount || 0;
    const total = invoice.total ?? (subtotal + tax - discount);
    
    doc.setFontSize(10);
    
    // Subtotal
    doc.setTextColor(secondary.r, secondary.g, secondary.b);
    doc.text(isAr ? 'المجموع الفرعي:' : 'Subtotal:', totalsX, yPos + 5);
    doc.setTextColor(0, 0, 0);
    doc.text(`$${subtotal.toFixed(2)}`, 190, yPos + 5, { align: 'right' });
    
    // Tax
    yPos += 8;
    doc.setTextColor(secondary.r, secondary.g, secondary.b);
    doc.text(`${isAr ? 'الضريبة' : 'VAT'} (${(taxRate * 100).toFixed(0)}%):`, totalsX, yPos + 5);
    doc.setTextColor(0, 0, 0);
    doc.text(`$${tax.toFixed(2)}`, 190, yPos + 5, { align: 'right' });
    
    // Discount (if any)
    if (discount > 0) {
      yPos += 8;
      doc.setTextColor(secondary.r, secondary.g, secondary.b);
      doc.text(isAr ? 'الخصم:' : 'Discount:', totalsX, yPos + 5);
      doc.setTextColor(220, 53, 69);
      doc.text(`-$${discount.toFixed(2)}`, 190, yPos + 5, { align: 'right' });
    }
    
    // Total
    yPos += 12;
    doc.setDrawColor(primary.r, primary.g, primary.b);
    doc.setLineWidth(0.5);
    doc.line(totalsX - 3, yPos, 193, yPos);
    
    doc.setFontSize(14);
    doc.setTextColor(primary.r, primary.g, primary.b);
    doc.text(isAr ? 'الإجمالي:' : 'Total:', totalsX, yPos + 10);
    doc.text(`$${total.toFixed(2)}`, 190, yPos + 10, { align: 'right' });
    
    // Footer
    const footerY = 270;
    
    // Footer line
    doc.setDrawColor(secondary.r, secondary.g, secondary.b);
    doc.setLineWidth(0.3);
    doc.line(15, footerY - 5, 195, footerY - 5);
    
    // Footer text
    if (template.footer || template.footerEn) {
      const footer = isAr ? template.footer : template.footerEn;
      doc.setFontSize(8);
      doc.setTextColor(secondary.r, secondary.g, secondary.b);
      doc.text(footer, 105, footerY, { align: 'center' });
    }
    
    // Thank you message
    doc.setFontSize(10);
    doc.setTextColor(primary.r, primary.g, primary.b);
    doc.text(isAr ? 'شكراً لتعاملكم معنا' : 'Thank you for your business!', 105, footerY + 8, { align: 'center' });
    
    // Page number
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`${isAr ? 'صفحة' : 'Page'} 1`, 105, 290, { align: 'center' });
    
    return doc;
  };

  const printInvoice = (invoice, items, options = {}) => {
    const doc = generateInvoicePDF(invoice, items, options);
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  };

  const downloadInvoice = (invoice, items, filename, options = {}) => {
    const doc = generateInvoicePDF(invoice, items, options);
    doc.save(filename || `invoice-${invoice.invoiceNumber || invoice._id?.slice(-8) || 'INV'}.pdf`);
  };

  const previewInvoice = (invoice, items, options = {}) => {
    const doc = generateInvoicePDF(invoice, items, options);
    window.open(doc.output('bloburl'), '_blank');
  };

  return {
    generateInvoicePDF,
    printInvoice,
    downloadInvoice,
    previewInvoice
  };
};

export default useInvoiceGenerator;
