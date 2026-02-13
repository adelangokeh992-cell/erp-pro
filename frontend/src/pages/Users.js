import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { usersAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Plus, Search, Mail, Phone, Shield, User as UserIcon, Edit, Save, X, Key } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import LimitWarning, { useLimitCheck } from '../components/LimitWarning';

const Users = () => {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { checkLimit } = useLimitCheck();
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '', name: '', nameEn: '', email: '', phone: '', role: 'worker', jobTitle: '', password: '', isActive: true
  });
  const [newPassword, setNewPassword] = useState('');

  const isAr = language === 'ar';

  const roles = [
    { value: 'tenant_admin', labelAr: 'مدير الشركة', labelEn: 'Company Admin' },
    { value: 'cashier', labelAr: 'كاشير', labelEn: 'Cashier' },
    { value: 'inventory_manager', labelAr: 'مدير مخزون', labelEn: 'Inventory Manager' },
    { value: 'accountant', labelAr: 'محاسب', labelEn: 'Accountant' },
    { value: 'worker', labelAr: 'موظف', labelEn: 'Worker' }
  ];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await usersAPI.getAll();
      setUsers(response.data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      username: '', name: '', nameEn: '', email: '', phone: '', role: 'worker', jobTitle: '', password: '', isActive: true
    });
  };

  const handleAdd = async () => {
    // Check limit before adding
    const limitCheck = checkLimit('users');
    if (!limitCheck.canAdd) {
      toast({ title: isAr ? 'خطأ' : 'Error', description: isAr ? 'تم الوصول للحد الأقصى من المستخدمين' : 'Maximum user limit reached', variant: 'destructive' });
      return;
    }
    
    if (!formData.username || !formData.name || !formData.email || !formData.password) {
      toast({ title: isAr ? 'خطأ' : 'Error', description: isAr ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields', variant: 'destructive' });
      return;
    }
    try {
      await usersAPI.create(formData);
      await fetchUsers();
      setAddDialogOpen(false);
      resetForm();
      toast({ title: isAr ? 'تم الإضافة' : 'Added', description: isAr ? 'تم إضافة المستخدم بنجاح' : 'User added successfully' });
    } catch (error) {
      const msg = error.response?.data?.detail || (isAr ? 'فشل الإضافة' : 'Failed to add');
      toast({ title: isAr ? 'خطأ' : 'Error', description: msg, variant: 'destructive' });
    }
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    const name = user.name || user.fullName || '';
    const nameEn = user.nameEn || user.fullNameEn || '';
    setFormData({
      username: user.username || '',
      name,
      nameEn,
      email: user.email || '',
      phone: user.phone || '',
      role: user.role || 'worker',
      jobTitle: user.jobTitle || '',
      isActive: user.isActive !== false,
      password: ''
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedUser) return;
    try {
      const updateData = { ...formData };
      delete updateData.password; // لا نرسل كلمة السر في التحديث العادي
      
      await usersAPI.update(selectedUser._id, updateData);
      await fetchUsers();
      setEditDialogOpen(false);
      setSelectedUser(null);
      resetForm();
      toast({ title: isAr ? 'تم التحديث' : 'Updated', description: isAr ? 'تم تحديث المستخدم بنجاح' : 'User updated successfully' });
    } catch (error) {
      toast({ title: isAr ? 'خطأ' : 'Error', description: isAr ? 'فشل التحديث' : 'Failed to update', variant: 'destructive' });
    }
  };

  const openPasswordDialog = (user) => {
    setSelectedUser(user);
    setNewPassword('');
    setPasswordDialogOpen(true);
  };

  const handleChangePassword = async () => {
    if (!selectedUser || !newPassword) {
      toast({ title: isAr ? 'خطأ' : 'Error', description: isAr ? 'يرجى إدخال كلمة السر الجديدة' : 'Please enter new password', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 4) {
      toast({ title: isAr ? 'خطأ' : 'Error', description: isAr ? 'كلمة السر قصيرة جداً' : 'Password too short', variant: 'destructive' });
      return;
    }
    try {
      await usersAPI.update(selectedUser._id, { password: newPassword });
      setPasswordDialogOpen(false);
      setSelectedUser(null);
      setNewPassword('');
      toast({ title: isAr ? 'تم التغيير' : 'Changed', description: isAr ? 'تم تغيير كلمة السر بنجاح' : 'Password changed successfully' });
    } catch (error) {
      toast({ title: isAr ? 'خطأ' : 'Error', description: isAr ? 'فشل تغيير كلمة السر' : 'Failed to change password', variant: 'destructive' });
    }
  };

  const getRoleLabel = (role) => {
    const r = roles.find(r => r.value === role);
    return r ? (isAr ? r.labelAr : r.labelEn) : role;
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'tenant_admin': return 'bg-red-100 text-red-800';
      case 'cashier': return 'bg-amber-100 text-amber-800';
      case 'inventory_manager': return 'bg-blue-100 text-blue-800';
      case 'accountant': return 'bg-green-100 text-green-800';
      case 'worker': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredUsers = users.filter((user) =>
    (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.nameEn && user.nameEn.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const UserForm = ({ isEdit = false }) => (
    <div className="space-y-4">
      {!isEdit && <LimitWarning type="users" />}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>{isAr ? 'اسم المستخدم *' : 'Username *'}</Label>
          <Input value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} disabled={isEdit} data-testid="username-input" />
        </div>
        <div>
          <Label>{isAr ? 'الدور / الوظيفة' : 'Role / Job'}</Label>
          <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value})}>
            <SelectTrigger data-testid="role-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {roles.map(role => (
                <SelectItem key={role.value} value={role.value}>
                  {isAr ? role.labelAr : role.labelEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>{isAr ? 'الاسم (عربي) *' : 'Name (Arabic) *'}</Label>
          <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
        </div>
        <div>
          <Label>{isAr ? 'الاسم (إنجليزي)' : 'Name (English)'}</Label>
          <Input value={formData.nameEn} onChange={(e) => setFormData({...formData, nameEn: e.target.value})} />
        </div>
      </div>
      <div>
        <Label>{isAr ? 'البريد الإلكتروني *' : 'Email *'}</Label>
        <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} data-testid="email-input" />
      </div>
      <div>
        <Label>{t('phone')}</Label>
        <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
      </div>
      {!isEdit && (
        <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
          <Label className="text-yellow-700 flex items-center gap-2">
            <Key className="w-4 h-4" />
            {isAr ? 'كلمة السر *' : 'Password *'}
          </Label>
          <Input 
            type="password" 
            value={formData.password} 
            onChange={(e) => setFormData({...formData, password: e.target.value})} 
            placeholder={isAr ? 'أدخل كلمة السر' : 'Enter password'}
            className="mt-2"
          />
        </div>
      )}
      {isEdit && (
        <div className="flex items-center gap-2">
          <input 
            type="checkbox" 
            id="isActive" 
            checked={formData.isActive} 
            onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
            className="w-4 h-4"
          />
          <Label htmlFor="isActive">{isAr ? 'المستخدم نشط' : 'User is Active'}</Label>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6" data-testid="users-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('users')}</h1>
          <p className="text-gray-600 mt-1">{isAr ? `إجمالي الموظفين: ${users.length}` : `Total employees: ${users.length}`}</p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2" onClick={() => resetForm()} data-testid="add-user-btn">
              <Plus className="w-4 h-4" />{isAr ? 'إضافة موظف' : 'Add Employee'}
            </Button>
          </DialogTrigger>
          <DialogContent>
          <DialogHeader>
            <DialogTitle>{isAr ? 'إضافة موظف جديد' : 'Add New Employee'}</DialogTitle>
          </DialogHeader>
            <UserForm />
            <div className="flex gap-2 mt-4">
              <Button onClick={handleAdd} className="flex-1" data-testid="submit-user-btn">
                <Save className="w-4 h-4 mr-2" />{isAr ? 'حفظ' : 'Save'}
              </Button>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                <X className="w-4 h-4 mr-2" />{isAr ? 'إلغاء' : 'Cancel'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input placeholder={t('search')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" data-testid="search-input" />
      </div>

      {filteredUsers.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <UserIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500">{isAr ? 'لا يوجد مستخدمين' : 'No users found'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((user) => (
            <Card key={user._id} className="hover:shadow-xl transition-all" data-testid={`user-${user._id}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-lg">{isAr ? (user.fullName || user.name) : (user.fullNameEn || user.nameEn || user.name)}</h3>
                    <p className="text-gray-500 text-sm">@{user.username}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${getRoleColor(user.role)}`}>
                    {getRoleLabel(user.role)}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span>{user.email}</span>
                  </div>
                  {user.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <span>{user.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Shield className="w-4 h-4 text-gray-500" />
                    <span className={user.isActive !== false ? 'text-green-600' : 'text-red-600'}>
                      {user.isActive !== false ? (isAr ? 'نشط' : 'Active') : (isAr ? 'غير نشط' : 'Inactive')}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 mt-4 pt-3 border-t">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(user)} className="flex-1">
                    <Edit className="w-4 h-4 mr-1" />{isAr ? 'تعديل' : 'Edit'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openPasswordDialog(user)} className="flex-1">
                    <Key className="w-4 h-4 mr-1" />{isAr ? 'كلمة السر' : 'Password'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isAr ? 'تعديل المستخدم' : 'Edit User'}</DialogTitle>
          </DialogHeader>
          <UserForm isEdit={true} />
          <div className="flex gap-2 mt-4">
            <Button onClick={handleUpdate} className="flex-1">
              <Save className="w-4 h-4 mr-2" />{isAr ? 'حفظ التغييرات' : 'Save Changes'}
            </Button>
            <Button variant="outline" onClick={() => { setEditDialogOpen(false); setSelectedUser(null); }}>
              <X className="w-4 h-4 mr-2" />{isAr ? 'إلغاء' : 'Cancel'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              {isAr ? 'تغيير كلمة السر' : 'Change Password'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">
              {isAr ? 'تغيير كلمة السر للمستخدم:' : 'Change password for user:'} <strong>@{selectedUser?.username}</strong>
            </p>
            <div>
              <Label>{isAr ? 'كلمة السر الجديدة' : 'New Password'}</Label>
              <Input 
                type="password" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                placeholder={isAr ? 'أدخل كلمة السر الجديدة' : 'Enter new password'}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleChangePassword} className="flex-1">
                <Save className="w-4 h-4 mr-2" />{isAr ? 'تغيير' : 'Change'}
              </Button>
              <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>
                <X className="w-4 h-4 mr-2" />{isAr ? 'إلغاء' : 'Cancel'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Users;
