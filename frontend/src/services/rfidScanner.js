/**
 * RFID Scanner Service - Real Hardware Integration
 * 
 * يدعم C6100 وأي سكانر يعمل بوضع Keyboard Wedge
 * السكانر يرسل البيانات كضغطات لوحة مفاتيح سريعة
 */

// إعدادات السكانر
const SCANNER_CONFIG = {
  // الوقت الأقصى بين الأحرف (بالمللي ثانية) - زيادة للـ RFID
  MAX_CHAR_INTERVAL: 150,
  // الحد الأدنى لطول الـ Tag
  MIN_TAG_LENGTH: 2,
  // الحد الأقصى لطول الـ Tag  
  MAX_TAG_LENGTH: 128,
  // أحرف نهاية القراءة
  END_CHARS: ['Enter', 'Tab', '\r', '\n'],
  // تفعيل الصوت
  ENABLE_SOUND: true
};

class RFIDScannerService {
  constructor() {
    this.buffer = '';
    this.lastKeyTime = 0;
    this.listeners = new Set();
    this.isListening = false;
    this.scanCount = 0;
  }

  /**
   * إضافة مستمع للقراءات
   */
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * إشعار جميع المستمعين
   */
  notifyListeners(eventType, data) {
    this.listeners.forEach(callback => {
      try {
        callback({ type: eventType, ...data });
      } catch (e) {
        console.error('RFID Listener error:', e);
      }
    });
  }

  /**
   * تشغيل صوت عند القراءة
   */
  playBeep() {
    if (!SCANNER_CONFIG.ENABLE_SOUND) return;
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 1800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        audioContext.close();
      }, 100);
    } catch (e) {
      // تجاهل أخطاء الصوت
    }
  }

  /**
   * معالجة ضغطة مفتاح
   */
  handleKeyPress = (event) => {
    if (!this.isListening) return;
    
    const currentTime = Date.now();
    const timeDiff = currentTime - this.lastKeyTime;
    
    // إذا مر وقت طويل، ابدأ buffer جديد
    if (timeDiff > SCANNER_CONFIG.MAX_CHAR_INTERVAL && this.buffer.length > 0) {
      // هذا إدخال يدوي بطيء، تجاهله
      this.buffer = '';
    }
    
    this.lastKeyTime = currentTime;
    
    // التحقق من نهاية القراءة
    if (SCANNER_CONFIG.END_CHARS.includes(event.key)) {
      if (this.buffer.length >= SCANNER_CONFIG.MIN_TAG_LENGTH) {
        // قراءة صحيحة!
        const tag = this.buffer.trim();
        this.buffer = '';
        this.scanCount++;
        
        // منع السلوك الافتراضي
        event.preventDefault();
        event.stopPropagation();
        
        // تشغيل صوت
        this.playBeep();
        
        // إشعار المستمعين
        this.notifyListeners('scan', {
          tag: tag,
          timestamp: new Date().toISOString(),
          scanNumber: this.scanCount
        });
        
        console.log('📡 RFID Tag Scanned:', tag);
        return;
      }
      this.buffer = '';
      return;
    }
    
    // تجاهل المفاتيح الخاصة
    if (event.key.length > 1 && !event.key.match(/^[A-Za-z0-9]$/)) {
      return;
    }
    
    // إضافة الحرف للـ buffer
    if (event.key.length === 1) {
      this.buffer += event.key;
      
      // حماية من buffer طويل جداً
      if (this.buffer.length > SCANNER_CONFIG.MAX_TAG_LENGTH) {
        this.buffer = this.buffer.slice(-SCANNER_CONFIG.MAX_TAG_LENGTH);
      }
    }
  };

  /**
   * بدء الاستماع للسكانر
   */
  startListening() {
    if (this.isListening) return;
    
    this.isListening = true;
    this.buffer = '';
    this.lastKeyTime = 0;
    
    document.addEventListener('keydown', this.handleKeyPress, true);
    
    this.notifyListeners('status', { 
      status: 'listening',
      message: 'جاهز لاستقبال RFID'
    });
    
    console.log('🎯 RFID Scanner: Started listening');
  }

  /**
   * إيقاف الاستماع
   */
  stopListening() {
    if (!this.isListening) return;
    
    this.isListening = false;
    this.buffer = '';
    
    document.removeEventListener('keydown', this.handleKeyPress, true);
    
    this.notifyListeners('status', {
      status: 'stopped',
      message: 'توقف الاستماع'
    });
    
    console.log('🛑 RFID Scanner: Stopped listening');
  }

  /**
   * الحالة الحالية
   */
  getStatus() {
    return {
      isListening: this.isListening,
      scanCount: this.scanCount
    };
  }

  /**
   * إعادة تعيين العداد
   */
  resetCount() {
    this.scanCount = 0;
  }

  /**
   * محاكاة قراءة (للاختبار)
   */
  simulateScan(tag) {
    if (!tag) {
      // توليد tag عشوائي
      tag = 'RFID-' + Math.random().toString(36).substr(2, 8).toUpperCase();
    }
    
    this.scanCount++;
    this.playBeep();
    
    this.notifyListeners('scan', {
      tag: tag,
      timestamp: new Date().toISOString(),
      scanNumber: this.scanCount,
      simulated: true
    });
    
    console.log('🔬 Simulated RFID Scan:', tag);
  }
}

// إنشاء instance واحد
const rfidScanner = new RFIDScannerService();

export default rfidScanner;
export { SCANNER_CONFIG };
