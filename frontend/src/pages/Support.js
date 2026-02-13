import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ArrowLeft, Mail, Send } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : '/api';

const Support = () => {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/support/contact`, formData);
      toast.success(isAr ? 'تم إرسال رسالتك' : 'Message sent');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      toast.error(err.response?.data?.detail || (isAr ? 'فشل الإرسال' : 'Failed to send'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link to="/">
          <Button variant="ghost" className="mb-6 gap-2">
            <ArrowLeft className="w-4 h-4" />
            {isAr ? 'العودة' : 'Back'}
          </Button>
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {isAr ? 'الدعم الفني' : 'Support'}
        </h1>
        <p className="text-gray-600 mb-8">
          {isAr ? 'تواصل معنا لأي استفسار أو مساعدة' : 'Contact us for any questions or assistance'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-xl border shadow-sm">
          <div>
            <Label>{isAr ? 'الاسم' : 'Name'}</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={isAr ? 'اسمك' : 'Your name'}
              required
            />
          </div>
          <div>
            <Label>{isAr ? 'البريد الإلكتروني' : 'Email'}</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder={isAr ? 'بريدك' : 'Your email'}
              required
            />
          </div>
          <div>
            <Label>{isAr ? 'الموضوع' : 'Subject'}</Label>
            <Input
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder={isAr ? 'موضوع الرسالة' : 'Subject'}
              required
            />
          </div>
          <div>
            <Label>{isAr ? 'الرسالة' : 'Message'}</Label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder={isAr ? 'اكتب رسالتك...' : 'Write your message...'}
              required
              className="w-full min-h-[120px] px-3 py-2 border rounded-md text-sm"
              rows={5}
            />
          </div>
          <Button type="submit" disabled={loading} className="gap-2">
            <Send className="w-4 h-4" />
            {loading ? (isAr ? 'جاري الإرسال...' : 'Sending...') : (isAr ? 'إرسال' : 'Send')}
          </Button>
        </form>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg flex items-center gap-3">
          <Mail className="w-6 h-6 text-blue-600" />
          <div>
            <p className="font-medium text-gray-900">{isAr ? 'البريد المباشر' : 'Direct Email'}</p>
            <p className="text-sm text-gray-600">support@erppro.com</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Support;
