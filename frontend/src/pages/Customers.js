import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { customersAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Plus, Search, Mail, Phone, MapPin, Edit, Save, X, User } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { useToast } from '../hooks/use-toast';
import CustomFieldsRenderer from '../components/CustomFieldsRenderer';

const Customers = () => {
  const { t, language } = useLanguage();
  const { getCustomFields } = useAuth();
  const { toast } = useToast();
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [formData, setFormData] = useState({ 
    name: '', nameEn: '', phone: '', email: '', address: '', type: 'individual', balance: 0 
  });
  const [customFieldValues, setCustomFieldValues] = useState({});

  const isAr = language === 'ar';

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await customersAPI.getAll();
      setCustomers(response.data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', nameEn: '', phone: '', email: '', address: '', type: 'individual', balance: 0 });
    setCustomFieldValues({});
  };

  const handleAdd = async () => {
    if (!formData.name || !formData.phone) {
      toast({ title: isAr ? 'خطأ' : 'Error', description: isAr ? 'الاسم ورقم الهاتف مطلوبان' : 'Name and phone are required', variant: 'destructive' });
      return;
    }
    try {
      const customerData = { ...formData, customFields: customFieldValues };
      await customersAPI.create(customerData);
      await fetchCustomers();
      setAddDialogOpen(false);
      resetForm();
      toast({ title: isAr ? 'تم الإضافة' : 'Added', description: isAr ? 'تم إضافة العميل بنجاح' : 'Customer added successfully' });
    } catch (error) {
      toast({ title: isAr ? 'خطأ' : 'Error', description: isAr ? 'فشل الإضافة' : 'Failed to add', variant: 'destructive' });
    }
  };

  const handleEdit = (customer) => {
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name || '',
      nameEn: customer.nameEn || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      type: customer.type || 'individual',
      balance: customer.balance || 0
    });
    setCustomFieldValues(customer.customFields || {});
    setEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedCustomer) return;
    try {
      const customerData = { ...formData, customFields: customFieldValues };
      await customersAPI.update(selectedCustomer._id, customerData);
      await fetchCustomers();
      setEditDialogOpen(false);
      setSelectedCustomer(null);
      resetForm();
      toast({ title: isAr ? 'تم التحديث' : 'Updated', description: isAr ? 'تم تحديث العميل بنجاح' : 'Customer updated successfully' });
    } catch (error) {
      toast({ title: isAr ? 'خطأ' : 'Error', description: isAr ? 'فشل التحديث' : 'Failed to update', variant: 'destructive' });
    }
  };

  const filteredCustomers = customers.filter((customer) =>
    (customer.name && customer.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (customer.nameEn && customer.nameEn.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (customer.phone && customer.phone.includes(searchTerm))
  );

  const CustomerForm = () => (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>{isAr ? 'الاسم (عربي) *' : 'Name (Arabic) *'}</Label>
          <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
        </div>
        <div>
          <Label>{isAr ? 'الاسم (إنجليزي)' : 'Name (English)'}</Label>
          <Input value={formData.nameEn} onChange={(e) => setFormData({...formData, nameEn: e.target.value})} />
        </div>
      </div>
      <div>
        <Label>{isAr ? 'رقم الهاتف *' : 'Phone *'}</Label>
        <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
      </div>
      <div>
        <Label>{t('email')}</Label>
        <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
      </div>
      <div>
        <Label>{t('address')}</Label>
        <Input value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>{isAr ? 'النوع' : 'Type'}</Label>
          <select 
            value={formData.type} 
            onChange={(e) => setFormData({...formData, type: e.target.value})} 
            className="w-full p-2 border rounded-lg"
          >
            <option value="individual">{isAr ? 'فرد' : 'Individual'}</option>
            <option value="company">{isAr ? 'شركة' : 'Company'}</option>
          </select>
        </div>
        <div>
          <Label>{isAr ? 'الرصيد' : 'Balance'}</Label>
          <Input 
            type="number" 
            step="0.01"
            value={formData.balance} 
            onChange={(e) => setFormData({...formData, balance: parseFloat(e.target.value) || 0})} 
          />
        </div>
      </div>
      
      {/* Custom Fields */}
      <CustomFieldsRenderer 
        entityType="customers" 
        values={customFieldValues} 
        onChange={setCustomFieldValues} 
      />
    </div>
  );

  return (
    <div className="space-y-6" data-testid="customers-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('customers')}</h1>
          <p className="text-gray-600 mt-1">{isAr ? `إجمالي: ${customers.length}` : `Total: ${customers.length}`}</p>
        </div>
        
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2" onClick={() => resetForm()}>
              <Plus className="w-4 h-4" />{t('addCustomer')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t('addCustomer')}</DialogTitle></DialogHeader>
            <CustomerForm />
            <div className="flex gap-2 mt-4">
              <Button onClick={handleAdd} className="flex-1">
                <Save className="w-4 h-4 mr-2" />{isAr ? 'حفظ' : 'Save'}
              </Button>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                <X className="w-4 h-4 mr-2" />{isAr ? 'إلغاء' : 'Cancel'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input placeholder={t('search')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
      </div>

      {filteredCustomers.length === 0 ? (
        <EmptyState
          icon={User}
          title={customers.length === 0 ? (isAr ? 'لا يوجد عملاء' : 'No customers yet') : (isAr ? 'لا توجد نتائج' : 'No results found')}
          description={customers.length === 0 ? (isAr ? 'أضف أول عميل لبدء إدارة علاقات العملاء' : 'Add your first customer to start managing relationships') : (isAr ? 'جرب تغيير كلمات البحث' : 'Try changing your search terms')}
          actionLabel={customers.length === 0 ? (isAr ? 'أضف عميل' : 'Add Customer') : undefined}
          onAction={customers.length === 0 ? () => setAddDialogOpen(true) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCustomers.map((customer) => (
            <Card key={customer._id} className="hover:shadow-xl transition-all">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-lg">{isAr ? customer.name : customer.nameEn || customer.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded ${customer.type === 'company' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                      {customer.type === 'company' ? (isAr ? 'شركة' : 'Company') : (isAr ? 'فرد' : 'Individual')}
                    </span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(customer)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-2 mt-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <span>{customer.phone}</span>
                  </div>
                  {customer.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <span>{customer.email}</span>
                    </div>
                  )}
                  {customer.address && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span>{customer.address}</span>
                    </div>
                  )}
                  {customer.balance !== undefined && customer.balance !== 0 && (
                    <div className="pt-2 border-t mt-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">{isAr ? 'الرصيد:' : 'Balance:'}</span>
                        <span className={`font-bold ${customer.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${Math.abs(customer.balance).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isAr ? 'تعديل العميل' : 'Edit Customer'}</DialogTitle></DialogHeader>
          <CustomerForm />
          <div className="flex gap-2 mt-4">
            <Button onClick={handleUpdate} className="flex-1">
              <Save className="w-4 h-4 mr-2" />{isAr ? 'حفظ التغييرات' : 'Save Changes'}
            </Button>
            <Button variant="outline" onClick={() => { setEditDialogOpen(false); setSelectedCustomer(null); }}>
              <X className="w-4 h-4 mr-2" />{isAr ? 'إلغاء' : 'Cancel'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Customers;
