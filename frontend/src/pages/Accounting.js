import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { accountingAPI } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Plus, DollarSign, TrendingUp, TrendingDown, FileText,
  Wallet, CreditCard, Building, Receipt
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const Accounting = () => {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('summary');
  const [summary, setSummary] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({
    category: 'other', description: '', amount: 0, paymentMethod: 'cash', notes: ''
  });

  const expenseCategories = [
    { value: 'rent', labelAr: 'إيجار', labelEn: 'Rent' },
    { value: 'salaries', labelAr: 'رواتب', labelEn: 'Salaries' },
    { value: 'utilities', labelAr: 'مرافق', labelEn: 'Utilities' },
    { value: 'supplies', labelAr: 'مستلزمات', labelEn: 'Supplies' },
    { value: 'marketing', labelAr: 'تسويق', labelEn: 'Marketing' },
    { value: 'maintenance', labelAr: 'صيانة', labelEn: 'Maintenance' },
    { value: 'other', labelAr: 'أخرى', labelEn: 'Other' },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [summaryRes, expensesRes, accountsRes, entriesRes] = await Promise.all([
        accountingAPI.getSummary(),
        accountingAPI.getExpenses(),
        accountingAPI.getAccounts(),
        accountingAPI.getJournalEntries()
      ]);
      setSummary(summaryRes.data);
      setExpenses(expensesRes.data);
      setAccounts(accountsRes.data);
      setJournalEntries(entriesRes.data);
    } catch (error) {
      console.error('Error fetching accounting data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async () => {
    if (!newExpense.description || newExpense.amount <= 0) {
      toast({ title: language === 'ar' ? 'خطأ' : 'Error', description: language === 'ar' ? 'يرجى ملء جميع الحقول' : 'Please fill all fields', variant: 'destructive' });
      return;
    }
    try {
      await accountingAPI.createExpense(newExpense);
      await fetchData();
      setExpenseDialogOpen(false);
      setNewExpense({ category: 'other', description: '', amount: 0, paymentMethod: 'cash', notes: '' });
      toast({ title: language === 'ar' ? 'تم' : 'Success', description: language === 'ar' ? 'تم إضافة المصروف' : 'Expense added' });
    } catch (error) {
      toast({ title: language === 'ar' ? 'خطأ' : 'Error', description: language === 'ar' ? 'فشل الإضافة' : 'Failed to add', variant: 'destructive' });
    }
  };

  const handleSeedAccounts = async () => {
    try {
      await accountingAPI.seedAccounts();
      await fetchData();
      toast({ title: language === 'ar' ? 'تم' : 'Success', description: language === 'ar' ? 'تم إنشاء الحسابات' : 'Accounts created' });
    } catch (error) {
      toast({ title: language === 'ar' ? 'خطأ' : 'Error', description: language === 'ar' ? 'الحسابات موجودة مسبقاً' : 'Accounts already exist', variant: 'destructive' });
    }
  };

  const formatCurrency = (value) => `$${(value || 0).toLocaleString()}`;

  const getCategoryLabel = (cat) => {
    const c = expenseCategories.find(c => c.value === cat);
    return c ? (language === 'ar' ? c.labelAr : c.labelEn) : cat;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="accounting-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('accounting')}</h1>
          <p className="text-gray-600 mt-1">{language === 'ar' ? 'إدارة الحسابات والمصروفات' : 'Manage accounts and expenses'}</p>
        </div>
        <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-expense-btn"><Plus className="w-4 h-4 mr-2" />{language === 'ar' ? 'إضافة مصروف' : 'Add Expense'}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{language === 'ar' ? 'إضافة مصروف جديد' : 'Add New Expense'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{language === 'ar' ? 'الفئة' : 'Category'}</Label>
                <Select value={newExpense.category} onValueChange={(v) => setNewExpense({...newExpense, category: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {language === 'ar' ? cat.labelAr : cat.labelEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{language === 'ar' ? 'الوصف' : 'Description'}</Label>
                <Input value={newExpense.description} onChange={(e) => setNewExpense({...newExpense, description: e.target.value})} />
              </div>
              <div>
                <Label>{language === 'ar' ? 'المبلغ' : 'Amount'}</Label>
                <Input type="number" min="0" step="0.01" value={newExpense.amount} onChange={(e) => setNewExpense({...newExpense, amount: parseFloat(e.target.value) || 0})} />
              </div>
              <div>
                <Label>{language === 'ar' ? 'طريقة الدفع' : 'Payment Method'}</Label>
                <Select value={newExpense.paymentMethod} onValueChange={(v) => setNewExpense({...newExpense, paymentMethod: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">{language === 'ar' ? 'نقداً' : 'Cash'}</SelectItem>
                    <SelectItem value="bank">{language === 'ar' ? 'تحويل بنكي' : 'Bank Transfer'}</SelectItem>
                    <SelectItem value="card">{language === 'ar' ? 'بطاقة' : 'Card'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
                <Input value={newExpense.notes} onChange={(e) => setNewExpense({...newExpense, notes: e.target.value})} />
              </div>
              <Button onClick={handleAddExpense} className="w-full">{language === 'ar' ? 'إضافة' : 'Add'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="summary">{language === 'ar' ? 'الملخص' : 'Summary'}</TabsTrigger>
          <TabsTrigger value="expenses">{language === 'ar' ? 'المصروفات' : 'Expenses'}</TabsTrigger>
          <TabsTrigger value="accounts">{language === 'ar' ? 'الحسابات' : 'Accounts'}</TabsTrigger>
          <TabsTrigger value="journal">{language === 'ar' ? 'القيود' : 'Journal'}</TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-green-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{language === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue'}</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(summary?.revenue?.total)}</p>
                    <p className="text-xs text-gray-500">{language === 'ar' ? 'هذا الشهر:' : 'This month:'} {formatCurrency(summary?.revenue?.monthly)}</p>
                  </div>
                  <TrendingUp className="w-10 h-10 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-red-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{language === 'ar' ? 'إجمالي المصروفات' : 'Total Expenses'}</p>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(summary?.expenses?.total)}</p>
                    <p className="text-xs text-gray-500">{language === 'ar' ? 'هذا الشهر:' : 'This month:'} {formatCurrency(summary?.expenses?.monthly)}</p>
                  </div>
                  <TrendingDown className="w-10 h-10 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card className={summary?.profit?.gross >= 0 ? 'bg-blue-50' : 'bg-orange-50'}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{language === 'ar' ? 'الربح الإجمالي' : 'Gross Profit'}</p>
                    <p className={`text-2xl font-bold ${summary?.profit?.gross >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                      {formatCurrency(summary?.profit?.gross)}
                    </p>
                  </div>
                  <DollarSign className="w-10 h-10 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className={summary?.profit?.monthly >= 0 ? 'bg-emerald-50' : 'bg-amber-50'}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{language === 'ar' ? 'ربح الشهر' : 'Monthly Profit'}</p>
                    <p className={`text-2xl font-bold ${summary?.profit?.monthly >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {formatCurrency(summary?.profit?.monthly)}
                    </p>
                  </div>
                  <Wallet className="w-10 h-10 text-emerald-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>{language === 'ar' ? 'المصروفات حسب الفئة' : 'Expenses by Category'}</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {summary?.expenses?.byCategory && Object.entries(summary.expenses.byCategory).map(([cat, amount], i) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span>{getCategoryLabel(cat)}</span>
                      <span className="font-bold">{formatCurrency(amount)}</span>
                    </div>
                  ))}
                  {(!summary?.expenses?.byCategory || Object.keys(summary.expenses.byCategory).length === 0) && (
                    <p className="text-center text-gray-500 py-4">{language === 'ar' ? 'لا توجد مصروفات' : 'No expenses'}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>{language === 'ar' ? 'الميزانية العمومية' : 'Balance Sheet'}</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                    <span className="flex items-center gap-2"><Building className="w-4 h-4" />{language === 'ar' ? 'الأصول' : 'Assets'}</span>
                    <span className="font-bold text-green-600">{formatCurrency(summary?.balanceSheet?.assets)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded">
                    <span className="flex items-center gap-2"><CreditCard className="w-4 h-4" />{language === 'ar' ? 'الالتزامات' : 'Liabilities'}</span>
                    <span className="font-bold text-red-600">{formatCurrency(summary?.balanceSheet?.liabilities)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                    <span className="flex items-center gap-2"><Wallet className="w-4 h-4" />{language === 'ar' ? 'حقوق الملكية' : 'Equity'}</span>
                    <span className="font-bold text-blue-600">{formatCurrency(summary?.balanceSheet?.equity)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-4">
          <div className="grid gap-4">
            {expenses.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Receipt className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500">{language === 'ar' ? 'لا توجد مصروفات' : 'No expenses'}</p>
                </CardContent>
              </Card>
            ) : (
              expenses.map((expense) => (
                <Card key={expense._id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-red-100 rounded-lg">
                        <TrendingDown className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <p className="font-medium">{expense.description}</p>
                        <p className="text-sm text-gray-500">
                          {getCategoryLabel(expense.category)} • {new Date(expense.date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-600">{formatCurrency(expense.amount)}</p>
                      <p className="text-xs text-gray-500">{expense.paymentMethod}</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Accounts Tab */}
        <TabsContent value="accounts" className="space-y-4">
          {accounts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-500 mb-4">{language === 'ar' ? 'لا توجد حسابات' : 'No accounts'}</p>
                <Button onClick={handleSeedAccounts}>
                  <Plus className="w-4 h-4 mr-2" />
                  {language === 'ar' ? 'إنشاء الحسابات الافتراضية' : 'Create Default Accounts'}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {['asset', 'liability', 'equity', 'revenue', 'expense'].map(type => {
                const typeAccounts = accounts.filter(a => a.type === type);
                if (typeAccounts.length === 0) return null;
                const typeLabels = {
                  asset: { ar: 'الأصول', en: 'Assets', color: 'green' },
                  liability: { ar: 'الالتزامات', en: 'Liabilities', color: 'red' },
                  equity: { ar: 'حقوق الملكية', en: 'Equity', color: 'blue' },
                  revenue: { ar: 'الإيرادات', en: 'Revenue', color: 'emerald' },
                  expense: { ar: 'المصروفات', en: 'Expenses', color: 'orange' },
                };
                return (
                  <Card key={type}>
                    <CardHeader className={`bg-${typeLabels[type].color}-50 py-3`}>
                      <CardTitle className="text-lg">{language === 'ar' ? typeLabels[type].ar : typeLabels[type].en}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y">
                        {typeAccounts.map(account => (
                          <div key={account._id} className="flex justify-between items-center p-3 hover:bg-gray-50">
                            <div>
                              <span className="font-mono text-sm text-gray-500 mr-2">{account.code}</span>
                              <span>{language === 'ar' ? account.name : account.nameEn}</span>
                            </div>
                            <span className="font-bold">{formatCurrency(account.balance)}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Journal Tab */}
        <TabsContent value="journal" className="space-y-4">
          {journalEntries.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-500">{language === 'ar' ? 'لا توجد قيود يومية' : 'No journal entries'}</p>
              </CardContent>
            </Card>
          ) : (
            journalEntries.map(entry => (
              <Card key={entry._id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base">{entry.entryNumber}</CardTitle>
                    <span className="text-sm text-gray-500">{new Date(entry.date).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-gray-600">{entry.description}</p>
                </CardHeader>
                <CardContent>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">{language === 'ar' ? 'الحساب' : 'Account'}</th>
                        <th className="text-right p-2">{language === 'ar' ? 'مدين' : 'Debit'}</th>
                        <th className="text-right p-2">{language === 'ar' ? 'دائن' : 'Credit'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entry.lines?.map((line, i) => (
                        <tr key={i} className="border-b">
                          <td className="p-2">{line.accountName}</td>
                          <td className="text-right p-2">{line.debit > 0 ? formatCurrency(line.debit) : '-'}</td>
                          <td className="text-right p-2">{line.credit > 0 ? formatCurrency(line.credit) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Accounting;
