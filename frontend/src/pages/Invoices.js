import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { invoicesAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Plus, Search, Eye, Printer, FileText, Calendar, User, CreditCard, Banknote } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { useToast } from '../hooks/use-toast';
import LimitWarning, { useLimitCheck } from '../components/LimitWarning';

const Invoices = () => {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { checkLimit } = useLimitCheck();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const printRef = useRef();

  const isAr = language === 'ar';

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await invoicesAPI.getAll();
      setInvoices(response.data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast({ title: isAr ? 'خطأ' : 'Error', description: isAr ? 'فشل تحميل الفواتير' : 'Failed to load invoices', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const viewInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setDetailsOpen(true);
  };

  const printInvoice = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${isAr ? 'فاتورة' : 'Invoice'} - ${selectedInvoice?.invoiceNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; direction: ${isAr ? 'rtl' : 'ltr'}; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .header h1 { margin: 0; font-size: 24px; }
            .header p { margin: 5px 0; color: #666; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 20px; }
            .info-box { flex: 1; padding: 10px; }
            .info-box h3 { margin: 0 0 10px 0; font-size: 14px; color: #666; }
            .info-box p { margin: 5px 0; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: ${isAr ? 'right' : 'left'}; }
            th { background: #f5f5f5; }
            .total-row { font-weight: bold; font-size: 18px; }
            .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
            @media print { body { print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <div class="footer">
            <p>${isAr ? 'شكراً لتعاملكم معنا' : 'Thank you for your business'}</p>
            <p>${new Date().toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    if (isAr) {
      switch (status) {
        case 'paid': return 'مدفوعة';
        case 'pending': return 'قيد الانتظار';
        case 'cancelled': return 'ملغاة';
        case 'draft': return 'مسودة';
        default: return status;
      }
    }
    return status?.charAt(0).toUpperCase() + status?.slice(1);
  };

  const getPaymentIcon = (method) => {
    return method === 'cash' ? <Banknote className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />;
  };

  const filteredInvoices = invoices.filter((invoice) =>
    invoice.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xl">{isAr ? 'جاري التحميل...' : 'Loading...'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="invoices-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('invoices')}</h1>
          <p className="text-gray-600 mt-1">{isAr ? `إجمالي: ${invoices.length}` : `Total: ${invoices.length}`}</p>
        </div>
        <Button onClick={() => navigate('/pos')} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />{t('createInvoice')}
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input 
          placeholder={isAr ? 'بحث برقم الفاتورة أو اسم العميل...' : 'Search by invoice number or customer name...'} 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
          className="pl-10" 
        />
      </div>

      {filteredInvoices.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={invoices.length === 0 ? (isAr ? 'لا توجد فواتير' : 'No invoices yet') : (isAr ? 'لا توجد نتائج' : 'No results found')}
          description={invoices.length === 0 ? (isAr ? 'أنشئ أول فاتورة من نقطة البيع' : 'Create your first invoice from POS') : (isAr ? 'جرب تغيير كلمات البحث' : 'Try changing your search terms')}
          actionLabel={invoices.length === 0 ? (isAr ? 'إنشاء فاتورة' : 'Create Invoice') : undefined}
          onAction={invoices.length === 0 ? () => navigate('/pos') : undefined}
        />
      ) : (
        <div className="space-y-4">
          {filteredInvoices.map((invoice) => (
            <Card key={invoice._id} className="hover:shadow-lg transition-all" data-testid={`invoice-${invoice._id}`}>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-lg">{invoice.invoiceNumber}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs ${getStatusColor(invoice.status)}`}>
                        {getStatusText(invoice.status)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {invoice.customerName || (isAr ? 'عميل نقدي' : 'Cash Customer')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(invoice.createdAt || invoice.date).toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}
                      </span>
                      <span className="flex items-center gap-1">
                        {getPaymentIcon(invoice.paymentMethod)}
                        {invoice.paymentMethod === 'cash' ? (isAr ? 'نقداً' : 'Cash') : (isAr ? 'بطاقة' : 'Card')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">{isAr ? 'الإجمالي' : 'Total'}</p>
                      <p className="text-2xl font-bold text-primary">${(invoice.total || 0).toLocaleString()}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => viewInvoice(invoice)}>
                      <Eye className="w-4 h-4 mr-1" />{isAr ? 'عرض' : 'View'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Invoice Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{isAr ? 'تفاصيل الفاتورة' : 'Invoice Details'}</span>
              <Button onClick={printInvoice} variant="outline" size="sm">
                <Printer className="w-4 h-4 mr-1" />{isAr ? 'طباعة' : 'Print'}
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          {selectedInvoice && (
            <div ref={printRef}>
              <div className="header text-center border-b-2 pb-4 mb-4">
                <h1 className="text-2xl font-bold">{isAr ? 'فاتورة مبيعات' : 'Sales Invoice'}</h1>
                <p className="text-gray-600">{selectedInvoice.invoiceNumber}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h3 className="text-sm text-gray-500 mb-2">{isAr ? 'معلومات العميل' : 'Customer Info'}</h3>
                  <p className="font-medium">{selectedInvoice.customerName || (isAr ? 'عميل نقدي' : 'Cash Customer')}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h3 className="text-sm text-gray-500 mb-2">{isAr ? 'تاريخ الفاتورة' : 'Invoice Date'}</h3>
                  <p className="font-medium">{new Date(selectedInvoice.createdAt || selectedInvoice.date).toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}</p>
                </div>
              </div>

              <table className="w-full border-collapse mb-6">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2 text-right">{isAr ? 'المنتج' : 'Product'}</th>
                    <th className="border p-2 text-center">{isAr ? 'الكمية' : 'Qty'}</th>
                    <th className="border p-2 text-center">{isAr ? 'السعر' : 'Price'}</th>
                    <th className="border p-2 text-center">{isAr ? 'المجموع' : 'Total'}</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoice.items?.map((item, index) => (
                    <tr key={index}>
                      <td className="border p-2">{item.productName || item.name}</td>
                      <td className="border p-2 text-center">{item.quantity}</td>
                      <td className="border p-2 text-center">${item.price || item.unitPrice}</td>
                      <td className="border p-2 text-center">${item.total || (item.quantity * (item.price || item.unitPrice))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>{isAr ? 'المجموع الفرعي' : 'Subtotal'}</span>
                  <span>${(selectedInvoice.subtotal || selectedInvoice.total || 0).toLocaleString()}</span>
                </div>
                {selectedInvoice.tax > 0 && (
                  <div className="flex justify-between">
                    <span>{isAr ? 'الضريبة' : 'Tax'}</span>
                    <span>${(selectedInvoice.tax || 0).toLocaleString()}</span>
                  </div>
                )}
                {selectedInvoice.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>{isAr ? 'الخصم' : 'Discount'}</span>
                    <span>-${(selectedInvoice.discount || 0).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold pt-2 border-t">
                  <span>{isAr ? 'الإجمالي' : 'Total'}</span>
                  <span className="text-primary">${(selectedInvoice.total || 0).toLocaleString()}</span>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                {getPaymentIcon(selectedInvoice.paymentMethod)}
                <span>{isAr ? 'طريقة الدفع:' : 'Payment:'} {selectedInvoice.paymentMethod === 'cash' ? (isAr ? 'نقداً' : 'Cash') : (isAr ? 'بطاقة' : 'Card')}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Invoices;
