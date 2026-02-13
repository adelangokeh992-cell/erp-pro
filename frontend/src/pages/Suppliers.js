import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { suppliersAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Plus, Search, Mail, Phone, MapPin, Edit, Save, X, Truck } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import CustomFieldsRenderer from '../components/CustomFieldsRenderer';

const Suppliers = () => {
  const { t, language } = useLanguage();
  const { getCustomFields } = useAuth();
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [formData, setFormData] = useState({ 
    name: '', nameEn: '', phone: '', email: '', address: '', contactPerson: '', balance: 0 
  });
  const [customFieldValues, setCustomFieldValues] = useState({});

  const isAr = language === 'ar';

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await suppliersAPI.getAll();
      setSuppliers(response.data || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', nameEn: '', phone: '', email: '', address: '', contactPerson: '', balance: 0 });
    setCustomFieldValues({});
  };

  const handleAdd = async () => {
    if (!formData.name || !formData.phone) {
      toast({ title: isAr ? 'خطأ' : 'Error', description: isAr ? 'الاسم ورقم الهاتف مطلوبان' : 'Name and phone are required', variant: 'destructive' });
      return;
    }
    try {
      const supplierData = { ...formData, customFields: customFieldValues };
      await suppliersAPI.create(supplierData);
      await fetchSuppliers();
      setAddDialogOpen(false);
      resetForm();
      toast({ title: isAr ? 'تم الإضافة' : 'Added', description: isAr ? 'تم إضافة المورد بنجاح' : 'Supplier added successfully' });
    } catch (error) {
      toast({ title: isAr ? 'خطأ' : 'Error', description: isAr ? 'فشل الإضافة' : 'Failed to add', variant: 'destructive' });
    }
  };

  const handleEdit = (supplier) => {
    setSelectedSupplier(supplier);
    setFormData({
      name: supplier.name || '',
      nameEn: supplier.nameEn || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      contactPerson: supplier.contactPerson || '',
      balance: supplier.balance || 0
    });
    setCustomFieldValues(supplier.customFields || {});
    setEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedSupplier) return;
    try {
      const supplierData = { ...formData, customFields: customFieldValues };
      await suppliersAPI.update(selectedSupplier._id, supplierData);
      await fetchSuppliers();
      setEditDialogOpen(false);
      setSelectedSupplier(null);
      resetForm();
      toast({ title: isAr ? 'تم التحديث' : 'Updated', description: isAr ? 'تم تحديث المورد بنجاح' : 'Supplier updated successfully' });
    } catch (error) {
      toast({ title: isAr ? 'خطأ' : 'Error', description: isAr ? 'فشل التحديث' : 'Failed to update', variant: 'destructive' });
    }
  };

  const filteredSuppliers = suppliers.filter((supplier) =>
    (supplier.name && supplier.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (supplier.nameEn && supplier.nameEn.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (supplier.phone && supplier.phone.includes(searchTerm))
  );

  const SupplierForm = () => (
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
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>{isAr ? 'رقم الهاتف *' : 'Phone *'}</Label>
          <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
        </div>
        <div>
          <Label>{isAr ? 'الشخص المسؤول' : 'Contact Person'}</Label>
          <Input value={formData.contactPerson} onChange={(e) => setFormData({...formData, contactPerson: e.target.value})} />
        </div>
      </div>
      <div>
        <Label>{t('email')}</Label>
        <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
      </div>
      <div>
        <Label>{t('address')}</Label>
        <Input value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
      </div>
      <div>
        <Label>{isAr ? 'الرصيد المستحق' : 'Balance Due'}</Label>
        <Input 
          type="number" 
          step="0.01"
          value={formData.balance} 
          onChange={(e) => setFormData({...formData, balance: parseFloat(e.target.value) || 0})} 
        />
      </div>
      
      {/* Custom Fields */}
      <CustomFieldsRenderer 
        entityType="suppliers" 
        values={customFieldValues} 
        onChange={setCustomFieldValues} 
      />
    </div>
  );

  return (
    <div className="space-y-6" data-testid="suppliers-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('suppliers')}</h1>
          <p className="text-gray-600 mt-1">{isAr ? `إجمالي: ${suppliers.length}` : `Total: ${suppliers.length}`}</p>
        </div>
        
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2" onClick={() => resetForm()}>
              <Plus className="w-4 h-4" />{t('addSupplier')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t('addSupplier')}</DialogTitle></DialogHeader>
            <SupplierForm />
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

      {filteredSuppliers.length === 0 ? (
        <EmptyState
          icon={Truck}
          title={suppliers.length === 0 ? (isAr ? 'لا يوجد موردين' : 'No suppliers yet') : (isAr ? 'لا توجد نتائج' : 'No results found')}
          description={suppliers.length === 0 ? (isAr ? 'أضف أول مورد لبدء إدارة المشتريات' : 'Add your first supplier to start managing purchases') : (isAr ? 'جرب تغيير كلمات البحث' : 'Try changing your search terms')}
          actionLabel={suppliers.length === 0 ? (isAr ? 'أضف مورد' : 'Add Supplier') : undefined}
          onAction={suppliers.length === 0 ? () => setAddDialogOpen(true) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSuppliers.map((supplier) => (
            <Card key={supplier._id} className="hover:shadow-xl transition-all">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-lg">{isAr ? supplier.name : supplier.nameEn || supplier.name}</h3>
                    {supplier.contactPerson && (
                      <p className="text-sm text-gray-500">{isAr ? 'المسؤول:' : 'Contact:'} {supplier.contactPerson}</p>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(supplier)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-2 mt-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <span>{supplier.phone}</span>
                  </div>
                  {supplier.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <span>{supplier.email}</span>
                    </div>
                  )}
                  {supplier.address && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span>{supplier.address}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t mt-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">{isAr ? 'المستحق:' : 'Balance Due:'}</span>
                      <span className={`font-bold ${(supplier.balance || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        ${Math.abs(supplier.balance || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isAr ? 'تعديل المورد' : 'Edit Supplier'}</DialogTitle></DialogHeader>
          <SupplierForm />
          <div className="flex gap-2 mt-4">
            <Button onClick={handleUpdate} className="flex-1">
              <Save className="w-4 h-4 mr-2" />{isAr ? 'حفظ التغييرات' : 'Save Changes'}
            </Button>
            <Button variant="outline" onClick={() => { setEditDialogOpen(false); setSelectedSupplier(null); }}>
              <X className="w-4 h-4 mr-2" />{isAr ? 'إلغاء' : 'Cancel'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Suppliers;
