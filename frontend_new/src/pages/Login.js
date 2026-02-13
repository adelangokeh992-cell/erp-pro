import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Building2, Lock, User, Globe, AlertCircle } from 'lucide-react';

const Login = () => {
  const { login, isAuthenticated, user } = useAuth();
  const { t, language, toggleLanguage } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [tenantCode, setTenantCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const isAr = language === 'ar';

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'super_admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(username, password, isSuperAdmin ? null : tenantCode);
    
    if (result.success) {
      if (result.user.role === 'super_admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      {/* Language Toggle */}
      <button
        onClick={toggleLanguage}
        className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all"
      >
        <Globe className="w-4 h-4" />
        {language === 'ar' ? 'English' : 'العربية'}
      </button>

      <Card className="w-full max-w-md bg-white/95 backdrop-blur shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-800">
            {isAr ? 'نظام ERP متعدد الشركات' : 'Multi-Tenant ERP System'}
          </CardTitle>
          <CardDescription>
            {isAr ? 'تسجيل الدخول للمتابعة' : 'Login to continue'}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {/* Login Type Toggle */}
          <div className="flex gap-2 mb-6">
            <Button
              type="button"
              variant={!isSuperAdmin ? "default" : "outline"}
              className="flex-1"
              onClick={() => setIsSuperAdmin(false)}
            >
              {isAr ? 'مستخدم شركة' : 'Tenant User'}
            </Button>
            <Button
              type="button"
              variant={isSuperAdmin ? "default" : "outline"}
              className="flex-1"
              onClick={() => setIsSuperAdmin(true)}
            >
              {isAr ? 'مدير النظام' : 'Super Admin'}
            </Button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isSuperAdmin && (
              <div>
                <Label className="text-gray-700">{t('tenantCode')}</Label>
                <div className="relative mt-1">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    value={tenantCode}
                    onChange={(e) => setTenantCode(e.target.value.toUpperCase())}
                    placeholder={isAr ? 'مثال: COMP1234' : 'e.g. COMP1234'}
                    className="pl-10 h-12"
                    required={!isSuperAdmin}
                    data-testid="tenant-code-input"
                  />
                </div>
              </div>
            )}

            <div>
              <Label className="text-gray-700">{t('username')}</Label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={isAr ? 'أدخل اسم المستخدم' : 'Enter username'}
                  className="pl-10 h-12"
                  required
                  data-testid="username-input"
                />
              </div>
            </div>

            <div>
              <Label className="text-gray-700">{t('password')}</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isAr ? 'أدخل كلمة المرور' : 'Enter password'}
                  className="pl-10 h-12"
                  required
                  data-testid="password-input"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-lg font-medium"
              disabled={loading}
              data-testid="login-button"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isAr ? 'جاري الدخول...' : 'Logging in...'}
                </span>
              ) : (
                t('loginButton')
              )}
            </Button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
            <p className="font-semibold mb-2">{isAr ? 'بيانات تجريبية:' : 'Demo Credentials:'}</p>
            <p><strong>{isAr ? 'مدير النظام:' : 'Super Admin:'}</strong> superadmin / Admin@123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
