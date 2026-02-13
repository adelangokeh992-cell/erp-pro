# API Contracts & Backend Integration Plan

## Overview
This document outlines the API contracts, data models, and integration strategy for the ERP system with RFID support.

## 1. Database Schema (MongoDB)

### Products Collection
```javascript
{
  _id: ObjectId,
  name: String,          // Arabic name
  nameEn: String,        // English name
  sku: String (unique),
  barcode: String,
  rfidTag: String,       // RFID UHF tag ID
  category: String,
  categoryEn: String,
  stock: Number,
  costPrice: Number,
  salePrice: Number,
  reorderLevel: Number,
  warehouseId: ObjectId,
  eslDeviceId: String,   // ESL device linked to this product
  createdAt: Date,
  updatedAt: Date
}
```

### Customers Collection
```javascript
{
  _id: ObjectId,
  name: String,
  nameEn: String,
  phone: String,
  email: String,
  address: String,
  balance: Number,       // Negative = debt, Positive = credit
  type: String,          // "company" or "individual"
  createdAt: Date,
  updatedAt: Date
}
```

### Suppliers Collection
```javascript
{
  _id: ObjectId,
  name: String,
  nameEn: String,
  phone: String,
  email: String,
  address: String,
  balance: Number,       // Negative = we owe them
  createdAt: Date,
  updatedAt: Date
}
```

### Invoices Collection
```javascript
{
  _id: ObjectId,
  invoiceNumber: String (unique),
  customerId: ObjectId,
  customerName: String,
  date: Date,
  dueDate: Date,
  items: [{
    productId: ObjectId,
    productName: String,
    quantity: Number,
    price: Number,
    total: Number
  }],
  subtotal: Number,
  tax: Number,
  discount: Number,
  total: Number,
  status: String,        // "paid", "unpaid", "partial"
  createdAt: Date,
  updatedAt: Date
}
```

### Purchases Collection
```javascript
{
  _id: ObjectId,
  purchaseOrderNumber: String (unique),
  supplierId: ObjectId,
  supplierName: String,
  date: Date,
  items: [{
    productId: ObjectId,
    productName: String,
    quantity: Number,
    price: Number,
    total: Number
  }],
  subtotal: Number,
  tax: Number,
  total: Number,
  status: String,        // "received", "pending", "cancelled"
  createdAt: Date,
  updatedAt: Date
}
```

### Users Collection
```javascript
{
  _id: ObjectId,
  username: String (unique),
  password: String (hashed),
  name: String,
  nameEn: String,
  email: String,
  role: String,          // "admin", "manager", "accountant", "staff"
  active: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Warehouses Collection
```javascript
{
  _id: ObjectId,
  name: String,
  nameEn: String,
  location: String,
  manager: String,
  capacity: Number,
  currentStock: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### ESL Devices Collection
```javascript
{
  _id: ObjectId,
  deviceId: String (unique),
  productId: ObjectId,
  status: String,        // "online", "offline"
  battery: Number,       // 0-100
  lastUpdate: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Settings Collection
```javascript
{
  _id: ObjectId,
  key: String (unique),  // "exchangeRate", "operationMode", "currency"
  value: Mixed,
  updatedAt: Date
}
```

## 2. API Endpoints

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create new product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `GET /api/products/rfid/:tag` - Get product by RFID tag
- `GET /api/products/barcode/:code` - Get product by barcode
- `GET /api/products/low-stock` - Get low stock products

### Customers
- `GET /api/customers` - Get all customers
- `GET /api/customers/:id` - Get customer by ID
- `POST /api/customers` - Create customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### Suppliers
- `GET /api/suppliers` - Get all suppliers
- `GET /api/suppliers/:id` - Get supplier by ID
- `POST /api/suppliers` - Create supplier
- `PUT /api/suppliers/:id` - Update supplier
- `DELETE /api/suppliers/:id` - Delete supplier

### Invoices
- `GET /api/invoices` - Get all invoices
- `GET /api/invoices/:id` - Get invoice by ID
- `POST /api/invoices` - Create invoice
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice

### Purchases
- `GET /api/purchases` - Get all purchases
- `GET /api/purchases/:id` - Get purchase by ID
- `POST /api/purchases` - Create purchase
- `PUT /api/purchases/:id` - Update purchase
- `DELETE /api/purchases/:id` - Delete purchase

### Users
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/users` - Get all users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Warehouses
- `GET /api/warehouses` - Get all warehouses
- `POST /api/warehouses` - Create warehouse
- `PUT /api/warehouses/:id` - Update warehouse
- `DELETE /api/warehouses/:id` - Delete warehouse

### ESL Management
- `GET /api/esl/devices` - Get all ESL devices
- `GET /api/esl/devices/:id` - Get ESL device by ID
- `POST /api/esl/devices` - Register new ESL device
- `PUT /api/esl/devices/:id` - Update ESL device
- `POST /api/esl/devices/:id/update-price` - Update price on device
- `POST /api/esl/update-all` - Update all devices

### Settings
- `GET /api/settings` - Get all settings
- `GET /api/settings/:key` - Get setting by key
- `PUT /api/settings/:key` - Update setting

### RFID Integration
- `POST /api/rfid/scan` - Process RFID scan
- `GET /api/rfid/status` - Get RFID scanner status
- `POST /api/rfid/inventory-check` - Bulk inventory check with RFID

### Reports
- `GET /api/reports/sales` - Sales report
- `GET /api/reports/purchases` - Purchases report
- `GET /api/reports/inventory` - Inventory report
- `GET /api/reports/profit-loss` - Profit & Loss report
- `GET /api/reports/dashboard` - Dashboard statistics

## 3. Frontend Integration

### Replace Mock Data:
1. Remove `mock/mockData.js` imports
2. Replace with API calls using axios
3. Add loading states and error handling
4. Update components to use real data from backend

### Example Integration:
```javascript
// Before (Mock):
import { mockProducts } from '../mock/mockData';
const [products] = useState(mockProducts);

// After (API):
const [products, setProducts] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetchProducts();
}, []);

const fetchProducts = async () => {
  try {
    const response = await axios.get(`${API}/products`);
    setProducts(response.data);
  } catch (error) {
    console.error('Error fetching products:', error);
  } finally {
    setLoading(false);
  }
};
```

## 4. RFID Integration Strategy

### C6100 Scanner Integration:
1. Scanner connects via WiFi/Bluetooth to local network
2. Backend API receives RFID scans via WebSocket or HTTP
3. Backend looks up product by RFID tag
4. Returns product info immediately
5. Updates inventory in real-time

### WebSocket Events:
- `rfid:scan` - New RFID tag detected
- `rfid:inventory` - Bulk inventory scan complete
- `esl:status` - ESL device status update

## 5. Implementation Order

1. ✅ Create MongoDB models
2. ✅ Build API endpoints
3. ✅ Test APIs with sample data
4. ✅ Update frontend to use APIs
5. ✅ Implement RFID integration
6. ✅ Test end-to-end flow
