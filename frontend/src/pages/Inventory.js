import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { productsAPI, eslAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Plus, Search, Radio, Download, Edit, Monitor, Save, X, Package } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { useToast } from '../hooks/use-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import CustomFieldsRenderer from '../components/CustomFieldsRenderer';
import LimitWarning, { useLimitCheck } from '../components/LimitWarning';

const Inventory = () => {
  const { t, language } = useLanguage();
  const { getCustomFields } = useAuth();
  const { checkLimit } = useLimitCheck();
  const { toast } = useToast();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '', nameEn: '', sku: '', barcode: '', rfidTag: '',
    category: '', categoryEn: '', stock: 0, costPrice: 0, salePrice: 0,
    reorderLevel: 10, warehouseId: '', eslDeviceId: ''
  });
  const [customFieldValues, setCustomFieldValues] = useState({});

  const isAr = language === 'ar';

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await productsAPI.getAll();
      setProducts(response.data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({ title: isAr ? 'خطأ' : 'Error', description: isAr ? 'فشل تحميل المنتجات' : 'Failed to load products', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '', nameEn: '', sku: '', barcode: '', rfidTag: '',
      category: '', categoryEn: '', stock: 0, costPrice: 0, salePrice: 0,
      reorderLevel: 10, warehouseId: '', eslDeviceId: ''
    });
    setCustomFieldValues({});
  };

  const handleAdd = async () => {
    // Check limit before adding
    const limitCheck = checkLimit('products');
    if (!limitCheck.canAdd) {
      toast({ 
        title: isAr ? 'خطأ' : 'Error', 
        description: isAr ? 'تم الوصول للحد الأقصى من المنتجات' : 'Maximum product limit reached', 
        variant: 'destructive' 
      });
      return;
    }

    if (!formData.name || !formData.sku) {
      toast({ title: isAr ? 'خطأ' : 'Error', description: isAr ? 'الاسم ورمز SKU مطلوبان' : 'Name and SKU are required', variant: 'destructive' });
      return;
    }
    try {
      // Merge custom fields with form data
      const productData = { ...formData, customFields: customFieldValues };
      await productsAPI.create(productData);
      await fetchProducts();
      setAddDialogOpen(false);
      resetForm();
      toast({ title: isAr ? 'تم بنجاح' : 'Success', description: isAr ? 'تم إضافة المنتج' : 'Product added' });
    } catch (error) {
      toast({ title: isAr ? 'خطأ' : 'Error', description: error.response?.data?.detail || (isAr ? 'فشل الإضافة' : 'Failed to add'), variant: 'destructive' });
    }
  };

  const handleEdit = (product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name || '',
      nameEn: product.nameEn || '',
      sku: product.sku || '',
      barcode: product.barcode || '',
      rfidTag: product.rfidTag || '',
      category: product.category || '',
      categoryEn: product.categoryEn || '',
      stock: product.stock || 0,
      costPrice: product.costPrice || 0,
      salePrice: product.salePrice || 0,
      reorderLevel: product.reorderLevel || 10,
      warehouseId: product.warehouseId || '',
      eslDeviceId: product.eslDeviceId || ''
    });
    setCustomFieldValues(product.customFields || {});
    setEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedProduct) return;
    try {
      const oldPrice = selectedProduct.salePrice;
      const productData = { ...formData, customFields: customFieldValues };
      await productsAPI.update(selectedProduct._id, productData);
      
      // إذا تغير السعر وهناك ESL مربوط، حدث الشاشة
      if (formData.salePrice !== oldPrice && formData.eslDeviceId) {
        try {
          await eslAPI.updatePrice(formData.eslDeviceId);
          toast({ title: isAr ? 'تم التحديث' : 'Updated', description: isAr ? 'تم تحديث المنتج وشاشة ESL' : 'Product and ESL display updated' });
        } catch (e) {
          toast({ title: isAr ? 'تحذير' : 'Warning', description: isAr ? 'تم تحديث المنتج لكن فشل تحديث ESL' : 'Product updated but ESL update failed', variant: 'destructive' });
        }
      } else {
        toast({ title: isAr ? 'تم التحديث' : 'Updated', description: isAr ? 'تم تحديث المنتج بنجاح' : 'Product updated successfully' });
      }
      
      await fetchProducts();
      setEditDialogOpen(false);
      setSelectedProduct(null);
      resetForm();
    } catch (error) {
      toast({ title: isAr ? 'خطأ' : 'Error', description: isAr ? 'فشل التحديث' : 'Failed to update', variant: 'destructive' });
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(isAr ? 'تقرير المخزون' : 'Inventory Report', 14, 15);
    
    const tableData = products.map(p => [
      isAr ? p.name : p.nameEn,
      p.sku,
      p.stock,
      p.salePrice,
      p.stock * p.salePrice
    ]);
    
    doc.autoTable({
      startY: 25,
      head: [[isAr ? 'اسم المنتج' : 'Product', 'SKU', isAr ? 'المخزون' : 'Stock', isAr ? 'السعر' : 'Price', isAr ? 'القيمة' : 'Value']],
      body: tableData,
    });
    
    doc.save('inventory-report.pdf');
    toast({ title: isAr ? 'تم التصدير' : 'Exported', description: isAr ? 'تم تصدير التقرير إلى PDF' : 'Report exported to PDF' });
  };

  const exportToExcel = () => {
    const excelData = products.map(p => ({
      [isAr ? 'اسم المنتج' : 'Product Name']: isAr ? p.name : p.nameEn,
      'SKU': p.sku,
      'RFID Tag': p.rfidTag || '',
      [isAr ? 'المخزون' : 'Stock']: p.stock,
      [isAr ? 'سعر التكلفة' : 'Cost Price']: p.costPrice,
      [isAr ? 'سعر البيع' : 'Sale Price']: p.salePrice,
      [isAr ? 'القيمة الإجمالية' : 'Total Value']: p.stock * p.costPrice,
    }));
    
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
    XLSX.writeFile(wb, 'inventory-report.xlsx');
    
    toast({ title: isAr ? 'تم التصدير' : 'Exported', description: isAr ? 'تم تصدير التقرير إلى Excel' : 'Report exported to Excel' });
  };

  const filteredProducts = products.filter(
    (product) =>
      (product.name && product.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (product.nameEn && product.nameEn.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (product.rfidTag && product.rfidTag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const ProductForm = ({ isEdit = false }) => (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      {!isEdit && <LimitWarning type="products" />}
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
          <Label>SKU *</Label>
          <Input value={formData.sku} onChange={(e) => setFormData({...formData, sku: e.target.value})} disabled={isEdit} />
        </div>
        <div>
          <Label>{isAr ? 'الباركود' : 'Barcode'}</Label>
          <Input value={formData.barcode} onChange={(e) => setFormData({...formData, barcode: e.target.value})} />
        </div>
      </div>
      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
        <Label className="text-blue-700 flex items-center gap-2">
          <Radio className="w-4 h-4" />
          {isAr ? 'رقم RFID Tag' : 'RFID Tag'}
        </Label>
        <Input 
          value={formData.rfidTag} 
          onChange={(e) => setFormData({...formData, rfidTag: e.target.value})} 
          placeholder={isAr ? 'مثال: RFID-001-XPS' : 'Example: RFID-001-XPS'}
          className="mt-2 font-mono"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>{isAr ? 'التصنيف (عربي)' : 'Category (Arabic)'}</Label>
          <Input value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} />
        </div>
        <div>
          <Label>{isAr ? 'التصنيف (إنجليزي)' : 'Category (English)'}</Label>
          <Input value={formData.categoryEn} onChange={(e) => setFormData({...formData, categoryEn: e.target.value})} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label>{isAr ? 'المخزون' : 'Stock'}</Label>
          <Input type="number" value={formData.stock} onChange={(e) => setFormData({...formData, stock: parseInt(e.target.value) || 0})} />
        </div>
        <div>
          <Label>{isAr ? 'سعر التكلفة' : 'Cost Price'}</Label>
          <Input type="number" step="0.01" value={formData.costPrice} onChange={(e) => setFormData({...formData, costPrice: parseFloat(e.target.value) || 0})} />
        </div>
        <div>
          <Label>{isAr ? 'سعر البيع' : 'Sale Price'}</Label>
          <Input type="number" step="0.01" value={formData.salePrice} onChange={(e) => setFormData({...formData, salePrice: parseFloat(e.target.value) || 0})} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>{isAr ? 'حد إعادة الطلب' : 'Reorder Level'}</Label>
          <Input type="number" value={formData.reorderLevel} onChange={(e) => setFormData({...formData, reorderLevel: parseInt(e.target.value) || 0})} />
        </div>
        <div>
          <Label className="flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            {isAr ? 'معرف شاشة ESL' : 'ESL Device ID'}
          </Label>
          <Input 
            value={formData.eslDeviceId} 
            onChange={(e) => setFormData({...formData, eslDeviceId: e.target.value})} 
            placeholder={isAr ? 'إذا مربوط بشاشة' : 'If linked to ESL'}
          />
        </div>
      </div>
      
      {/* Custom Fields */}
      <CustomFieldsRenderer 
        entityType="products" 
        values={customFieldValues} 
        onChange={setCustomFieldValues} 
      />
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xl">{isAr ? 'جاري التحميل...' : 'Loading...'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="inventory-page">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('inventory')}</h1>
          <p className="text-gray-600 mt-1">
            {isAr ? `إجمالي المنتجات: ${products.length}` : `Total Products: ${products.length}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={exportToPDF} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-1" />PDF
          </Button>
          <Button onClick={exportToExcel} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-1" />Excel
          </Button>
          
          {/* Add Product Dialog */}
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2" data-testid="add-product-btn" onClick={() => resetForm()}>
                <Plus className="w-4 h-4" />{isAr ? 'إضافة منتج' : 'Add Product'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{isAr ? 'إضافة منتج جديد' : 'Add New Product'}</DialogTitle>
              </DialogHeader>
              <ProductForm />
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
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input 
          placeholder={isAr ? 'بحث بالاسم، SKU، أو RFID Tag...' : 'Search by name, SKU, or RFID Tag...'} 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
          className="pl-10" 
        />
      </div>

      {filteredProducts.length === 0 ? (
        <EmptyState
          icon={Package}
          title={isAr ? 'لا توجد منتجات' : 'No products yet'}
          description={isAr ? 'أضف أول منتج لبدء إدارة المخزون' : 'Add your first product to start managing inventory'}
          actionLabel={isAr ? 'أضف منتج' : 'Add Product'}
          onAction={() => setAddDialogOpen(true)}
        />
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
          <Card key={product._id} className="hover:shadow-xl transition-all duration-300 border-2 hover:border-blue-300">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1">{isAr ? product.name : product.nameEn || product.name}</h3>
                  <p className="text-sm text-gray-600">{product.sku}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleEdit(product)} data-testid={`edit-${product._id}`}>
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('category')}:</span>
                  <span className="font-semibold">{isAr ? product.category : product.categoryEn || product.category}</span>
                </div>
                {product.barcode && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('barcode')}:</span>
                    <span className="font-mono text-xs">{product.barcode}</span>
                  </div>
                )}
                {product.rfidTag && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 flex items-center gap-1">
                      <Radio className="w-3 h-3" />{isAr ? 'RFID:' : 'RFID:'}
                    </span>
                    <span className="font-mono text-xs bg-blue-100 px-2 py-0.5 rounded">{product.rfidTag}</span>
                  </div>
                )}
                {product.eslDeviceId && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 flex items-center gap-1">
                      <Monitor className="w-3 h-3" />ESL:
                    </span>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">{isAr ? 'مربوط' : 'Linked'}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-gray-600">{t('stock')}:</span>
                  <span className={`text-2xl font-bold ${product.stock <= (product.reorderLevel || 10) ? 'text-red-600' : 'text-green-600'}`}>
                    {product.stock}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('salePrice')}:</span>
                  <span className="text-xl font-bold text-blue-600">${product.salePrice}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      )}

      {/* Edit Product Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isAr ? 'تعديل المنتج' : 'Edit Product'}</DialogTitle>
          </DialogHeader>
          <ProductForm isEdit={true} />
          <div className="flex gap-2 mt-4">
            <Button onClick={handleUpdate} className="flex-1">
              <Save className="w-4 h-4 mr-2" />{isAr ? 'حفظ التغييرات' : 'Save Changes'}
            </Button>
            <Button variant="outline" onClick={() => { setEditDialogOpen(false); setSelectedProduct(null); }}>
              <X className="w-4 h-4 mr-2" />{isAr ? 'إلغاء' : 'Cancel'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;
