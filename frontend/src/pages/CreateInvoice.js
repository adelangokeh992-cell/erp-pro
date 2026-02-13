import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { customersAPI, productsAPI, invoicesAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Plus, Trash2, Save, UserPlus } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import LimitWarning, { useLimitCheck } from '../components/LimitWarning';

const CreateInvoice = () => {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { checkLimit } = useLimitCheck();
  const navigate = useNavigate();
  
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [guestCustomerName, setGuestCustomerName] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState([]);
  const [tax, setTax] = useState(10);
  const [discount, setDiscount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', nameEn: '', phone: '', email: '', address: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [customersRes, productsRes] = await Promise.all([customersAPI.getAll(), productsAPI.getAll()]);
      setCustomers(customersRes.data);
      setProducts(productsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleAddCustomer = async () => {
    try {
      const response = await customersAPI.create(newCustomer);
      setCustomers([...customers, response.data]);
      setSelectedCustomer(response.data._id);
      setAddCustomerOpen(false);
      setNewCustomer({ name: '', nameEn: '', phone: '', email: '', address: '' });
      toast({ title: language === 'ar' ? 'تم الإضافة' : 'Added', description: language === 'ar' ? 'تم إضافة العميل بنجاح' : 'Customer added successfully' });
    } catch (error) {
      toast({ title: language === 'ar' ? 'خطأ' : 'Error', description: language === 'ar' ? 'فشل إضافة العميل' : 'Failed to add customer', variant: 'destructive' });
    }
  };

  const addItem = () => {
    setItems([...items, { productId: '', productName: '', quantity: 1, price: 0, total: 0 }]);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    
    if (field === 'productId') {
      const product = products.find(p => p._id === value);
      if (product) {
        newItems[index].productName = language === 'ar' ? product.name : product.nameEn;
        newItems[index].price = product.salePrice;
      }
    }
    
    if (field === 'quantity' || field === 'price' || field === 'productId') {
      newItems[index].total = newItems[index].quantity * newItems[index].price;
    }
    
    setItems(newItems);
  };

  const calculateSubtotal = () => items.reduce((sum, item) => sum + item.total, 0);
  const calculateTax = () => (calculateSubtotal() * tax) / 100;
  const calculateTotal = () => calculateSubtotal() + calculateTax() - discount;

  const handleSave = async () => {
    // Check invoice limit
    const limitCheck = checkLimit('invoices');
    if (!limitCheck.canAdd) {
      toast({ title: language === 'ar' ? 'خطأ' : 'Error', description: language === 'ar' ? 'تم الوصول للحد الأقصى من الفواتير هذا الشهر' : 'Maximum monthly invoice limit reached', variant: 'destructive' });
      return;
    }

    if (!selectedCustomer && !guestCustomerName) {
      toast({ title: language === 'ar' ? 'خطأ' : 'Error', description: language === 'ar' ? 'الرجاء اختيار عميل أو إدخال اسم' : 'Please select customer or enter name', variant: 'destructive' });
      return;
    }

    if (items.length === 0) {
      toast({ title: language === 'ar' ? 'خطأ' : 'Error', description: language === 'ar' ? 'الرجاء إضافة منتجات' : 'Please add products', variant: 'destructive' });
      return;
    }

    try {
      setSaving(true);
      const customerName = selectedCustomer 
        ? (language === 'ar' ? customers.find(c => c._id === selectedCustomer)?.name : customers.find(c => c._id === selectedCustomer)?.nameEn)
        : guestCustomerName;
      
      const invoiceData = {
        customerId: selectedCustomer || 'guest',
        customerName: customerName,
        date: new Date(invoiceDate),
        dueDate: new Date(invoiceDate),
        items: items.map(item => ({ productId: item.productId, productName: item.productName, quantity: parseInt(item.quantity), price: parseFloat(item.price), total: parseFloat(item.total) })),
        subtotal: calculateSubtotal(),
        tax: calculateTax(),
        discount: parseFloat(discount),
        total: calculateTotal(),
        status: 'unpaid'
      };

      await invoicesAPI.create(invoiceData);
      toast({ title: language === 'ar' ? 'تم الحفظ' : 'Saved', description: language === 'ar' ? 'تم إنشاء الفاتورة بنجاح' : 'Invoice created successfully' });
      navigate('/invoices');
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast({ title: language === 'ar' ? 'خطأ' : 'Error', description: language === 'ar' ? 'فشل إنشاء الفاتورة' : 'Failed to create invoice', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className='space-y-6'>
      <LimitWarning type="invoices" />
      <div className='flex items-center justify-between'>
        <h1 className='text-3xl font-bold'>{t('createInvoice')}</h1>
        <Button onClick={handleSave} disabled={saving} className='flex items-center gap-2'>
          <Save className='w-4 h-4' />
          {saving ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : t('save')}
        </Button>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        <div className='lg:col-span-2 space-y-6'>
          <Card>
            <CardHeader><CardTitle>{language === 'ar' ? 'معلومات الفاتورة' : 'Invoice Information'}</CardTitle></CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <Label>{t('customer')}</Label>
                  <div className='flex gap-2 mt-1'>
                    <select value={selectedCustomer} onChange={(e) => { setSelectedCustomer(e.target.value); setGuestCustomerName(''); }} className='flex-1 p-2 border rounded-lg'>
                      <option value=''>{language === 'ar' ? 'اختر عميل' : 'Select Customer'}</option>
                      {customers.map((customer) => (<option key={customer._id} value={customer._id}>{language === 'ar' ? customer.name : customer.nameEn}</option>))}
                    </select>
                    <Dialog open={addCustomerOpen} onOpenChange={setAddCustomerOpen}>
                      <DialogTrigger asChild><Button type='button' size='icon' variant='outline'><UserPlus className='w-4 h-4' /></Button></DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>{language === 'ar' ? 'إضافة عميل جديد' : 'Add New Customer'}</DialogTitle></DialogHeader>
                        <div className='space-y-3'>
                          <div><Label>{language === 'ar' ? 'الاسم (عربي)' : 'Name (Arabic)'}</Label><Input value={newCustomer.name} onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})} /></div>
                          <div><Label>{language === 'ar' ? 'الاسم (إنجليزي)' : 'Name (English)'}</Label><Input value={newCustomer.nameEn} onChange={(e) => setNewCustomer({...newCustomer, nameEn: e.target.value})} /></div>
                          <div><Label>{language === 'ar' ? 'الهاتف' : 'Phone'}</Label><Input value={newCustomer.phone} onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})} /></div>
                          <div><Label>{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</Label><Input value={newCustomer.email} onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})} /></div>
                          <div><Label>{language === 'ar' ? 'العنوان' : 'Address'}</Label><Input value={newCustomer.address} onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})} /></div>
                          <Button onClick={handleAddCustomer} className='w-full'>{language === 'ar' ? 'إضافة' : 'Add'}</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className='mt-2'><Label className='text-xs'>{language === 'ar' ? 'أو أدخل اسم مباشرة' : 'Or enter name directly'}</Label><Input placeholder={language === 'ar' ? 'اسم العميل' : 'Customer Name'} value={guestCustomerName} onChange={(e) => { setGuestCustomerName(e.target.value); setSelectedCustomer(''); }} disabled={!!selectedCustomer} /></div>
                </div>
                <div><Label>{t('invoiceDate')}</Label><Input type='date' value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className='mt-1' /></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <CardTitle>{t('items')}</CardTitle>
                <Button onClick={addItem} size='sm' className='flex items-center gap-2'><Plus className='w-4 h-4' />{language === 'ar' ? 'إضافة منتج' : 'Add Product'}</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className='space-y-3'>
                {items.map((item, index) => (
                  <div key={index} className='grid grid-cols-12 gap-2 items-end'>
                    <div className='col-span-5'><Label className='text-xs'>{t('productName')}</Label><select value={item.productId} onChange={(e) => updateItem(index, 'productId', e.target.value)} className='w-full p-2 border rounded text-sm'><option value=''>{language === 'ar' ? 'اختر منتج' : 'Select'}</option>{products.map((product) => (<option key={product._id} value={product._id}>{language === 'ar' ? product.name : product.nameEn}</option>))}</select></div>
                    <div className='col-span-2'><Label className='text-xs'>{t('quantity')}</Label><Input type='number' value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} className='text-sm' /></div>
                    <div className='col-span-2'><Label className='text-xs'>{t('price')}</Label><Input type='number' value={item.price} onChange={(e) => updateItem(index, 'price', e.target.value)} className='text-sm' /></div>
                    <div className='col-span-2'><Label className='text-xs'>{t('total')}</Label><Input type='number' value={item.total} readOnly className='text-sm bg-gray-50' /></div>
                    <div className='col-span-1'><Button variant='ghost' size='icon' onClick={() => removeItem(index)} className='text-red-600'><Trash2 className='w-4 h-4' /></Button></div>
                  </div>
                ))}
                {items.length === 0 && <p className='text-center text-gray-500 py-4'>{language === 'ar' ? 'لا توجد منتجات' : 'No products added'}</p>}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className='sticky top-6'>
            <CardHeader><CardTitle>{language === 'ar' ? 'الملخص' : 'Summary'}</CardTitle></CardHeader>
            <CardContent className='space-y-4'>
              <div className='space-y-3'>
                <div className='flex justify-between'><span className='text-gray-600'>{t('subtotal')}:</span><span className='font-semibold'>${calculateSubtotal().toFixed(2)}</span></div>
                <div><div className='flex justify-between mb-1'><span className='text-gray-600'>{t('tax')}:</span><span className='font-semibold'>${calculateTax().toFixed(2)}</span></div><Input type='number' value={tax} onChange={(e) => setTax(parseFloat(e.target.value))} placeholder='Tax %' className='text-sm' /></div>
                <div><div className='flex justify-between mb-1'><span className='text-gray-600'>{t('discount')}:</span><span className='font-semibold text-red-600'>-${discount}</span></div><Input type='number' value={discount} onChange={(e) => setDiscount(parseFloat(e.target.value))} placeholder='Discount' className='text-sm' /></div>
              </div>
              <div className='pt-4 border-t'><div className='flex justify-between items-center'><span className='text-lg font-bold'>{t('grandTotal')}:</span><span className='text-2xl font-bold text-blue-600'>${calculateTotal().toFixed(2)}</span></div></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CreateInvoice;