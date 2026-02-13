import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Lock, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : '/api';

const ResetPassword = () => {
  const { language } = useLanguage();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const isAr = language === 'ar';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      toast.error(isAr ? 'رابط غير صالح' : 'Invalid link');
    }
  }, [token, isAr]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error(isAr ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
      return;
    }
    if (password.length < 8) {
      toast.error(isAr ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : 'Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API}/auth/reset-password`, { token, password });
      setSuccess(true);
      toast.success(isAr ? 'تم تغيير كلمة المرور' : 'Password changed');
    } catch (err) {
      const msg = err.response?.data?.detail || (isAr ? 'فشل التغيير' : 'Failed to reset');
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-bold mb-2 text-green-600">
              {isAr ? 'تم تغيير كلمة المرور بنجاح' : 'Password changed successfully'}
            </h2>
            <Link to="/login">
              <Button className="mt-4 gap-2">
                <ArrowLeft className="w-4 h-4" />
                {isAr ? 'تسجيل الدخول' : 'Login'}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="pt-6 text-center">
            <p className="text-red-600 mb-4">{isAr ? 'رابط غير صالح أو منتهي' : 'Invalid or expired link'}</p>
            <Link to="/forgot-password">
              <Button variant="outline">{isAr ? 'طلب رابط جديد' : 'Request new link'}</Button>
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
            {isAr ? 'تعيين كلمة مرور جديدة' : 'Set New Password'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>{isAr ? 'كلمة المرور الجديدة' : 'New Password'}</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isAr ? '8 أحرف على الأقل، حرف كبير، رقم، رمز' : 'Min 8 chars, uppercase, number, symbol'}
                  className="pl-10"
                  required
                  minLength={8}
                />
              </div>
            </div>
            <div>
              <Label>{isAr ? 'تأكيد كلمة المرور' : 'Confirm Password'}</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ كلمة المرور' : 'Save Password')}
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

export default ResetPassword;
