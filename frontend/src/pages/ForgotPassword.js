import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : '/api';

const ForgotPassword = () => {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/auth/forgot-password`, { email, lang: language });
      setSent(true);
      toast.success(isAr ? 'تم إرسال الرابط' : 'Reset link sent');
    } catch (err) {
      const msg = err.response?.data?.detail || (isAr ? 'فشل الإرسال' : 'Failed to send');
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">
              {isAr ? 'تحقق من بريدك' : 'Check your email'}
            </h2>
            <p className="text-gray-600 mb-6">
              {isAr ? 'أرسلنا رابط استعادة كلمة المرور إلى بريدك الإلكتروني.' : 'We sent a password reset link to your email.'}
            </p>
            <Link to="/login">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                {isAr ? 'العودة لتسجيل الدخول' : 'Back to Login'}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl">
            {isAr ? 'نسيت كلمة المرور؟' : 'Forgot Password?'}
          </CardTitle>
          <p className="text-gray-500 text-sm mt-1">
            {isAr ? 'أدخل بريدك الإلكتروني وسنرسل لك رابط الاستعادة' : 'Enter your email and we\'ll send you a reset link'}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>{isAr ? 'البريد الإلكتروني' : 'Email'}</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isAr ? 'بريدك@example.com' : 'you@example.com'}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (isAr ? 'جاري الإرسال...' : 'Sending...') : (isAr ? 'إرسال رابط الاستعادة' : 'Send Reset Link')}
            </Button>
          </form>
          <Link to="/login" className="block mt-4 text-center text-sm text-gray-600 hover:text-blue-600">
            <ArrowLeft className="w-4 h-4 inline mr-1" />
            {isAr ? 'العودة لتسجيل الدخول' : 'Back to Login'}
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;
