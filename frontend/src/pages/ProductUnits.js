import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { productsAPI } from '../services/api';
import rfidScanner from '../services/rfidScanner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Plus, Search, Radio, Package, Trash2, Tag, 
  CheckCircle, XCircle, AlertCircle, Scan, 
  ChevronDown, ChevronUp, Save
} from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../hooks/use-toast';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : '/api';

const ProductUnits = () => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [products, setProducts] = useState([]);
  const [units, setUnits] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [expandedProduct, setExpandedProduct] = useState(null);
  const [newTags, setNewTags] = useState([]);
  const [manualTag, setManualTag] = useState('');
  const [scanning, setScanning] = useState(false);
  const [productCounts, setProductCounts] = useState({});
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [unitToDelete, setUnitToDelete] = useState(null);

  const isAr = language === 'ar';

  useEffect(() => {
    fetchProducts();
    fetchAllUnits();
  }, []);

  // الاستماع للـ RFID Scanner
  useEffect(() => {
    const unsubscribe = rfidScanner.addListener(handleScanEvent);
    return () => {
      unsubscribe();
      rfidScanner.stopListening();
    };
  }, [scanning, newTags]);

  const handleScanEvent = useCallback((event) => {
    if (event.type === 'scan' && scanning) {
      const tag = event.tag;
      // التحقق من عدم تكرار الـ Tag
      if (!newTags.includes(tag)) {
        setNewTags(prev => [...prev, tag]);
        toast({ 
          title: isAr ? '✅ تم المسح' : '✅ Scanned', 
          description: tag 
        });
      } else {
        toast({ 
          title: isAr ? '⚠️ مكرر' : '⚠️ Duplicate', 
          description: isAr ? 'هذا الـ Tag موجود بالفعل' : 'This tag already exists',
          variant: 'destructive'
        });
      }
    }
  }, [scanning, newTags, isAr, toast]);

  const fetchProducts = async () => {
    try {
      const response = await productsAPI.getAll();
      setProducts(response.data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchAllUnits = async () => {
    try {
      const response = await axios.get(`${API}/product-units`);
      setUnits(response.data || []);
      
      // حساب الإحصائيات لكل منتج
      const counts = {};
      response.data.forEach(unit => {
        if (!counts[unit.productId]) {
          counts[unit.productId] = { available: 0, sold: 0, total: 0 };
        }
        counts[unit.productId].total++;
        if (unit.status === 'available') counts[unit.productId].available++;
        if (unit.status === 'sold') counts[unit.productId].sold++;
      });
      setProductCounts(counts);
    } catch (error) {
      console.error('Error fetching units:', error);
    }
  };

  const fetchProductUnits = async (productId) => {
    try {
      const response = await axios.get(`${API}/product-units?product_id=${productId}`);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching units:', error);
      return [];
    }
  };

  const startScanning = () => {
    setScanning(true);
    rfidScanner.startListening();
    toast({ 
      title: isAr ? '🎯 جاهز للمسح' : '🎯 Ready to Scan', 
      description: isAr ? 'وجّه السكانر وامسح الـ Tags' : 'Point scanner and scan tags'
    });
  };

  const stopScanning = () => {
    setScanning(false);
    rfidScanner.stopListening();
  };

  const addManualTag = () => {
    if (manualTag.trim() && !newTags.includes(manualTag.trim())) {
      setNewTags([...newTags, manualTag.trim()]);
      setManualTag('');
    }
  };

  const removeTag = (tag) => {
    setNewTags(newTags.filter(t => t !== tag));
  };

  const saveTags = async () => {
    if (!selectedProduct || newTags.length === 0) return;
    
    try {
      const response = await axios.post(`${API}/product-units/bulk`, {
        productId: selectedProduct._id,
        rfidTags: newTags
      });
      
      toast({ 
        title: isAr ? '✅ تم الحفظ' : '✅ Saved', 
        description: isAr 
          ? `تم إضافة ${response.data.created} وحدة جديدة`
          : `Added ${response.data.created} new units`
      });
      
      if (response.data.skipped > 0) {
        toast({ 
          title: isAr ? '⚠️ تم تخطي' : '⚠️ Skipped', 
          description: isAr 
            ? `${response.data.skipped} tags موجودة مسبقاً`
            : `${response.data.skipped} tags already exist`,
          variant: 'destructive'
        });
      }
      
      setNewTags([]);
      setAddDialogOpen(false);
      stopScanning();
      fetchProducts();
      fetchAllUnits();
    } catch (error) {
      toast({ 
        title: isAr ? 'خطأ' : 'Error', 
        description: error.response?.data?.detail || 'Failed to save',
        variant: 'destructive'
      });
    }
  };

  const deleteUnit = (unitId) => {
    setUnitToDelete(unitId);
    setDeleteConfirmOpen(true);
  };

  const doDeleteUnit = async () => {
    if (!unitToDelete) return;
    try {
      await axios.delete(`${API}/product-units/${unitToDelete}`);
      toast({ title: isAr ? 'تم الحذف' : 'Deleted' });
      fetchAllUnits();
      fetchProducts();
    } catch (error) {
      toast({ title: isAr ? 'خطأ' : 'Error', variant: 'destructive' });
    } finally {
      setUnitToDelete(null);
    }
  };

  const toggleProductExpand = async (productId) => {
    if (expandedProduct === productId) {
      setExpandedProduct(null);
    } else {
      setExpandedProduct(productId);
    }
  };

  const getProductUnits = (productId) => {
    return units.filter(u => u.productId === productId);
  };

  const filteredProducts = products.filter(product =>
    (product.name && product.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (product.nameEn && product.nameEn.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'sold': return 'bg-gray-100 text-gray-800';
      case 'reserved': return 'bg-yellow-100 text-yellow-800';
      case 'damaged': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    if (isAr) {
      switch (status) {
        case 'available': return 'متوفر';
        case 'sold': return 'مباع';
        case 'reserved': return 'محجوز';
        case 'damaged': return 'تالف';
        default: return status;
      }
    }
    return status?.charAt(0).toUpperCase() + status?.slice(1);
  };

  return (
    <div className="space-y-6" data-testid="product-units-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{isAr ? 'إدارة الوحدات (Tags)' : 'Unit Management (Tags)'}</h1>
          <p className="text-gray-600 mt-1">
            {isAr ? 'إدارة RFID Tags لكل وحدة من المنتجات' : 'Manage RFID Tags for each product unit'}
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input 
          placeholder={isAr ? 'بحث عن منتج...' : 'Search products...'} 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
          className="pl-10" 
        />
      </div>

      <div className="space-y-4">
        {filteredProducts.map((product) => {
          const count = productCounts[product._id] || { available: 0, sold: 0, total: 0 };
          const productUnits = getProductUnits(product._id);
          const isExpanded = expandedProduct === product._id;
          
          return (
            <Card key={product._id} className="overflow-hidden">
              <div 
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                onClick={() => toggleProductExpand(product._id)}
              >
                <div className="flex items-center gap-4">
                  <Package className="w-8 h-8 text-gray-400" />
                  <div>
                    <h3 className="font-bold">{isAr ? product.name : product.nameEn || product.name}</h3>
                    <p className="text-sm text-gray-500">{product.sku}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-sm">
                        {count.available} {isAr ? 'متوفر' : 'available'}
                      </span>
                      {count.sold > 0 && (
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-sm">
                          {count.sold} {isAr ? 'مباع' : 'sold'}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {count.total} {isAr ? 'وحدة مسجلة' : 'units registered'}
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProduct(product);
                      setNewTags([]);
                      setAddDialogOpen(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    {isAr ? 'إضافة Tags' : 'Add Tags'}
                  </Button>
                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </div>
              
              {isExpanded && (
                <div className="border-t p-4 bg-gray-50">
                  {productUnits.length === 0 ? (
                    <p className="text-center text-gray-500 py-4">
                      {isAr ? 'لا توجد وحدات مسجلة لهذا المنتج' : 'No units registered for this product'}
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {productUnits.map((unit) => (
                        <div 
                          key={unit._id} 
                          className={`p-3 rounded-lg border ${unit.status === 'available' ? 'bg-white' : 'bg-gray-100'}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Radio className="w-4 h-4 text-blue-600" />
                            <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(unit.status)}`}>
                              {getStatusText(unit.status)}
                            </span>
                          </div>
                          <p className="font-mono text-sm font-medium truncate" title={unit.rfidTag}>
                            {unit.rfidTag}
                          </p>
                          {unit.serialNumber && (
                            <p className="text-xs text-gray-500 mt-1">SN: {unit.serialNumber}</p>
                          )}
                          {unit.location && (
                            <p className="text-xs text-gray-500">📍 {unit.location}</p>
                          )}
                          {unit.status === 'available' && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="w-full mt-2 text-red-600 hover:text-red-700"
                              onClick={() => deleteUnit(unit._id)}
                            >
                              <Trash2 className="w-3 h-3 mr-1" />{isAr ? 'حذف' : 'Delete'}
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Add Tags Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={(open) => { setAddDialogOpen(open); if (!open) stopScanning(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5" />
              {isAr ? 'إضافة وحدات جديدة' : 'Add New Units'}
              {selectedProduct && (
                <span className="text-sm font-normal text-gray-500">
                  - {isAr ? selectedProduct.name : selectedProduct.nameEn}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Scan Mode */}
            <Card className={`border-2 ${scanning ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Scan className="w-5 h-5" />
                    {isAr ? 'مسح RFID Tags' : 'Scan RFID Tags'}
                  </h4>
                  {!scanning ? (
                    <Button onClick={startScanning} size="sm">
                      {isAr ? 'بدء المسح' : 'Start Scanning'}
                    </Button>
                  ) : (
                    <Button onClick={stopScanning} variant="destructive" size="sm">
                      {isAr ? 'إيقاف' : 'Stop'}
                    </Button>
                  )}
                </div>
                {scanning && (
                  <p className="text-sm text-blue-700 animate-pulse">
                    🎯 {isAr ? 'وجّه السكانر وامسح الـ Tags...' : 'Point scanner and scan tags...'}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Manual Add */}
            <div>
              <Label>{isAr ? 'أو أدخل Tag يدوياً' : 'Or enter tag manually'}</Label>
              <div className="flex gap-2 mt-1">
                <Input 
                  value={manualTag} 
                  onChange={(e) => setManualTag(e.target.value)}
                  placeholder="RFID-XXX-000"
                  onKeyDown={(e) => e.key === 'Enter' && addManualTag()}
                />
                <Button onClick={addManualTag} variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Tags List */}
            {newTags.length > 0 && (
              <div>
                <Label className="mb-2 block">
                  {isAr ? `Tags مُضافة (${newTags.length})` : `Added Tags (${newTags.length})`}
                </Label>
                <div className="bg-gray-50 p-3 rounded-lg max-h-40 overflow-y-auto">
                  <div className="flex flex-wrap gap-2">
                    {newTags.map((tag, index) => (
                      <span 
                        key={index} 
                        className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-1"
                      >
                        <Radio className="w-3 h-3" />
                        {tag}
                        <button 
                          onClick={() => removeTag(tag)}
                          className="ml-1 text-blue-600 hover:text-red-600"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Save Button */}
            <Button 
              onClick={saveTags} 
              className="w-full" 
              disabled={newTags.length === 0}
              size="lg"
            >
              <Save className="w-5 h-5 mr-2" />
              {isAr ? `حفظ ${newTags.length} وحدة جديدة` : `Save ${newTags.length} new units`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={(open) => { setDeleteConfirmOpen(open); if (!open) setUnitToDelete(null); }}
        title={isAr ? 'تأكيد الحذف' : 'Confirm Delete'}
        description={isAr ? 'هل تريد حذف هذه الوحدة؟' : 'Delete this unit?'}
        confirmLabel={isAr ? 'حذف' : 'Delete'}
        cancelLabel={isAr ? 'إلغاء' : 'Cancel'}
        onConfirm={doDeleteUnit}
        variant="destructive"
      />
    </div>
  );
};

export default ProductUnits;
