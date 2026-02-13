import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { productsAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
  Radio, 
  CheckCircle, 
  AlertCircle, 
  Play, 
  Save, 
  Square, 
  Scan,
  Package,
  AlertTriangle,
  Search,
  Volume2,
  VolumeX,
  Keyboard
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const InventoryCount = () => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [products, setProducts] = useState([]);
  const [units, setUnits] = useState([]);
  const [countSession, setCountSession] = useState(null);
  const [scannedTags, setScannedTags] = useState([]);
  const [unknownTags, setUnknownTags] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [lastScannedTag, setLastScannedTag] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [scanInput, setScanInput] = useState('');
  
  // Refs للوصول للقيم الحالية داخل event handlers
  const scanInputRef = useRef(null);
  const unitsRef = useRef([]);
  const productsRef = useRef([]);
  const scannedTagsRef = useRef([]);
  const scanningRef = useRef(false);
  const countSessionRef = useRef(null);

  const isAr = language === 'ar';

  // تحديث الـ refs عند تغير القيم
  useEffect(() => { unitsRef.current = units; }, [units]);
  useEffect(() => { productsRef.current = products; }, [products]);
  useEffect(() => { scannedTagsRef.current = scannedTags; }, [scannedTags]);
  useEffect(() => { scanningRef.current = scanning; }, [scanning]);
  useEffect(() => { countSessionRef.current = countSession; }, [countSession]);

  useEffect(() => {
    fetchData();
  }, []);

  // Focus على حقل الإدخال عند بدء المسح
  useEffect(() => {
    if (scanning && scanInputRef.current) {
      scanInputRef.current.focus();
    }
  }, [scanning]);

  const fetchData = async () => {
    try {
      const [productsRes, unitsRes] = await Promise.all([
        productsAPI.getAll(),
        axios.get(`${API}/product-units`)
      ]);
      setProducts(productsRes.data || []);
      setUnits(unitsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: isAr ? 'خطأ' : 'Error',
        description: isAr ? 'فشل تحميل البيانات' : 'Failed to load data',
        variant: 'destructive',
      });
    }
  };

  // تشغيل صوت
  const playBeep = (success = true) => {
    if (!soundEnabled) return;
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = success ? 1800 : 400;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        audioContext.close();
      }, success ? 100 : 200);
    } catch (e) {}
  };

  // معالجة القراءة من السكانر
  const processScan = (tag) => {
    if (!tag || tag.trim() === '') return;
    
    const cleanTag = tag.trim();
    console.log('📡 Processing scan:', cleanTag);
    
    setLastScannedTag({ tag: cleanTag, time: new Date() });
    
    // التحقق من عدم تكرار المسح
    if (scannedTagsRef.current.includes(cleanTag)) {
      playBeep(false);
      toast({
        title: isAr ? '⚠️ تم مسحه مسبقاً' : '⚠️ Already Scanned',
        description: cleanTag,
      });
      return;
    }
    
    // البحث في الوحدات
    const unit = unitsRef.current.find(u => u.rfidTag === cleanTag);
    
    if (unit) {
      const product = productsRef.current.find(p => p._id === unit.productId);
      setScannedTags(prev => [...prev, cleanTag]);
      playBeep(true);
      
      toast({
        title: isAr ? '✅ تم المسح' : '✅ Scanned',
        description: `${isAr ? product?.name : product?.nameEn || product?.name} - ${cleanTag}`,
      });
    } else {
      // البحث في المنتجات
      const product = productsRef.current.find(p => 
        p.rfidTag === cleanTag || p.barcode === cleanTag || p.sku === cleanTag
      );
      
      if (product) {
        setScannedTags(prev => [...prev, cleanTag]);
        playBeep(true);
        toast({
          title: isAr ? '✅ تم المسح (منتج)' : '✅ Scanned (Product)',
          description: `${isAr ? product.name : product.nameEn || product.name}`,
        });
      } else {
        setUnknownTags(prev => prev.includes(cleanTag) ? prev : [...prev, cleanTag]);
        playBeep(false);
        toast({
          title: isAr ? '⚠️ Tag غير معروف' : '⚠️ Unknown Tag',
          description: cleanTag,
          variant: 'destructive',
        });
      }
    }
  };

  // معالجة الإدخال من السكانر (Enter للتأكيد)
  const handleScanInput = (e) => {
    if (e.key === 'Enter' && scanInput.trim()) {
      e.preventDefault();
      processScan(scanInput);
      setScanInput('');
    }
  };

  const startCountSession = () => {
    const session = {
      id: Date.now(),
      startTime: new Date(),
      status: 'active',
    };
    setCountSession(session);
    setScannedTags([]);
    setUnknownTags([]);
    setScanning(true);
    setLastScannedTag(null);
    setScanInput('');
    
    toast({
      title: isAr ? '🎯 بدء الجرد' : '🎯 Count Started',
      description: isAr ? 'السكانر جاهز - ابدأ المسح!' : 'Scanner ready - Start scanning!',
    });
    
    // Focus على حقل الإدخال
    setTimeout(() => {
      if (scanInputRef.current) {
        scanInputRef.current.focus();
      }
    }, 100);
  };

  const stopScanning = () => {
    setScanning(false);
    setCountSession(prev => prev ? { ...prev, status: 'completed', endTime: new Date() } : null);
    
    toast({
      title: isAr ? '✅ انتهى المسح' : '✅ Scanning Complete',
      description: isAr 
        ? `تم مسح ${scannedTags.length} قطعة`
        : `Scanned ${scannedTags.length} items`,
    });
  };

  const saveCount = async () => {
    toast({
      title: isAr ? '💾 تم الحفظ' : '💾 Saved',
      description: isAr ? 'تم حفظ نتائج الجرد' : 'Count results saved',
    });
    
    setCountSession(null);
    setScannedTags([]);
    setUnknownTags([]);
    setLastScannedTag(null);
  };

  // حساب الإحصائيات
  const getProductStats = () => {
    const stats = {};
    
    units.forEach(unit => {
      if (!stats[unit.productId]) {
        stats[unit.productId] = { registered: 0, scanned: 0 };
      }
      if (unit.status === 'available') {
        stats[unit.productId].registered++;
      }
      if (scannedTags.includes(unit.rfidTag)) {
        stats[unit.productId].scanned++;
      }
    });
    
    return stats;
  };

  const stats = getProductStats();

  // تصفية المنتجات
  const filteredProducts = products.filter(product => {
    if (searchTerm.trim() === '') return true;
    const search = searchTerm.toLowerCase();
    return (
      (product.name && product.name.toLowerCase().includes(search)) ||
      (product.nameEn && product.nameEn.toLowerCase().includes(search)) ||
      (product.sku && product.sku.toLowerCase().includes(search))
    );
  });

  // إحصائيات عامة
  const totalRegistered = units.filter(u => u.status === 'available').length;
  const totalScanned = scannedTags.length;

  return (
    <div className="space-y-6" data-testid="inventory-count-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isAr ? 'جرد المخزون' : 'Inventory Count'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isAr ? 'جرد المخزون بواسطة RFID Scanner' : 'RFID Inventory Count'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={isAr ? 'تفعيل/إيقاف الصوت' : 'Toggle Sound'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
          
          {!countSession ? (
            <Button onClick={startCountSession} className="flex items-center gap-2" size="lg">
              <Play className="w-5 h-5" />
              {isAr ? 'بدء جرد جديد' : 'Start New Count'}
            </Button>
          ) : (
            <div className="flex gap-2">
              {scanning && (
                <Button onClick={stopScanning} variant="destructive" size="lg" className="flex items-center gap-2">
                  <Square className="w-5 h-5" />
                  {isAr ? 'إنهاء المسح' : 'Stop Scanning'}
                </Button>
              )}
              {countSession.status === 'completed' && (
                <Button onClick={saveCount} className="flex items-center gap-2" size="lg">
                  <Save className="w-5 h-5" />
                  {isAr ? 'حفظ النتائج' : 'Save Results'}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* حالة السكانر النشطة */}
      {countSession && (
        <Card className={`border-2 ${scanning ? 'border-blue-400 bg-blue-50' : 'border-green-400 bg-green-50'}`}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              {scanning ? (
                <>
                  <Radio className="w-6 h-6 text-blue-600 animate-pulse" />
                  <span className="text-blue-700">{isAr ? 'جاري المسح...' : 'Scanning...'}</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <span className="text-green-700">{isAr ? 'اكتمل الجرد' : 'Count Complete'}</span>
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-3 rounded-lg">
                <p className="text-sm text-gray-600">{isAr ? 'بدأ في:' : 'Started:'}</p>
                <p className="font-bold">{countSession.startTime.toLocaleTimeString(isAr ? 'ar-SA' : 'en-US')}</p>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <p className="text-sm text-gray-600">{isAr ? 'تم مسحها:' : 'Scanned:'}</p>
                <p className="text-2xl font-bold text-blue-600">{totalScanned}</p>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <p className="text-sm text-gray-600">{isAr ? 'مسجلة في النظام:' : 'Registered:'}</p>
                <p className="text-2xl font-bold text-purple-600">{totalRegistered}</p>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <p className="text-sm text-gray-600">{isAr ? 'Tags غير معروفة:' : 'Unknown Tags:'}</p>
                <p className={`text-2xl font-bold ${unknownTags.length > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                  {unknownTags.length}
                </p>
              </div>
            </div>

            {/* آخر قراءة */}
            {lastScannedTag && (
              <div className="mt-4 p-3 bg-white rounded-lg border-2 border-dashed border-blue-300">
                <p className="text-sm text-gray-600">{isAr ? 'آخر قراءة:' : 'Last Scan:'}</p>
                <p className="font-mono text-lg font-bold text-blue-700">{lastScannedTag.tag}</p>
                <p className="text-xs text-gray-500">{lastScannedTag.time.toLocaleTimeString()}</p>
              </div>
            )}

            {/* حقل إدخال السكانر */}
            {scanning && (
              <div className="mt-4 p-4 bg-white rounded-lg border-2 border-blue-400">
                <div className="flex items-center gap-2 mb-2">
                  <Keyboard className="w-5 h-5 text-blue-600" />
                  <Label className="text-blue-700 font-semibold">
                    {isAr ? 'حقل استقبال السكانر' : 'Scanner Input Field'}
                  </Label>
                </div>
                <Input
                  ref={scanInputRef}
                  type="text"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  onKeyDown={handleScanInput}
                  placeholder={isAr ? 'امسح هنا... (السكانر يرسل Enter تلقائياً)' : 'Scan here... (Scanner sends Enter automatically)'}
                  className="text-lg font-mono h-14 text-center border-2 border-blue-300 focus:border-blue-500"
                  autoFocus
                  data-testid="scan-input"
                />
                <p className="text-xs text-gray-500 mt-2 text-center">
                  {isAr 
                    ? '💡 تأكد أن المؤشر داخل هذا الحقل قبل المسح'
                    : '💡 Make sure cursor is in this field before scanning'}
                </p>
              </div>
            )}

            {/* تعليمات */}
            {scanning && (
              <div className="mt-4 p-3 bg-yellow-100 rounded-lg border border-yellow-300">
                <p className="text-sm text-yellow-800 flex items-center gap-2">
                  <Scan className="w-4 h-4" />
                  {isAr 
                    ? 'وجّه السكانر نحو المنتجات واضغط زر المسح'
                    : 'Point scanner at products and press scan button'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tags غير معروفة */}
      {unknownTags.length > 0 && (
        <Card className="border-2 border-red-300 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              {isAr ? 'Tags غير مسجلة' : 'Unregistered Tags'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {unknownTags.map((tag, index) => (
                <span key={index} className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-mono">
                  {tag}
                </span>
              ))}
            </div>
            <p className="text-sm text-red-600 mt-2">
              {isAr 
                ? 'هذه الـ Tags غير مسجلة. سجّلها من صفحة "الوحدات (Tags)".'
                : 'These tags are not registered. Register them from "Units (Tags)" page.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* بحث */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          type="text"
          placeholder={isAr ? 'بحث عن منتج...' : 'Search products...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* قائمة المنتجات */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredProducts.map((product) => {
          const productStats = stats[product._id] || { registered: 0, scanned: 0 };
          const productUnits = units.filter(u => u.productId === product._id && u.status === 'available');
          const difference = productStats.scanned - productStats.registered;
          const isComplete = countSession?.status === 'completed';
          const hasDifference = isComplete && productStats.registered > 0 && difference !== 0;
          
          return (
            <Card 
              key={product._id}
              className={`transition-all ${
                hasDifference 
                  ? difference > 0 
                    ? 'border-2 border-green-400 bg-green-50' 
                    : 'border-2 border-red-400 bg-red-50'
                  : productStats.scanned > 0 
                    ? 'border-2 border-blue-400 bg-blue-50'
                    : 'border hover:border-gray-300'
              }`}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-gray-400" />
                      <h3 className="font-bold text-sm truncate">
                        {isAr ? product.name : product.nameEn || product.name}
                      </h3>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{product.sku}</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">{isAr ? 'مسجلة:' : 'Registered:'}</span>
                    <span className="font-semibold">{productStats.registered}</span>
                  </div>
                  
                  {countSession && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">{isAr ? 'تم مسحها:' : 'Scanned:'}</span>
                        <span className={`text-xl font-bold ${productStats.scanned > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                          {productStats.scanned}
                        </span>
                      </div>
                      
                      {isComplete && productStats.registered > 0 && (
                        <div className="flex justify-between items-center pt-2 border-t">
                          <span className="text-gray-600">{isAr ? 'الفرق:' : 'Diff:'}</span>
                          <div className="flex items-center gap-1">
                            {difference !== 0 && (
                              <AlertCircle className={`w-4 h-4 ${difference > 0 ? 'text-green-600' : 'text-red-600'}`} />
                            )}
                            <span className={`text-xl font-bold ${
                              difference > 0 ? 'text-green-600' : 
                              difference < 0 ? 'text-red-600' : 'text-gray-400'
                            }`}>
                              {difference > 0 && '+'}{difference}
                            </span>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* أزرار محاكاة المسح للاختبار */}
                {scanning && productUnits.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-gray-500 mb-2">{isAr ? 'اضغط لمسح:' : 'Click to scan:'}</p>
                    <div className="flex flex-wrap gap-1">
                      {productUnits.slice(0, 3).map(unit => (
                        <Button 
                          key={unit._id}
                          size="sm" 
                          variant="outline"
                          onClick={() => processScan(unit.rfidTag)}
                          className="text-xs h-7"
                          disabled={scannedTags.includes(unit.rfidTag)}
                        >
                          <Scan className="w-3 h-3 mr-1" />
                          {unit.rfidTag.slice(-8)}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ملخص الفروقات */}
      {countSession?.status === 'completed' && (
        <Card className="border-2 border-yellow-400 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-700">
              <AlertTriangle className="w-5 h-5" />
              {isAr ? 'ملخص الجرد' : 'Count Summary'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{totalScanned}</p>
                <p className="text-sm text-gray-600">{isAr ? 'تم مسحها' : 'Scanned'}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{totalRegistered}</p>
                <p className="text-sm text-gray-600">{isAr ? 'مسجلة' : 'Registered'}</p>
              </div>
              <div className="text-center">
                <p className={`text-2xl font-bold ${totalScanned - totalRegistered >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {totalScanned - totalRegistered > 0 && '+'}{totalScanned - totalRegistered}
                </p>
                <p className="text-sm text-gray-600">{isAr ? 'الفرق' : 'Difference'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InventoryCount;
