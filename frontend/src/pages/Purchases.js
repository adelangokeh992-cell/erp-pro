import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Plus, Search, Package, Trash2, ShoppingCart, Eye, Radio, Calendar, User, Edit, PackagePlus, X, Tag, SkipForward } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { useToast } from '../hooks/use-toast';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Purchases = () => {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [newProductDialogOpen, setNewProductDialogOpen] = useState(false);
  const [tagsDialogOpen, setTagsDialogOpen] = useState(false);
  const [pendingItem, setPendingItem] = useState(null);
  const [itemTags, setItemTags] = useState([]);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [purchaseItems, setPurchaseItems] = useState([]);
  const [notes, setNotes] = useState('');
  const [newItem, setNewItem] = useState({ sku: '', name: '', nameEn: '', quantity: 1, unitCost: 0, productId: '', rfidTag: '', isNew: false });
  const [newProduct, setNewProduct] = useState({ name: '', nameEn: '', sku: '', category: '', categoryEn: '', costPrice: 0, salePrice: 0 });

  const isAr = language === 'ar';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [purchasesRes, suppliersRes, productsRes] = await Promise.all([
        axios.get(`${API}/purchases`),
        axios.get(`${API}/suppliers`),
        axios.get(`${API}/products`)
      ]);
      setPurchases(purchasesRes.data || []);
      setSuppliers(suppliersRes.data || []);
      setProducts(productsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleAddItem = () => {
    if (!newItem.sku || !newItem.name || newItem.quantity <= 0 || newItem.unitCost <= 0) {
      toast({ title: isAr ? 'خطأ' : 'Error', description: isAr ? 'يرجى ملء جميع الحقول' : 'Please fill all fields', variant: 'destructive' });
      return;
    }
    
    // If quantity > 1, ask for RFID tags for each unit
    if (newItem.quantity > 1) {
      setPendingItem({ ...newItem, total: newItem.quantity * newItem.unitCost });
      setItemTags(Array(newItem.quantity).fill(''));
      setTagsDialogOpen(true);
    } else {
      // Single item, add directly with optional single tag
      setPurchaseItems([...purchaseItems, { ...newItem, total: newItem.quantity * newItem.unitCost, tags: newItem.rfidTag ? [newItem.rfidTag] : [] }]);
      setNewItem({ sku: '', name: '', nameEn: '', quantity: 1, unitCost: 0, productId: '', rfidTag: '', isNew: false });
    }
  };

  const handleAddItemWithTags = () => {
    if (!pendingItem) return;
    const validTags = itemTags.filter(tag => tag.trim() !== '');
    setPurchaseItems([...purchaseItems, { ...pendingItem, tags: validTags }]);
    setTagsDialogOpen(false);
    setPendingItem(null);
    setItemTags([]);
    setNewItem({ sku: '', name: '', nameEn: '', quantity: 1, unitCost: 0, productId: '', rfidTag: '', isNew: false });
    if (validTags.length > 0) {
      toast({ title: isAr ? 'تم بنجاح' : 'Success', description: isAr ? `تم إضافة ${validTags.length} تاغ` : `Added ${validTags.length} tags` });
    }
  };

  const handleSkipTags = () => {
    if (!pendingItem) return;
    setPurchaseItems([...purchaseItems, { ...pendingItem, tags: [] }]);
    setTagsDialogOpen(false);
    setPendingItem(null);
    setItemTags([]);
    setNewItem({ sku: '', name: '', nameEn: '', quantity: 1, unitCost: 0, productId: '', rfidTag: '', isNew: false });
  };

  const updateTag = (index, value) => {
    const newTags = [...itemTags];
    newTags[index] = value;
    setItemTags(newTags);
  };

  const handleRemoveItem = (index) => {
    setPurchaseItems(purchaseItems.filter((_, i) => i !== index));
  };

  const handleProductSelect = (productId) => {
    if (productId === 'new') {
      setNewProductDialogOpen(true);
      return;
    }
    const product = products.find(p => p._id === productId);
    if (product) {
      setNewItem({
        productId: product._id,
        sku: product.sku,
        name: product.name,
        nameEn: product.nameEn || '',
        quantity: 1,
        unitCost: product.costPrice || 0,
        rfidTag: product.rfidTag || '',
        isNew: false
      });
    }
  };

  const handleCreateNewProduct = async () => {
    if (!newProduct.name || !newProduct.sku) {
      toast({ title: isAr ? 'خطأ' : 'Error', description: isAr ? 'يرجى إدخال اسم المنتج و SKU' : 'Please enter product name and SKU', variant: 'destructive' });
      return;
    }
    try {
      const res = await axios.post(`${API}/products`, {
        ...newProduct,
        stock: 0,
        reorderLevel: 10
      });
      const createdProduct = res.data;
      setProducts([...products, createdProduct]);
      setNewItem({
        productId: createdProduct._id,
        sku: createdProduct.sku,
        name: createdProduct.name,
        nameEn: createdProduct.nameEn || '',
        quantity: 1,
        unitCost: createdProduct.costPrice || 0,
        rfidTag: '',
        isNew: true
      });
      setNewProductDialogOpen(false);
      setNewProduct({ name: '', nameEn: '', sku: '', category: '', categoryEn: '', costPrice: 0, salePrice: 0 });
      toast({ title: isAr ? 'تم بنجاح' : 'Success', description: isAr ? 'تم إنشاء المنتج الجديد' : 'New product created' });
    } catch (error) {
      toast({ title: isAr ? 'خطأ' : 'Error', description: isAr ? 'فشل إنشاء المنتج' : 'Failed to create product', variant: 'destructive' });
    }
  };

  const openEditDialog = (purchase) => {
    setEditingPurchase({
      ...purchase,
      status: purchase.status || 'received',
      notes: purchase.notes || ''
    });
    setEditDialogOpen(true);
  };

  const handleUpdatePurchase = async () => {
    if (!editingPurchase) return;
    try {
      await axios.put(`${API}/purchases/${editingPurchase._id}`, {
        status: editingPurchase.status,
        notes: editingPurchase.notes,
        tax: editingPurchase.tax,
        discount: editingPurchase.discount
      });
      await fetchData();
      setEditDialogOpen(false);
      setEditingPurchase(null);
      toast({ title: isAr ? 'تم بنجاح' : 'Success', description: isAr ? 'تم تحديث المشتريات' : 'Purchase updated' });
    } catch (error) {
      toast({ title: isAr ? 'خطأ' : 'Error', description: isAr ? 'فشل تحديث المشتريات' : 'Failed to update purchase', variant: 'destructive' });
    }
  };

  const handleSubmitPurchase = async () => {
    if (!selectedSupplier || purchaseItems.length === 0) {
      toast({ title: isAr ? 'خطأ' : 'Error', description: isAr ? 'يرجى اختيار مورد وإضافة منتجات' : 'Please select supplier and add products', variant: 'destructive' });
      return;
    }

    const supplier = suppliers.find(s => s._id === selectedSupplier);
    
    try {
      await axios.post(`${API}/purchases`, {
        supplierId: selectedSupplier,
        supplierName: supplier ? (isAr ? supplier.name : supplier.nameEn) : '',
        items: purchaseItems.map(item => ({
          productId: item.productId || null,
          sku: item.sku,
          name: item.name,
          nameEn: item.nameEn,
          quantity: item.quantity,
          unitCost: item.unitCost,
          rfidTag: item.rfidTag || null,
          tags: item.tags || []
        })),
        tax: 0,
        discount: 0,
        notes: notes
      });

      await fetchData();
      setDialogOpen(false);
      setPurchaseItems([]);
      setSelectedSupplier('');
      setNotes('');
      setNewItem({ sku: '', name: '', nameEn: '', quantity: 1, unitCost: 0, productId: '', rfidTag: '', isNew: false });
      toast({ title: isAr ? 'تم بنجاح' : 'Success', description: isAr ? 'تمت إضافة المشتريات وتحديث المخزون' : 'Purchase added and inventory updated' });
    } catch (error) {
      toast({ title: isAr ? 'خطأ' : 'Error', description: isAr ? 'فشل إضافة المشتريات' : 'Failed to add purchase', variant: 'destructive' });
    }
  };

  const calculateTotal = () => {
    return purchaseItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
  };

  const viewPurchase = (purchase) => {
    setSelectedPurchase(purchase);
    setDetailsOpen(true);
  };

  const filteredPurchases = purchases.filter((purchase) =>
    purchase.purchaseNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    purchase.supplierName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'received': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    if (isAr) {
      switch (status) {
        case 'received': return 'مستلم';
        case 'pending': return 'قيد الانتظار';
        case 'cancelled': return 'ملغي';
        default: return status;
      }
    }
    return status?.charAt(0).toUpperCase() + status?.slice(1);
  };

  return (
    <div className="space-y-6" data-testid="purchases-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('purchases')}</h1>
          <p className="text-gray-600 mt-1">{isAr ? `إجمالي: ${purchases.length}` : `Total: ${purchases.length}`}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2" data-testid="add-purchase-btn">
              <Plus className="w-4 h-4" />{isAr ? 'إضافة مشتريات' : 'Add Purchase'}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isAr ? 'إضافة مشتريات جديدة' : 'Add New Purchase'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{isAr ? 'المورد' : 'Supplier'}</Label>
                <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                  <SelectTrigger data-testid="supplier-select">
                    <SelectValue placeholder={isAr ? 'اختر المورد' : 'Select Supplier'} />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(supplier => (
                      <SelectItem key={supplier._id} value={supplier._id}>
                        {isAr ? supplier.name : supplier.nameEn || supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="font-semibold mb-3">{isAr ? 'إضافة منتج' : 'Add Product'}</h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <Label>{isAr ? 'اختر من المنتجات' : 'Select from Products'}</Label>
                    <Select onValueChange={handleProductSelect}>
                      <SelectTrigger data-testid="product-select">
                        <SelectValue placeholder={isAr ? 'اختر منتج أو أضف جديد' : 'Select or Add New'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new" className="text-green-600 font-semibold border-b">
                          <span className="flex items-center gap-2">
                            <PackagePlus className="w-4 h-4" />
                            {isAr ? '+ إضافة منتج جديد' : '+ Add New Product'}
                          </span>
                        </SelectItem>
                        {products.map(product => (
                          <SelectItem key={product._id} value={product._id}>
                            {isAr ? product.name : product.nameEn || product.name} ({product.sku})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>SKU</Label>
                    <Input value={newItem.sku} onChange={(e) => setNewItem({...newItem, sku: e.target.value})} data-testid="sku-input" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <Label>{isAr ? 'الاسم (عربي)' : 'Name (Arabic)'}</Label>
                    <Input value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} data-testid="name-ar-input" />
                  </div>
                  <div>
                    <Label>{isAr ? 'الاسم (إنجليزي)' : 'Name (English)'}</Label>
                    <Input value={newItem.nameEn} onChange={(e) => setNewItem({...newItem, nameEn: e.target.value})} data-testid="name-en-input" />
                  </div>
                </div>
                
                {/* RFID Tag Field */}
                <div className="mb-3 bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <Label className="text-blue-700 flex items-center gap-2">
                    <Radio className="w-4 h-4" />
                    {isAr ? 'رقم RFID Tag (للمسح لاحقاً)' : 'RFID Tag (for scanning later)'}
                  </Label>
                  <Input 
                    value={newItem.rfidTag} 
                    onChange={(e) => setNewItem({...newItem, rfidTag: e.target.value})} 
                    placeholder={isAr ? 'مثال: RFID-001-XPS' : 'Example: RFID-001-XPS'}
                    className="mt-2 font-mono"
                    data-testid="rfid-input"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <Label>{isAr ? 'الكمية' : 'Quantity'}</Label>
                    <Input type="number" min="1" value={newItem.quantity} onChange={(e) => setNewItem({...newItem, quantity: parseInt(e.target.value) || 0})} data-testid="quantity-input" />
                  </div>
                  <div>
                    <Label>{isAr ? 'سعر الوحدة' : 'Unit Cost'}</Label>
                    <Input type="number" min="0" step="0.01" value={newItem.unitCost} onChange={(e) => setNewItem({...newItem, unitCost: parseFloat(e.target.value) || 0})} data-testid="cost-input" />
                  </div>
                </div>
                <Button type="button" variant="outline" onClick={handleAddItem} className="w-full" data-testid="add-item-btn">
                  <Plus className="w-4 h-4 mr-2" />{isAr ? 'إضافة للقائمة' : 'Add to List'}
                </Button>
              </div>

              {purchaseItems.length > 0 && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">{isAr ? 'المنتجات المضافة' : 'Added Products'}</h3>
                  <div className="space-y-2">
                    {purchaseItems.map((item, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                        <div className="flex-1">
                          <span className="font-medium">{isAr ? item.name : item.nameEn || item.name}</span>
                          <span className="text-gray-500 text-sm mx-2">({item.sku})</span>
                          {item.tags && item.tags.length > 0 ? (
                            <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded mx-2">
                              <Tag className="w-3 h-3 inline mr-1" />{item.tags.length} {isAr ? 'تاغ' : 'tags'}
                            </span>
                          ) : item.rfidTag ? (
                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded font-mono mx-2">
                              <Radio className="w-3 h-3 inline mr-1" />{item.rfidTag}
                            </span>
                          ) : item.quantity > 1 && (
                            <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded mx-2">
                              {isAr ? 'بدون تاغات' : 'No tags'}
                            </span>
                          )}
                          <span className="text-sm">{item.quantity} × ${item.unitCost}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold">${(item.quantity * item.unitCost).toLocaleString()}</span>
                          <Button variant="ghost" size="sm" onClick={() => handleRemoveItem(index)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between pt-3 border-t mt-3">
                      <span className="font-bold">{isAr ? 'المجموع' : 'Total'}:</span>
                      <span className="font-bold text-xl text-primary">${calculateTotal().toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <Label>{isAr ? 'ملاحظات' : 'Notes'}</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={isAr ? 'ملاحظات إضافية...' : 'Additional notes...'} />
              </div>

              <Button onClick={handleSubmitPurchase} className="w-full" disabled={purchaseItems.length === 0 || !selectedSupplier} data-testid="submit-purchase-btn">
                <ShoppingCart className="w-4 h-4 mr-2" />
                {isAr ? 'تأكيد المشتريات وتحديث المخزون' : 'Confirm Purchase & Update Inventory'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input placeholder={t('search')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" data-testid="search-input" />
      </div>

      {filteredPurchases.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title={purchases.length === 0 ? (isAr ? 'لا توجد مشتريات' : 'No purchases yet') : (isAr ? 'لا توجد نتائج' : 'No results found')}
          description={purchases.length === 0 ? (isAr ? 'أضف أول عملية شراء لتسجيل المشتريات' : 'Add your first purchase to record procurement') : (isAr ? 'جرب تغيير كلمات البحث' : 'Try changing your search terms')}
          actionLabel={purchases.length === 0 ? (isAr ? 'إضافة شراء' : 'Add Purchase') : undefined}
          onAction={purchases.length === 0 ? () => setDialogOpen(true) : undefined}
        />
      ) : (
        <div className="space-y-4">
          {filteredPurchases.map((purchase) => (
            <Card 
              key={purchase._id} 
              className="hover:shadow-lg transition-all cursor-pointer" 
              onClick={() => viewPurchase(purchase)}
              data-testid={`purchase-${purchase._id}`}
            >
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-lg">{purchase.purchaseNumber}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs ${getStatusColor(purchase.status)}`}>
                        {getStatusText(purchase.status)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <User className="w-4 h-4" />{purchase.supplierName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(purchase.purchaseDate).toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Package className="w-4 h-4" />
                        {purchase.items?.length || 0} {isAr ? 'منتج' : 'items'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">{isAr ? 'الإجمالي' : 'Total'}</p>
                      <p className="text-2xl font-bold text-primary">${(purchase.total || 0).toLocaleString()}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openEditDialog(purchase); }} data-testid={`edit-purchase-${purchase._id}`}>
                      <Edit className="w-4 h-4 mr-1" />{isAr ? 'تعديل' : 'Edit'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); viewPurchase(purchase); }} data-testid={`view-purchase-${purchase._id}`}>
                      <Eye className="w-4 h-4 mr-1" />{isAr ? 'تفاصيل' : 'Details'}
                    </Button>
                  </div>
                </div>
                {purchase.items && purchase.items.length > 0 && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-gray-500 mb-2">{isAr ? 'المنتجات:' : 'Products:'}</p>
                    <div className="flex flex-wrap gap-2">
                      {purchase.items.slice(0, 4).map((item, idx) => (
                        <span key={idx} className="bg-gray-100 px-2 py-1 rounded text-sm">
                          {isAr ? item.name : item.nameEn || item.name} ({item.quantity})
                        </span>
                      ))}
                      {purchase.items.length > 4 && (
                        <span className="text-gray-500 text-sm">+{purchase.items.length - 4} {isAr ? 'أخرى' : 'more'}</span>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Purchase Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isAr ? 'تفاصيل المشتريات' : 'Purchase Details'}</DialogTitle>
          </DialogHeader>
          
          {selectedPurchase && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-500">{isAr ? 'رقم الطلب' : 'Order Number'}</p>
                  <p className="font-bold text-lg">{selectedPurchase.purchaseNumber}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-500">{isAr ? 'المورد' : 'Supplier'}</p>
                  <p className="font-bold">{selectedPurchase.supplierName}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-500">{isAr ? 'التاريخ' : 'Date'}</p>
                  <p className="font-medium">{new Date(selectedPurchase.purchaseDate).toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-500">{isAr ? 'الحالة' : 'Status'}</p>
                  <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(selectedPurchase.status)}`}>
                    {getStatusText(selectedPurchase.status)}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">{isAr ? 'المنتجات' : 'Products'}</h4>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-2 text-right">{isAr ? 'المنتج' : 'Product'}</th>
                      <th className="border p-2 text-center">RFID</th>
                      <th className="border p-2 text-center">{isAr ? 'الكمية' : 'Qty'}</th>
                      <th className="border p-2 text-center">{isAr ? 'السعر' : 'Price'}</th>
                      <th className="border p-2 text-center">{isAr ? 'المجموع' : 'Total'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPurchase.items?.map((item, index) => (
                      <tr key={index}>
                        <td className="border p-2">
                          <div>{isAr ? item.name : item.nameEn || item.name}</div>
                          <div className="text-xs text-gray-500">{item.sku}</div>
                        </td>
                        <td className="border p-2 text-center">
                          {item.rfidTag ? (
                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded font-mono">{item.rfidTag}</span>
                          ) : '-'}
                        </td>
                        <td className="border p-2 text-center">{item.quantity}</td>
                        <td className="border p-2 text-center">${item.unitCost}</td>
                        <td className="border p-2 text-center font-medium">${(item.quantity * item.unitCost).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between">
                  <span>{isAr ? 'المجموع الفرعي' : 'Subtotal'}</span>
                  <span>${(selectedPurchase.subtotal || selectedPurchase.total || 0).toLocaleString()}</span>
                </div>
                {selectedPurchase.tax > 0 && (
                  <div className="flex justify-between mt-2">
                    <span>{isAr ? 'الضريبة' : 'Tax'}</span>
                    <span>${(selectedPurchase.tax || 0).toLocaleString()}</span>
                  </div>
                )}
                {selectedPurchase.discount > 0 && (
                  <div className="flex justify-between mt-2 text-green-600">
                    <span>{isAr ? 'الخصم' : 'Discount'}</span>
                    <span>-${(selectedPurchase.discount || 0).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold pt-2 border-t mt-2">
                  <span>{isAr ? 'الإجمالي' : 'Total'}</span>
                  <span className="text-primary">${(selectedPurchase.total || 0).toLocaleString()}</span>
                </div>
              </div>

              {selectedPurchase.notes && (
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">{isAr ? 'ملاحظات' : 'Notes'}</p>
                  <p>{selectedPurchase.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Purchase Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg" data-testid="edit-purchase-dialog">
          <DialogHeader>
            <DialogTitle>{isAr ? 'تعديل المشتريات' : 'Edit Purchase'}</DialogTitle>
          </DialogHeader>
          {editingPurchase && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-500">{isAr ? 'رقم الطلب' : 'Order Number'}</p>
                <p className="font-bold">{editingPurchase.purchaseNumber}</p>
              </div>
              
              <div>
                <Label>{isAr ? 'الحالة' : 'Status'}</Label>
                <Select value={editingPurchase.status} onValueChange={(v) => setEditingPurchase({...editingPurchase, status: v})}>
                  <SelectTrigger data-testid="edit-status-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">{isAr ? 'قيد الانتظار' : 'Pending'}</SelectItem>
                    <SelectItem value="received">{isAr ? 'مستلم' : 'Received'}</SelectItem>
                    <SelectItem value="cancelled">{isAr ? 'ملغي' : 'Cancelled'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{isAr ? 'الضريبة' : 'Tax'}</Label>
                  <Input 
                    type="number" 
                    min="0" 
                    step="0.01"
                    value={editingPurchase.tax || 0} 
                    onChange={(e) => setEditingPurchase({...editingPurchase, tax: parseFloat(e.target.value) || 0})}
                    data-testid="edit-tax-input"
                  />
                </div>
                <div>
                  <Label>{isAr ? 'الخصم' : 'Discount'}</Label>
                  <Input 
                    type="number" 
                    min="0" 
                    step="0.01"
                    value={editingPurchase.discount || 0} 
                    onChange={(e) => setEditingPurchase({...editingPurchase, discount: parseFloat(e.target.value) || 0})}
                    data-testid="edit-discount-input"
                  />
                </div>
              </div>

              <div>
                <Label>{isAr ? 'ملاحظات' : 'Notes'}</Label>
                <Input 
                  value={editingPurchase.notes || ''} 
                  onChange={(e) => setEditingPurchase({...editingPurchase, notes: e.target.value})}
                  placeholder={isAr ? 'أضف ملاحظات...' : 'Add notes...'}
                  data-testid="edit-notes-input"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleUpdatePurchase} className="flex-1" data-testid="save-edit-btn">
                  {isAr ? 'حفظ التعديلات' : 'Save Changes'}
                </Button>
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  {isAr ? 'إلغاء' : 'Cancel'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New Product Dialog */}
      <Dialog open={newProductDialogOpen} onOpenChange={setNewProductDialogOpen}>
        <DialogContent className="max-w-lg" data-testid="new-product-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackagePlus className="w-5 h-5 text-green-600" />
              {isAr ? 'إضافة منتج جديد' : 'Add New Product'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
              {isAr ? 'سيتم إنشاء المنتج الجديد في المخزون وإضافته لقائمة المشتريات' : 'The new product will be created in inventory and added to the purchase list'}
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-red-500">* {isAr ? 'الاسم (عربي)' : 'Name (Arabic)'}</Label>
                <Input 
                  value={newProduct.name} 
                  onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                  data-testid="new-product-name-ar"
                />
              </div>
              <div>
                <Label>{isAr ? 'الاسم (إنجليزي)' : 'Name (English)'}</Label>
                <Input 
                  value={newProduct.nameEn} 
                  onChange={(e) => setNewProduct({...newProduct, nameEn: e.target.value})}
                  data-testid="new-product-name-en"
                />
              </div>
            </div>

            <div>
              <Label className="text-red-500">* SKU</Label>
              <Input 
                value={newProduct.sku} 
                onChange={(e) => setNewProduct({...newProduct, sku: e.target.value})}
                placeholder={isAr ? 'رمز المنتج الفريد' : 'Unique product code'}
                data-testid="new-product-sku"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{isAr ? 'التصنيف (عربي)' : 'Category (Arabic)'}</Label>
                <Input 
                  value={newProduct.category} 
                  onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                  placeholder={isAr ? 'مثال: إلكترونيات' : 'e.g. Electronics'}
                />
              </div>
              <div>
                <Label>{isAr ? 'التصنيف (إنجليزي)' : 'Category (English)'}</Label>
                <Input 
                  value={newProduct.categoryEn} 
                  onChange={(e) => setNewProduct({...newProduct, categoryEn: e.target.value})}
                  placeholder="e.g. Electronics"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{isAr ? 'سعر التكلفة' : 'Cost Price'}</Label>
                <Input 
                  type="number" 
                  min="0" 
                  step="0.01"
                  value={newProduct.costPrice} 
                  onChange={(e) => setNewProduct({...newProduct, costPrice: parseFloat(e.target.value) || 0})}
                  data-testid="new-product-cost"
                />
              </div>
              <div>
                <Label>{isAr ? 'سعر البيع' : 'Sale Price'}</Label>
                <Input 
                  type="number" 
                  min="0" 
                  step="0.01"
                  value={newProduct.salePrice} 
                  onChange={(e) => setNewProduct({...newProduct, salePrice: parseFloat(e.target.value) || 0})}
                  data-testid="new-product-sale"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleCreateNewProduct} className="flex-1 bg-green-600 hover:bg-green-700" data-testid="create-product-btn">
                <PackagePlus className="w-4 h-4 mr-2" />
                {isAr ? 'إنشاء المنتج' : 'Create Product'}
              </Button>
              <Button variant="outline" onClick={() => setNewProductDialogOpen(false)}>
                <X className="w-4 h-4 mr-2" />
                {isAr ? 'إلغاء' : 'Cancel'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* RFID Tags Dialog for Multiple Items */}
      <Dialog open={tagsDialogOpen} onOpenChange={setTagsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="tags-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-blue-600" />
              {isAr ? 'إضافة تاغات RFID' : 'Add RFID Tags'}
            </DialogTitle>
          </DialogHeader>
          {pendingItem && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="font-medium text-blue-900">
                  {isAr ? pendingItem.name : pendingItem.nameEn || pendingItem.name}
                </p>
                <p className="text-sm text-blue-700">
                  {isAr ? `الكمية: ${pendingItem.quantity} قطعة - يمكنك إضافة تاغ RFID فريد لكل قطعة` : `Quantity: ${pendingItem.quantity} units - You can add a unique RFID tag for each unit`}
                </p>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {itemTags.map((tag, index) => (
                  <div key={index} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                    <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded min-w-[40px] text-center">
                      #{index + 1}
                    </span>
                    <Input
                      value={tag}
                      onChange={(e) => updateTag(index, e.target.value)}
                      placeholder={isAr ? `تاغ القطعة ${index + 1}` : `Tag for unit ${index + 1}`}
                      className="flex-1 font-mono"
                      data-testid={`tag-input-${index}`}
                    />
                    <Radio className="w-5 h-5 text-gray-400" />
                  </div>
                ))}
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                <p>{isAr ? 'يمكنك ترك الحقول فارغة للقطع التي لا تريد إضافة تاغ لها' : 'You can leave fields empty for units without tags'}</p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleAddItemWithTags} className="flex-1 bg-blue-600 hover:bg-blue-700" data-testid="save-tags-btn">
                  <Tag className="w-4 h-4 mr-2" />
                  {isAr ? 'حفظ التاغات' : 'Save Tags'}
                </Button>
                <Button variant="outline" onClick={handleSkipTags} data-testid="skip-tags-btn">
                  <SkipForward className="w-4 h-4 mr-2" />
                  {isAr ? 'تخطي' : 'Skip'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Purchases;
