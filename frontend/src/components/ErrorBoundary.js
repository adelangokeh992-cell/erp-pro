import React from 'react';
import { Button } from './ui/button';
import { AlertCircle } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureException(error, { extra: errorInfo });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const isAr = this.props.language === 'ar' || document.documentElement.dir === 'rtl';
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="flex justify-center">
              <AlertCircle className="w-16 h-16 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">
              {isAr ? 'حدث خطأ غير متوقع' : 'Something went wrong'}
            </h1>
            <p className="text-gray-600">
              {isAr 
                ? 'نعتذر عن هذا الإزعاج. جرّب تحديث الصفحة أو العودة للرئيسية.'
                : 'We apologize for the inconvenience. Try refreshing the page or going back home.'}
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Button onClick={this.handleRetry} variant="default">
                {isAr ? 'إعادة المحاولة' : 'Try Again'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/'}
              >
                {isAr ? 'الرئيسية' : 'Home'}
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
