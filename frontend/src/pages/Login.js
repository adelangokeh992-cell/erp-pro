import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Lock, User, AlertCircle, Building2 } from 'lucide-react';

const Login = () => {
  const { language } = useLanguage();
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [tenantCode, setTenantCode] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const isAr = language === 'ar';

  // إذا كان المستخدم مسجّل دخول فعلاً، وجّهه حسب دوره (لا تبقيه على صفحة الدخول)
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'super_admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(username, password, isSuperAdmin ? null : (tenantCode || null));
    if (result?.success) {
      if (result.user?.role === 'super_admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } else {
      setError(result?.error || (isAr ? 'فشل تسجيل الدخول' : 'Login failed'));
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl">
            {isAr ? 'تسجيل الدخول' : 'Login'}
          </CardTitle>
          <p className="text-gray-500 text-sm mt-1">
            ERP Pro — {isAr ? 'نظام إدارة الموارد المؤسسية' : 'Enterprise Resource Planning'}
          </p>
        </CardHeader>
        <CardContent>
          {/* نوع الدخول: مستخدم شركة أو مدير نظام */}
          <div className="flex gap-2 mb-4">
            <Button
              type="button"
              variant={!isSuperAdmin ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => { setIsSuperAdmin(false); setError(''); }}
            >
              {isAr ? 'مستخدم شركة' : 'Tenant User'}
            </Button>
            <Button
              type="button"
              variant={isSuperAdmin ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => { setIsSuperAdmin(true); setError(''); }}
            >
              {isAr ? 'مدير النظام' : 'Super Admin'}
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {!isSuperAdmin && (
              <div>
                <Label htmlFor="tenantCode">{isAr ? 'رمز الشركة' : 'Company Code'}</Label>
                <div className="relative mt-1">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    id="tenantCode"
                    type="text"
                    value={tenantCode}
                    onChange={(e) => setTenantCode(e.target.value.toUpperCase())}
                    className="pl-10"
                    placeholder={isAr ? 'مثال: DEMO' : 'e.g. DEMO'}
                    required={!isSuperAdmin}
                    data-testid="tenant-code-input"
                  />
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="username">{isAr ? 'اسم المستخدم' : 'Username'}</Label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10"
                  placeholder={isAr ? 'أدخل اسم المستخدم' : 'Enter username'}
                  required
                  data-testid="username-input"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password">{isAr ? 'كلمة المرور' : 'Password'}</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  placeholder={isAr ? 'أدخل كلمة المرور' : 'Enter password'}
                  required
                  data-testid="password-input"
                />
              </div>
            </div>

            <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline block text-right -mt-2">
              {isAr ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
            </Link>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
              data-testid="login-btn"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                isAr ? 'دخول' : 'Login'
              )}
            </Button>

            <div className="mt-5 p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
              <p className="font-medium mb-2">{isAr ? 'للتجربة استخدم:' : 'For testing use:'}</p>
              <p><strong>{isAr ? 'مستخدم شركة:' : 'Tenant:'}</strong> DEMO / demo / Demo@123</p>
              <p className="mt-1"><strong>{isAr ? 'مدير النظام:' : 'Super Admin:'}</strong> superadmin / Admin@123</p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
