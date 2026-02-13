from fastapi import APIRouter, HTTPException, status, Depends, Header
from typing import List, Optional
from models.accounting import (
    ExpenseCreate, ExpenseUpdate,
    AccountCreate, AccountUpdate,
    JournalEntryCreate, JournalEntryLine
)
from utils.auth import require_permission
from middleware.tenant import get_tenant_from_token
from bson import ObjectId
from datetime import datetime, timezone
import random
import string

router = APIRouter(prefix="/api/accounting", tags=["accounting"])


def _base_query(tenant_id: Optional[str]) -> dict:
    return {"tenantId": tenant_id} if tenant_id else {}

def generate_entry_number():
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d")
    random_str = ''.join(random.choices(string.digits, k=4))
    return f"JE-{timestamp}-{random_str}"

# ============ EXPENSES ============

@router.get("/expenses", response_model=List[dict])
async def get_expenses(
    authorization: Optional[str] = Header(None),
    _: dict = Depends(require_permission("accounting"))
):
    """Get all expenses"""
    from server import db
    tenant_id = get_tenant_from_token(authorization)
    base = _base_query(tenant_id)
    expenses = await db.expenses.find(base).sort("date", -1).to_list(1000)
    for expense in expenses:
        expense['_id'] = str(expense['_id'])
    return expenses

@router.post("/expenses", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_expense(
    expense: ExpenseCreate,
    authorization: Optional[str] = Header(None),
    _: dict = Depends(require_permission("accounting"))
):
    """Create new expense"""
    from server import db

    tenant_id = get_tenant_from_token(authorization)
    expense_dict = expense.model_dump()
    expense_dict['tenantId'] = tenant_id
    if not expense_dict.get('date'):
        expense_dict['date'] = datetime.now(timezone.utc)
    expense_dict['createdAt'] = datetime.now(timezone.utc)
    expense_dict['updatedAt'] = datetime.now(timezone.utc)

    result = await db.expenses.insert_one(expense_dict)
    created = await db.expenses.find_one({"_id": result.inserted_id})
    created['_id'] = str(created['_id'])
    
    return created

@router.put("/expenses/{expense_id}", response_model=dict)
async def update_expense(
    expense_id: str,
    expense: ExpenseUpdate,
    authorization: Optional[str] = Header(None),
    _: dict = Depends(require_permission("accounting"))
):
    """Update expense"""
    from server import db
    if not ObjectId.is_valid(expense_id):
        raise HTTPException(status_code=400, detail="Invalid expense ID")

    tenant_id = get_tenant_from_token(authorization)
    base = _base_query(tenant_id)
    query = {"_id": ObjectId(expense_id), **base}

    update_data = {k: v for k, v in expense.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")

    update_data['updatedAt'] = datetime.now(timezone.utc)

    result = await db.expenses.update_one(query, {"$set": update_data})

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")

    updated = await db.expenses.find_one({"_id": ObjectId(expense_id)})
    updated['_id'] = str(updated['_id'])
    
    return updated

@router.delete("/expenses/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(
    expense_id: str,
    authorization: Optional[str] = Header(None),
    _: dict = Depends(require_permission("accounting"))
):
    """Delete expense"""
    from server import db
    if not ObjectId.is_valid(expense_id):
        raise HTTPException(status_code=400, detail="Invalid expense ID")

    tenant_id = get_tenant_from_token(authorization)
    base = _base_query(tenant_id)
    result = await db.expenses.delete_one({"_id": ObjectId(expense_id), **base})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")

    return None

# ============ ACCOUNTS ============

@router.get("/accounts", response_model=List[dict])
async def get_accounts(
    authorization: Optional[str] = Header(None),
    _: dict = Depends(require_permission("accounting"))
):
    """Get all accounts"""
    from server import db
    tenant_id = get_tenant_from_token(authorization)
    base = _base_query(tenant_id)
    accounts = await db.accounts.find(base).sort("code", 1).to_list(1000)
    for account in accounts:
        account['_id'] = str(account['_id'])
    return accounts

@router.post("/accounts", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_account(
    account: AccountCreate,
    authorization: Optional[str] = Header(None),
    _: dict = Depends(require_permission("accounting"))
):
    """Create new account"""
    from server import db

    tenant_id = get_tenant_from_token(authorization)
    base = _base_query(tenant_id)
    # Check if code already exists within tenant
    existing = await db.accounts.find_one({"code": account.code, **base})
    if existing:
        raise HTTPException(status_code=400, detail="Account code already exists")

    account_dict = account.model_dump()
    account_dict['tenantId'] = tenant_id
    account_dict['isActive'] = True
    account_dict['createdAt'] = datetime.now(timezone.utc)
    account_dict['updatedAt'] = datetime.now(timezone.utc)

    result = await db.accounts.insert_one(account_dict)
    created = await db.accounts.find_one({"_id": result.inserted_id})
    created['_id'] = str(created['_id'])
    
    return created

@router.put("/accounts/{account_id}", response_model=dict)
async def update_account(
    account_id: str,
    account: AccountUpdate,
    authorization: Optional[str] = Header(None),
    _: dict = Depends(require_permission("accounting"))
):
    """Update account"""
    from server import db
    if not ObjectId.is_valid(account_id):
        raise HTTPException(status_code=400, detail="Invalid account ID")

    tenant_id = get_tenant_from_token(authorization)
    base = _base_query(tenant_id)
    query = {"_id": ObjectId(account_id), **base}

    update_data = {k: v for k, v in account.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")

    update_data['updatedAt'] = datetime.now(timezone.utc)

    result = await db.accounts.update_one(query, {"$set": update_data})

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Account not found")

    updated = await db.accounts.find_one({"_id": ObjectId(account_id)})
    updated['_id'] = str(updated['_id'])
    
    return updated

# ============ JOURNAL ENTRIES ============

@router.get("/journal-entries", response_model=List[dict])
async def get_journal_entries(
    authorization: Optional[str] = Header(None),
    _: dict = Depends(require_permission("accounting"))
):
    """Get all journal entries"""
    from server import db
    tenant_id = get_tenant_from_token(authorization)
    base = _base_query(tenant_id)
    entries = await db.journal_entries.find(base).sort("date", -1).to_list(1000)
    for entry in entries:
        entry['_id'] = str(entry['_id'])
    return entries

@router.post("/journal-entries", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_journal_entry(
    entry: JournalEntryCreate,
    authorization: Optional[str] = Header(None),
    _: dict = Depends(require_permission("accounting"))
):
    """Create new journal entry"""
    from server import db

    tenant_id = get_tenant_from_token(authorization)
    base = _base_query(tenant_id)

    # Validate that debits = credits
    total_debit = sum(line.debit for line in entry.lines)
    total_credit = sum(line.credit for line in entry.lines)

    if abs(total_debit - total_credit) > 0.01:
        raise HTTPException(
            status_code=400,
            detail=f"Debits ({total_debit}) must equal credits ({total_credit})"
        )

    entry_dict = entry.model_dump()
    entry_dict['tenantId'] = tenant_id
    entry_dict['entryNumber'] = generate_entry_number()
    if not entry_dict.get('date'):
        entry_dict['date'] = datetime.now(timezone.utc)
    entry_dict['status'] = 'posted'
    entry_dict['createdAt'] = datetime.now(timezone.utc)
    entry_dict['updatedAt'] = datetime.now(timezone.utc)

    result = await db.journal_entries.insert_one(entry_dict)

    # Update account balances (only tenant's accounts)
    for line in entry.lines:
        if line.accountId and ObjectId.is_valid(line.accountId):
            balance_change = line.debit - line.credit
            await db.accounts.update_one(
                {"_id": ObjectId(line.accountId), **base},
                {"$inc": {"balance": balance_change}}
            )
    
    created = await db.journal_entries.find_one({"_id": result.inserted_id})
    created['_id'] = str(created['_id'])
    
    return created

# ============ SUMMARY ============

@router.get("/summary")
async def get_accounting_summary(
    authorization: Optional[str] = Header(None),
    _: dict = Depends(require_permission("accounting"))
):
    """Get accounting summary"""
    from server import db

    tenant_id = get_tenant_from_token(authorization)
    base = _base_query(tenant_id)

    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Get expenses (tenant-scoped)
    expenses = await db.expenses.find(base).to_list(10000)
    total_expenses = sum(e.get('amount', 0) for e in expenses)

    monthly_expenses = await db.expenses.find({**base, "date": {"$gte": month_start}}).to_list(10000)
    monthly_expense_total = sum(e.get('amount', 0) for e in monthly_expenses)

    # Expenses by category
    expense_by_category = {}
    for e in expenses:
        cat = e.get('category', 'other')
        expense_by_category[cat] = expense_by_category.get(cat, 0) + e.get('amount', 0)

    # Get sales (revenue) - tenant-scoped
    invoices = await db.invoices.find({**base, "status": "paid"}).to_list(10000)
    total_revenue = sum(inv.get('total', 0) for inv in invoices)

    monthly_invoices = await db.invoices.find({
        **base,
        "createdAt": {"$gte": month_start},
        "status": "paid"
    }).to_list(10000)
    monthly_revenue = sum(inv.get('total', 0) for inv in monthly_invoices)

    # Get accounts (tenant-scoped)
    accounts = await db.accounts.find(base).to_list(1000)
    
    assets = sum(a.get('balance', 0) for a in accounts if a.get('type') == 'asset')
    liabilities = sum(a.get('balance', 0) for a in accounts if a.get('type') == 'liability')
    equity = sum(a.get('balance', 0) for a in accounts if a.get('type') == 'equity')
    
    return {
        "revenue": {
            "total": total_revenue,
            "monthly": monthly_revenue
        },
        "expenses": {
            "total": total_expenses,
            "monthly": monthly_expense_total,
            "byCategory": expense_by_category
        },
        "profit": {
            "gross": total_revenue - total_expenses,
            "monthly": monthly_revenue - monthly_expense_total
        },
        "balanceSheet": {
            "assets": assets,
            "liabilities": liabilities,
            "equity": equity
        }
    }

# ============ SEED DEFAULT ACCOUNTS ============

@router.post("/seed-accounts")
async def seed_default_accounts(
    authorization: Optional[str] = Header(None),
    _: dict = Depends(require_permission("accounting"))
):
    """Seed default chart of accounts for current tenant"""
    from server import db

    tenant_id = get_tenant_from_token(authorization)
    base = _base_query(tenant_id)
    count = await db.accounts.count_documents(base)
    if count > 0:
        return {"message": "Accounts already exist", "count": count}

    default_accounts = [
        # Assets
        {"code": "1000", "name": "الأصول", "nameEn": "Assets", "type": "asset", "balance": 0},
        {"code": "1100", "name": "النقدية", "nameEn": "Cash", "type": "asset", "balance": 0},
        {"code": "1200", "name": "البنك", "nameEn": "Bank", "type": "asset", "balance": 0},
        {"code": "1300", "name": "المدينون", "nameEn": "Accounts Receivable", "type": "asset", "balance": 0},
        {"code": "1400", "name": "المخزون", "nameEn": "Inventory", "type": "asset", "balance": 0},
        # Liabilities
        {"code": "2000", "name": "الالتزامات", "nameEn": "Liabilities", "type": "liability", "balance": 0},
        {"code": "2100", "name": "الدائنون", "nameEn": "Accounts Payable", "type": "liability", "balance": 0},
        # Equity
        {"code": "3000", "name": "حقوق الملكية", "nameEn": "Equity", "type": "equity", "balance": 0},
        {"code": "3100", "name": "رأس المال", "nameEn": "Capital", "type": "equity", "balance": 0},
        # Revenue
        {"code": "4000", "name": "الإيرادات", "nameEn": "Revenue", "type": "revenue", "balance": 0},
        {"code": "4100", "name": "إيرادات المبيعات", "nameEn": "Sales Revenue", "type": "revenue", "balance": 0},
        # Expenses
        {"code": "5000", "name": "المصروفات", "nameEn": "Expenses", "type": "expense", "balance": 0},
        {"code": "5100", "name": "الإيجار", "nameEn": "Rent", "type": "expense", "balance": 0},
        {"code": "5200", "name": "الرواتب", "nameEn": "Salaries", "type": "expense", "balance": 0},
        {"code": "5300", "name": "المرافق", "nameEn": "Utilities", "type": "expense", "balance": 0},
        {"code": "5400", "name": "مصروفات أخرى", "nameEn": "Other Expenses", "type": "expense", "balance": 0},
    ]
    
    now = datetime.now(timezone.utc)
    for acc in default_accounts:
        acc['tenantId'] = tenant_id
        acc['isActive'] = True
        acc['createdAt'] = now
        acc['updatedAt'] = now

    await db.accounts.insert_many(default_accounts)

    return {"message": "Default accounts created", "count": len(default_accounts)}
