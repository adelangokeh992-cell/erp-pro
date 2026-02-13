import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { warehousesAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Plus, Search, MapPin, Phone, Warehouse as WarehouseIcon, Hash, Edit, Save, X, User } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import LimitWarning, { useLimitCheck } from '../components/LimitWarning';

const Warehouses = () => {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { checkLimit } = useLimitCheck();
  const [warehouses, setWarehouses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [formData, setFormData] = useState({
    name: '', nameEn: '', code: '', address: '', phone: '', managerName: '', isActive: true
  });

  const isAr = language === 'ar';

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      const response = await warehousesAPI.getAll();
      setWarehouses(response.data || []);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '', nameEn: '', code: '', address: '', phone: '', managerName: '', isActive: true
    });
  };

  const handleAdd = async () => {
    // Check limit before adding
    const limitCheck = checkLimit('warehouses');
    if (!limitCheck.canAdd) {
      toast({ title: isAr ? 'خطأ' : 'Error', description: isAr ? 'تم الوصول للحد الأقصى من المستودعات' : 'Maximum warehouse limit reached', variant: 'destructive' });
      return;
    }
    
    if (!formData.name || !formData.code || !formData.address) {
      toast({ title: isAr ? 'خطأ' : 'Error', description: isAr ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields', variant: 'destructive' });
      return;
    }
    try {
      await warehousesAPI.create(formData);
      await fetchWarehouses();
      setAddDialogOpen(false);
      resetForm();
      toast({ title: isAr ? 'تم الإضافة' : 'Added', description: isAr ? 'تم إضافة المستودع بنجاح' : 'Warehouse added successfully' });
    } catch (error) {
      const msg = error.response?.data?.detail || (isAr ? 'فشل الإضافة' : 'Failed to add');
      toast({ title: isAr ? 'خطأ' : 'Error', description: msg, variant: 'destructive' });
    }
  };

  const handleEdit = (warehouse) => {
    setSelectedWarehouse(warehouse);
    setFormData({
      name: warehouse.name || '',
      nameEn: warehouse.nameEn || '',
      code: warehouse.code || '',
      address: warehouse.address || '',
      phone: warehouse.phone || '',
      managerName: warehouse.managerName || '',
      isActive: warehouse.isActive !== false
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedWarehouse) return;
    try {
      await warehousesAPI.update(selectedWarehouse._id, formData);
      await fetchWarehouses();
      setEditDialogOpen(false);
      setSelectedWarehouse(null);
      resetForm();
      toast({ title: isAr ? 'تم التحديث' : 'Updated', description: isAr ? 'تم تحديث المستودع بنجاح' : 'Warehouse updated successfully' });
    } catch (error) {
      toast({ title: isAr ? 'خطأ' : 'Error', description: isAr ? 'فشل التحديث' : 'Failed to update', variant: 'destructive' });
    }
  };

  const filteredWarehouses = warehouses.filter((wh) =>
    (wh.name && wh.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (wh.nameEn && wh.nameEn.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (wh.code && wh.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const WarehouseForm = ({ isEdit = false }) => (
    <div className="space-y-4">
      {!isEdit && <LimitWarning type="warehouses" />}
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
        <Label>{isAr ? 'رمز المستودع *' : 'Warehouse Code *'}</Label>
        <Input value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})} placeholder="WH-001" disabled={isEdit} data-testid="code-input" />
      </div>
      <div>
        <Label>{isAr ? 'العنوان *' : 'Address *'}</Label>
        <Input value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>{t('phone')}</Label>
          <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
        </div>
        <div>
          <Label>{isAr ? 'اسم المدير' : 'Manager Name'}</Label>
          <Input value={formData.managerName} onChange={(e) => setFormData({...formData, managerName: e.target.value})} />
        </div>
      </div>
      {isEdit && (
        <div className="flex items-center gap-2">
          <input 
            type="checkbox" 
            id="isActive" 
            checked={formData.isActive} 
            onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
            className="w-4 h-4"
          />
          <Label htmlFor="isActive">{isAr ? 'المستودع نشط' : 'Warehouse is Active'}</Label>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6" data-testid="warehouses-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('warehouses')}</h1>
          <p className="text-gray-600 mt-1">{isAr ? `إجمالي: ${warehouses.length}` : `Total: ${warehouses.length}`}</p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2" onClick={() => resetForm()} data-testid="add-warehouse-btn">
              <Plus className="w-4 h-4" />{isAr ? 'إضافة مستودع' : 'Add Warehouse'}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isAr ? 'إضافة مستودع جديد' : 'Add New Warehouse'}</DialogTitle>
            </DialogHeader>
            <WarehouseForm />
            <div className="flex gap-2 mt-4">
              <Button onClick={handleAdd} className="flex-1" data-testid="submit-warehouse-btn">
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
        <Input placeholder={t('search')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" data-testid="search-input" />
      </div>

      {filteredWarehouses.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <WarehouseIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500">{isAr ? 'لا يوجد مستودعات' : 'No warehouses found'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWarehouses.map((warehouse) => (
            <Card key={warehouse._id} className="hover:shadow-xl transition-all" data-testid={`warehouse-${warehouse._id}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-lg">{isAr ? warehouse.name : warehouse.nameEn || warehouse.name}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${warehouse.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {warehouse.isActive !== false ? (isAr ? 'نشط' : 'Active') : (isAr ? 'غير نشط' : 'Inactive')}
                    </span>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(warehouse)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Hash className="w-4 h-4 text-gray-500" />
                    <span className="font-mono">{warehouse.code}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span>{warehouse.address}</span>
                  </div>
                  {warehouse.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <span>{warehouse.phone}</span>
                    </div>
                  )}
                  {warehouse.managerName && (
                    <div className="pt-2 border-t mt-2">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-600">{isAr ? 'المدير:' : 'Manager:'}</span>
                        <span className="font-medium">{warehouse.managerName}</span>
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
          <DialogHeader>
            <DialogTitle>{isAr ? 'تعديل المستودع' : 'Edit Warehouse'}</DialogTitle>
          </DialogHeader>
          <WarehouseForm isEdit={true} />
          <div className="flex gap-2 mt-4">
            <Button onClick={handleUpdate} className="flex-1">
              <Save className="w-4 h-4 mr-2" />{isAr ? 'حفظ التغييرات' : 'Save Changes'}
            </Button>
            <Button variant="outline" onClick={() => { setEditDialogOpen(false); setSelectedWarehouse(null); }}>
              <X className="w-4 h-4 mr-2" />{isAr ? 'إلغاء' : 'Cancel'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Warehouses;
