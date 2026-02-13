import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { productsAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Plus, Trash2, Save, UserPlus } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CreatePurchase = () => {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState([]);
  const [tax, setTax] = useState(0);
  const [saving, setSaving] = useState(false);
  const [addSupplierOpen, setAddSupplierOpen] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: '', nameEn: '', phone: '', email: '', address: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [suppliersRes, productsRes] = await Promise.all([
        axios.get(`${API}/suppliers`),
        productsAPI.getAll()
      ]);
      setSuppliers(suppliersRes.data);
      setProducts(productsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleAddSupplier = async () => {
    try {
      const response = await axios.post(`${API}/suppliers`, newSupplier);
      setSuppliers([...suppliers, response.data]);
      setSelectedSupplier(response.data._id);
      setAddSupplierOpen(false);
      setNewSupplier({ name: '', nameEn: '', phone: '', email: '', address: '' });
      toast({ title: language === 'ar' ? 'تم الإضافة' : 'Added', description: language === 'ar' ? 'تم إضافة المورد بنجاح' : 'Supplier added successfully' });
    } catch (error) {
      toast({ title: language === 'ar' ? 'خطأ' : 'Error', description: language === 'ar' ? 'فشل إضافة المورد' : 'Failed to add supplier', variant: 'destructive' });
    }
  };

  const addItem = () => {
    setItems([...items, { productId: '', productName: '', productNameEn: '', sku: '', quantity: 1, price: 0, total: 0, isNew: false }]);
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
        newItems[index].productName = product.name;
        newItems[index].productNameEn = product.nameEn;
        newItems[index].sku = product.sku;
        newItems[index].price = product.costPrice;
        newItems[index].isNew = false;
      }
    }
    
    if (field === 'quantity' || field === 'price' || field === 'productId') {
      newItems[index].total = newItems[index].quantity * newItems[index].price;
    }
    
    setItems(newItems);
  };

  const calculateSubtotal = () => items.reduce((sum, item) => sum + item.total, 0);
  const calculateTax = () => (calculateSubtotal() * tax) / 100;
  const calculateTotal = () => calculateSubtotal() + calculateTax();

  const handleSave = async () => {
    if (!selectedSupplier) {
      toast({ title: language === 'ar' ? 'خطأ' : 'Error', description: language === 'ar' ? 'الرجاء اختيار مورد' : 'Please select a supplier', variant: 'destructive' });
      return;
    }

    if (items.length === 0) {
      toast({ title: language === 'ar' ? 'خطأ' : 'Error', description: language === 'ar' ? 'الرجاء إضافة منتجات' : 'Please add products', variant: 'destructive' });
      return;
    }

    try {
      setSaving(true);
      const supplier = suppliers.find(s => s._id === selectedSupplier);
      
      const purchaseData = {
        supplierId: selectedSupplier,
        supplierName: language === 'ar' ? supplier.name : supplier.nameEn,
        date: new Date(purchaseDate),
        items: items.map(item => ({
          productId: item.productId || 'new',
          productName: item.productName,
          productNameEn: item.productNameEn,
          sku: item.sku,
          quantity: parseInt(item.quantity),
          price: parseFloat(item.price),
          total: parseFloat(item.total),
          isNew: item.isNew || !item.productId
        })),
        subtotal: calculateSubtotal(),
        tax: calculateTax(),
        total: calculateTotal(),
        status: 'received'
      };

      await axios.post(`${API}/purchases`, purchaseData);
      
      toast({ 
        title: language === 'ar' ? 'تم الحفظ' : 'Saved', 
        description: language === 'ar' ? 'تم إضافة المشتريات وتحديث المخزون' : 'Purchase added and inventory updated' 
      });
      
      navigate('/purchases');
    } catch (error) {
      console.error('Error creating purchase:', error);
      toast({ title: language === 'ar' ? 'خطأ' : 'Error', description: language === 'ar' ? 'فشل إضافة المشتريات' : 'Failed to create purchase', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-3xl font-bold'>{t('createPurchase')}</h1>
        <Button onClick={handleSave} disabled={saving} className='flex items-center gap-2'>
          <Save className='w-4 h-4' />
          {saving ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : t('save')}
        </Button>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        <div className='lg:col-span-2 space-y-6'>
          <Card>
            <CardHeader><CardTitle>{language === 'ar' ? 'معلومات المشتريات' : 'Purchase Information'}</CardTitle></CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <Label>{t('supplier')}</Label>
                  <div className='flex gap-2 mt-1'>
                    <select value={selectedSupplier} onChange={(e) => setSelectedSupplier(e.target.value)} className='flex-1 p-2 border rounded-lg'>
                      <option value=''>{language === 'ar' ? 'اختر مورد' : 'Select Supplier'}</option>
                      {suppliers.map((supplier) => (<option key={supplier._id} value={supplier._id}>{language === 'ar' ? supplier.name : supplier.nameEn}</option>))}
                    </select>
                    <Dialog open={addSupplierOpen} onOpenChange={setAddSupplierOpen}>
                      <DialogTrigger asChild><Button type='button' size='icon' variant='outline'><UserPlus className='w-4 h-4' /></Button></DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>{language === 'ar' ? 'إضافة مورد جديد' : 'Add New Supplier'}</DialogTitle></DialogHeader>
                        <div className='space-y-3'>
                          <div><Label>{language === 'ar' ? 'الاسم (عربي)' : 'Name (Arabic)'}</Label><Input value={newSupplier.name} onChange={(e) => setNewSupplier({...newSupplier, name: e.target.value})} /></div>
                          <div><Label>{language === 'ar' ? 'الاسم (إنجليزي)' : 'Name (English)'}</Label><Input value={newSupplier.nameEn} onChange={(e) => setNewSupplier({...newSupplier, nameEn: e.target.value})} /></div>
                          <div><Label>{language === 'ar' ? 'الهاتف' : 'Phone'}</Label><Input value={newSupplier.phone} onChange={(e) => setNewSupplier({...newSupplier, phone: e.target.value})} /></div>
                          <div><Label>{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</Label><Input value={newSupplier.email} onChange={(e) => setNewSupplier({...newSupplier, email: e.target.value})} /></div>
                          <div><Label>{language === 'ar' ? 'العنوان' : 'Address'}</Label><Input value={newSupplier.address} onChange={(e) => setNewSupplier({...newSupplier, address: e.target.value})} /></div>
                          <Button onClick={handleAddSupplier} className='w-full'>{language === 'ar' ? 'إضافة' : 'Add'}</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
                <div><Label>{t('date')}</Label><Input type='date' value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className='mt-1' /></div>
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
                  <div key={index} className='grid grid-cols-12 gap-2 items-end bg-gray-50 p-3 rounded'>
                    <div className='col-span-4'>
                      <Label className='text-xs'>{t('productName')}</Label>
                      <select value={item.productId} onChange={(e) => updateItem(index, 'productId', e.target.value)} className='w-full p-2 border rounded text-sm'>
                        <option value=''>{language === 'ar' ? 'اختر أو أدخل جديد' : 'Select or add new'}</option>
                        {products.map((product) => (<option key={product._id} value={product._id}>{language === 'ar' ? product.name : product.nameEn}</option>))}
                      </select>
                      {!item.productId && (
                        <div className='mt-2 space-y-1'>
                          <Input placeholder={language === 'ar' ? 'اسم المنتج (عربي)' : 'Product Name (AR)'} value={item.productName} onChange={(e) => updateItem(index, 'productName', e.target.value)} className='text-xs' />
                          <Input placeholder={language === 'ar' ? 'اسم المنتج (إنجليزي)' : 'Product Name (EN)'} value={item.productNameEn} onChange={(e) => updateItem(index, 'productNameEn', e.target.value)} className='text-xs' />
                          <Input placeholder='SKU' value={item.sku} onChange={(e) => updateItem(index, 'sku', e.target.value)} className='text-xs' />
                        </div>
                      )}
                    </div>
                    <div className='col-span-2'><Label className='text-xs'>{t('quantity')}</Label><Input type='number' value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} className='text-sm' /></div>
                    <div className='col-span-2'><Label className='text-xs'>{t('price')}</Label><Input type='number' value={item.price} onChange={(e) => updateItem(index, 'price', e.target.value)} className='text-sm' /></div>
                    <div className='col-span-3'><Label className='text-xs'>{t('total')}</Label><Input type='number' value={item.total} readOnly className='text-sm bg-gray-100' /></div>
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
              </div>
              <div className='pt-4 border-t'><div className='flex justify-between items-center'><span className='text-lg font-bold'>{t('grandTotal')}:</span><span className='text-2xl font-bold text-blue-600'>${calculateTotal().toFixed(2)}</span></div></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CreatePurchase;