import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';

/**
 * Renders custom fields defined for a tenant's entity (products, customers, etc.)
 * @param {string} entityType - The entity type (products, customers, suppliers, invoices)
 * @param {object} values - Current values for custom fields
 * @param {function} onChange - Callback when a field value changes
 */
const CustomFieldsRenderer = ({ entityType, values = {}, onChange }) => {
  const { getCustomFields } = useAuth();
  const { language } = useLanguage();
  const isAr = language === 'ar';
  
  const customFields = getCustomFields(entityType);
  
  if (!customFields || customFields.length === 0) {
    return null;
  }

  const handleChange = (fieldId, value) => {
    onChange({
      ...values,
      [fieldId]: value
    });
  };

  const renderField = (field) => {
    const fieldValue = values[field.fieldId] ?? field.defaultValue ?? '';
    const fieldLabel = isAr ? field.fieldName : (field.fieldNameEn || field.fieldName);

    switch (field.fieldType) {
      case 'text':
        return (
          <div key={field.fieldId} className="space-y-2">
            <Label>
              {fieldLabel}
              {field.required && <span className="text-red-500 mr-1">*</span>}
            </Label>
            <Input
              value={fieldValue}
              onChange={(e) => handleChange(field.fieldId, e.target.value)}
              placeholder={fieldLabel}
              required={field.required}
              data-testid={`custom-field-${field.fieldId}`}
            />
          </div>
        );

      case 'number':
        return (
          <div key={field.fieldId} className="space-y-2">
            <Label>
              {fieldLabel}
              {field.required && <span className="text-red-500 mr-1">*</span>}
            </Label>
            <Input
              type="number"
              value={fieldValue}
              onChange={(e) => handleChange(field.fieldId, parseFloat(e.target.value) || 0)}
              placeholder={fieldLabel}
              required={field.required}
              data-testid={`custom-field-${field.fieldId}`}
            />
          </div>
        );

      case 'select':
        return (
          <div key={field.fieldId} className="space-y-2">
            <Label>
              {fieldLabel}
              {field.required && <span className="text-red-500 mr-1">*</span>}
            </Label>
            <Select
              value={fieldValue}
              onValueChange={(v) => handleChange(field.fieldId, v)}
            >
              <SelectTrigger data-testid={`custom-field-${field.fieldId}`}>
                <SelectValue placeholder={isAr ? 'اختر...' : 'Select...'} />
              </SelectTrigger>
              <SelectContent>
                {(field.options || []).map((option, idx) => (
                  <SelectItem key={idx} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'date':
        return (
          <div key={field.fieldId} className="space-y-2">
            <Label>
              {fieldLabel}
              {field.required && <span className="text-red-500 mr-1">*</span>}
            </Label>
            <Input
              type="date"
              value={fieldValue}
              onChange={(e) => handleChange(field.fieldId, e.target.value)}
              required={field.required}
              data-testid={`custom-field-${field.fieldId}`}
            />
          </div>
        );

      case 'boolean':
        return (
          <div key={field.fieldId} className="flex items-center gap-3 py-2">
            <Switch
              checked={fieldValue === true || fieldValue === 'true'}
              onCheckedChange={(checked) => handleChange(field.fieldId, checked)}
              data-testid={`custom-field-${field.fieldId}`}
            />
            <Label>
              {fieldLabel}
              {field.required && <span className="text-red-500 mr-1">*</span>}
            </Label>
          </div>
        );

      case 'textarea':
        return (
          <div key={field.fieldId} className="space-y-2">
            <Label>
              {fieldLabel}
              {field.required && <span className="text-red-500 mr-1">*</span>}
            </Label>
            <textarea
              value={fieldValue}
              onChange={(e) => handleChange(field.fieldId, e.target.value)}
              placeholder={fieldLabel}
              required={field.required}
              className="w-full min-h-[80px] px-3 py-2 border rounded-md text-sm"
              data-testid={`custom-field-${field.fieldId}`}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 pt-4 border-t">
      <h4 className="font-medium text-gray-700">
        {isAr ? 'حقول إضافية' : 'Additional Fields'}
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {customFields
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .map(renderField)}
      </div>
    </div>
  );
};

export default CustomFieldsRenderer;
