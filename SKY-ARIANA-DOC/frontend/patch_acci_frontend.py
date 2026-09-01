from pathlib import Path
import re

base = Path(r'e:\New folder\sky-ariana-bbb\frontend\src')

# Patch App.tsx
app_path = base / 'App.tsx'
text = app_path.read_text(encoding='utf-8')
text_new = text

text_new = text_new.replace("import PrintPreview from './pages/PrintPreview'\nimport PackingLists from './pages/PackingLists'",
                            "import PrintPreview from './pages/PrintPreview'\nimport AcciInvoices from './pages/AcciInvoices'\nimport PackingLists from './pages/PackingLists'")
text_new = text_new.replace("{ name: 'ACCI Invoices', path: `${documentSuiteBaseUrl}/acci-invoices`, icon: ReceiptText, external: true },",
                            "{ name: t.acci_invoices, path: '/acci-invoices', icon: ReceiptText },")
text_new = text_new.replace("<Route path=\"/user-management\" element={<PermissionRoute permission=\"users.view\"><UserManagement /></PermissionRoute>} />\n            <Route path=\"/access-denied\" element={<ProtectedRoute><AccessDenied /></ProtectedRoute>} />",
                            "<Route path=\"/user-management\" element={<PermissionRoute permission=\"users.view\"><UserManagement /></PermissionRoute>} />\n            <Route path=\"/acci-invoices\" element={<ProtectedRoute><AcciInvoices /></ProtectedRoute>} />\n            <Route path=\"/access-denied\" element={<ProtectedRoute><AccessDenied /></ProtectedRoute>} />")

if text != text_new:
    app_path.write_text(text_new, encoding='utf-8')
    print('App.tsx patched')
else:
    print('App.tsx already contains changes or pattern not found')

# Patch translations.ts
trans_path = base / 'i18n' / 'translations.ts'
text = trans_path.read_text(encoding='utf-8')
text_new = text
pattern = "    dashboard: 'Dashboard',\n    invoices: 'Invoices',\n    customers: 'Customers',\n    products: 'Products & Services',\n    settings: 'Company Settings',\n    backups: 'Backup & Restore',\n    activity_history: 'Activity History',\n    users_permissions: 'Users & Permissions',\n"
replace = "    dashboard: 'Dashboard',\n    invoices: 'Invoices',\n    acci_invoices: 'ACCI Invoices',\n    customers: 'Customers',\n    products: 'Products & Services',\n    settings: 'Company Settings',\n    backups: 'Backup & Restore',\n    activity_history: 'Activity History',\n    users_permissions: 'Users & Permissions',\n"
text_new = text_new.replace(pattern, replace)

if text != text_new:
    trans_path.write_text(text_new, encoding='utf-8')
    print('translations.ts patched')
else:
    print('translations.ts already contains changes or pattern not found')
