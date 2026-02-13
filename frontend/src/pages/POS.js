import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { productsAPI, customersAPI, invoicesAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Plus, Minus, Search, ShoppingCart, Trash2, CreditCard, Banknote, Receipt, Printer, Check } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const POS = () => {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [lastInvoice, setLastInvoice] = useState(null);
  const printRef = useRef();

  const isAr = language === 'ar';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, customersRes] = await Promise.all([
        productsAPI.getAll(),
        customersAPI.getAll()
      ]);
      setProducts(productsRes.data || []);
      setCustomers(customersRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const addToCart = (product) => {
    if (product.stock <= 0) {
      toast({ title: isAr ? 'تنبيه' : 'Warning', description: isAr ? 'المنتج غير متوفر' : 'Product out of stock', variant: 'destructive' });
      return;
    }
    const existing = cart.find(item => item._id === product._id);
    if (existing) {
      if (existing.quantity >= product.stock) {
        toast({ title: isAr ? 'تنبيه' : 'Warning', description: isAr ? 'الكمية المطلوبة غير متوفرة' : 'Requested quantity not available', variant: 'destructive' });
        return;
      }
      setCart(cart.map(item => 
        item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId, delta) => {
    setCart(cart.map(item => {
      if (item._id === productId) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return null;
        const product = products.find(p => p._id === productId);
        if (newQty > product.stock) {
          toast({ title: isAr ? 'تنبيه' : 'Warning', description: isAr ? 'الكمية غير متوفرة' : 'Quantity not available', variant: 'destructive' });
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(Boolean));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item._id !== productId));
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + (item.salePrice * item.quantity), 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast({ title: isAr ? 'خطأ' : 'Error', description: isAr ? 'السلة فارغة' : 'Cart is empty', variant: 'destructive' });
      return;
    }

    try {
      const invoiceData = {
        customerId: selectedCustomer?._id || null,
        customerName: selectedCustomer ? (isAr ? selectedCustomer.name : selectedCustomer.nameEn) : (isAr ? 'عميل نقدي' : 'Cash Customer'),
        items: cart.map(item => ({
          productId: item._id,
          productName: isAr ? item.name : item.nameEn,
          quantity: item.quantity,
          price: item.salePrice,
          total: item.salePrice * item.quantity
        })),
        subtotal: calculateTotal(),
        tax: 0,
        discount: 0,
        total: calculateTotal(),
        paymentMethod: paymentMethod,
        status: 'paid'
      };

      const response = await invoicesAPI.create(invoiceData);
      
      // حفظ الفاتورة لعرضها
      setLastInvoice({
        ...invoiceData,
        invoiceNumber: response.data?.invoiceNumber || 'INV-' + Date.now(),
        createdAt: new Date().toISOString()
      });

      toast({ title: isAr ? 'تم بنجاح' : 'Success', description: isAr ? 'تم إنشاء الفاتورة بنجاح' : 'Invoice created successfully' });
      
      // فتح dialog الفاتورة
      setInvoiceDialogOpen(true);
      
      setCart([]);
      setSelectedCustomer(null);
      fetchData();
    } catch (error) {
      console.error('Checkout error:', error);
      toast({ title: isAr ? 'خطأ' : 'Error', description: isAr ? 'فشل إنشاء الفاتورة' : 'Failed to create invoice', variant: 'destructive' });
    }
  };

  const printInvoice = () => {
    const printContent = printRef.current;
    if (!printContent || !lastInvoice) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${isAr ? 'فاتورة' : 'Invoice'} - ${lastInvoice.invoiceNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; direction: ${isAr ? 'rtl' : 'ltr'}; max-width: 300px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px dashed #333; padding-bottom: 15px; }
            .header h1 { margin: 0; font-size: 20px; }
            .header p { margin: 5px 0; color: #666; font-size: 12px; }
            .info { margin-bottom: 15px; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { padding: 5px; text-align: ${isAr ? 'right' : 'left'}; border-bottom: 1px dashed #ddd; }
            th { font-weight: bold; }
            .total { font-size: 16px; font-weight: bold; text-align: center; margin-top: 15px; padding-top: 10px; border-top: 2px dashed #333; }
            .footer { text-align: center; margin-top: 20px; font-size: 11px; color: #666; }
            @media print { body { print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <div class="footer">
            <p>${isAr ? 'شكراً لتعاملكم معنا' : 'Thank you for your business'}</p>
            <p>---</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const filteredProducts = products.filter((product) =>
    (product.name && product.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (product.nameEn && product.nameEn.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (product.barcode && product.barcode.includes(searchTerm))
  );

  return (
    <div className="flex h-[calc(100vh-120px)] gap-4" data-testid="pos-page">
      {/* Products Section */}
      <div className="flex-1 flex flex-col">
        <div className="mb-4">
          <h1 className="text-2xl font-bold mb-3">{t('pos')}</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input 
              placeholder={isAr ? 'بحث بالاسم أو الباركود...' : 'Search by name or barcode...'} 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="pl-10" 
              data-testid="pos-search"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.map((product) => (
              <Card 
                key={product._id} 
                className={`cursor-pointer hover:shadow-lg transition-all ${product.stock <= 0 ? 'opacity-50' : ''}`}
                onClick={() => addToCart(product)}
                data-testid={`product-${product._id}`}
              >
                <CardContent className="p-3">
                  <h3 className="font-semibold text-sm truncate">{isAr ? product.name : product.nameEn || product.name}</h3>
                  <p className="text-xs text-gray-500">{product.sku}</p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="font-bold text-primary">${product.salePrice}</span>
                    <span className={`text-xs px-2 py-1 rounded ${product.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {product.stock}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Section */}
      <div className="w-96 bg-white border rounded-lg flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              {isAr ? 'السلة' : 'Cart'}
            </h2>
            <span className="bg-primary text-white px-2 py-1 rounded-full text-sm">{cart.length}</span>
          </div>
          
          <Dialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full mt-3" size="sm" data-testid="select-customer-btn">
                {selectedCustomer 
                  ? (isAr ? selectedCustomer.name : selectedCustomer.nameEn)
                  : (isAr ? 'اختر عميل (اختياري)' : 'Select Customer (optional)')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{isAr ? 'اختيار عميل' : 'Select Customer'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                <Button variant="ghost" className="w-full justify-start" onClick={() => { setSelectedCustomer(null); setCustomerDialogOpen(false); }}>
                  {isAr ? 'عميل نقدي (بدون تسجيل)' : 'Cash Customer (no registration)'}
                </Button>
                {customers.map(customer => (
                  <Button key={customer._id} variant="ghost" className="w-full justify-start" onClick={() => { setSelectedCustomer(customer); setCustomerDialogOpen(false); }}>
                    {isAr ? customer.name : customer.nameEn || customer.name} - {customer.phone}
                  </Button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>{isAr ? 'السلة فارغة' : 'Cart is empty'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item._id} className="flex items-center gap-2 p-2 bg-gray-50 rounded" data-testid={`cart-item-${item._id}`}>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{isAr ? item.name : item.nameEn || item.name}</p>
                    <p className="text-xs text-gray-500">${item.salePrice} × {item.quantity}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item._id, -1)}>
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-8 text-center text-sm">{item.quantity}</span>
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item._id, 1)}>
                      <Plus className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => removeFromCart(item._id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t space-y-3">
          <div className="flex justify-between text-lg font-bold">
            <span>{isAr ? 'الإجمالي' : 'Total'}:</span>
            <span className="text-primary">${calculateTotal().toLocaleString()}</span>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant={paymentMethod === 'cash' ? 'default' : 'outline'} 
              className="flex-1" 
              size="sm"
              onClick={() => setPaymentMethod('cash')}
            >
              <Banknote className="w-4 h-4 mr-1" />
              {isAr ? 'نقداً' : 'Cash'}
            </Button>
            <Button 
              variant={paymentMethod === 'card' ? 'default' : 'outline'} 
              className="flex-1" 
              size="sm"
              onClick={() => setPaymentMethod('card')}
            >
              <CreditCard className="w-4 h-4 mr-1" />
              {isAr ? 'بطاقة' : 'Card'}
            </Button>
          </div>

          <Button 
            className="w-full" 
            size="lg" 
            onClick={handleCheckout} 
            disabled={cart.length === 0}
            data-testid="checkout-btn"
          >
            <Receipt className="w-5 h-5 mr-2" />
            {isAr ? 'إتمام البيع' : 'Complete Sale'}
          </Button>
        </div>
      </div>

      {/* Invoice Print Dialog */}
      <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <Check className="w-5 h-5" />
              {isAr ? 'تمت العملية بنجاح!' : 'Transaction Complete!'}
            </DialogTitle>
          </DialogHeader>
          
          {lastInvoice && (
            <>
              <div ref={printRef}>
                <div className="header text-center border-b-2 border-dashed pb-4 mb-4">
                  <h1 className="text-xl font-bold">{isAr ? 'فاتورة مبيعات' : 'Sales Invoice'}</h1>
                  <p className="text-gray-600 font-mono">{lastInvoice.invoiceNumber}</p>
                  <p className="text-sm text-gray-500">{new Date(lastInvoice.createdAt).toLocaleString(isAr ? 'ar-SA' : 'en-US')}</p>
                </div>

                <div className="info mb-4 text-sm">
                  <p><strong>{isAr ? 'العميل:' : 'Customer:'}</strong> {lastInvoice.customerName}</p>
                  <p><strong>{isAr ? 'الدفع:' : 'Payment:'}</strong> {lastInvoice.paymentMethod === 'cash' ? (isAr ? 'نقداً' : 'Cash') : (isAr ? 'بطاقة' : 'Card')}</p>
                </div>

                <table className="w-full text-sm mb-4">
                  <thead>
                    <tr className="border-b">
                      <th className="text-right py-1">{isAr ? 'المنتج' : 'Product'}</th>
                      <th className="text-center py-1">{isAr ? 'الكمية' : 'Qty'}</th>
                      <th className="text-center py-1">{isAr ? 'السعر' : 'Price'}</th>
                      <th className="text-center py-1">{isAr ? 'المجموع' : 'Total'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lastInvoice.items?.map((item, index) => (
                      <tr key={index} className="border-b border-dashed">
                        <td className="py-1">{item.productName}</td>
                        <td className="text-center py-1">{item.quantity}</td>
                        <td className="text-center py-1">${item.price}</td>
                        <td className="text-center py-1">${item.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="total text-center border-t-2 border-dashed pt-3">
                  <p className="text-2xl font-bold">{isAr ? 'الإجمالي:' : 'Total:'} ${lastInvoice.total?.toLocaleString()}</p>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button onClick={printInvoice} className="flex-1">
                  <Printer className="w-4 h-4 mr-2" />{isAr ? 'طباعة الفاتورة' : 'Print Invoice'}
                </Button>
                <Button variant="outline" onClick={() => setInvoiceDialogOpen(false)} className="flex-1">
                  {isAr ? 'إغلاق' : 'Close'}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default POS;
