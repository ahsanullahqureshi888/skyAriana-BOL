from pathlib import Path

path = Path('src/App.tsx')
text = path.read_text(encoding='utf-8')
old_header = """// Protected Route Shield

const PermissionRoute = ({ permission, children }) => {
  const { user } = useApp()
  const token = localStorage.getItem('token')
  if (!token) return <Navigate to=\"/login\" replace />
  const userData = user || JSON.parse(localStorage.getItem('user') || '{}')
  const allowed = userData.role_name === 'Super Admin' || userData.role === 'Super Admin' || userData.permissions?.includes(permission)
  return <DashboardLayout>{allowed ? children : <AccessDenied />}</DashboardLayout>
}

function App() {
"""
new_header = """// Protected Route Shield

const PermissionRoute = ({ permission, children }) => {
  const { user } = useApp()
  const token = localStorage.getItem('token')
  if (!token) return <Navigate to=\"/login\" replace />
  const userData = user || JSON.parse(localStorage.getItem('user') || '{}')
  const allowed = userData.role_name === 'Super Admin' || userData.role === 'Super Admin' || userData.permissions?.includes(permission)
  return <DashboardLayout>{allowed ? children : <AccessDenied />}</DashboardLayout>
}

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token')
  if (!token) return <Navigate to=\"/login\" replace />
  return <DashboardLayout>{children}</DashboardLayout>
}

function App() {
"""
if old_header not in text:
    raise SystemExit('Header block not found')
text = text.replace(old_header, new_header, 1)
start = text.index('          <Routes>')
end = text.index('</Routes>', start) + len('</Routes>')
new_routes = '''          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/invoice/:id/print" element={<PrintPreview />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/invoices" element={<ProtectedRoute><InvoiceList /></ProtectedRoute>} />
            <Route path="/invoices/create" element={<ProtectedRoute><InvoiceForm /></ProtectedRoute>} />
            <Route path="/invoices/:id/edit" element={<ProtectedRoute><InvoiceForm /></ProtectedRoute>} />
            <Route path="/invoices/:id" element={<ProtectedRoute><InvoiceDetail /></ProtectedRoute>} />
            <Route path="/packing-lists" element={<ProtectedRoute><PackingLists /></ProtectedRoute>} />
            <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
            <Route path="/shippers" element={<PermissionRoute permission=\"shippers.view\"><BusinessParties partyType=\"shipper\" /></PermissionRoute>} />
            <Route path="/notify-parties" element={<PermissionRoute permission=\"notify_parties.view\"><BusinessParties partyType=\"notify_party\" /></PermissionRoute>} />
            <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
            <Route path="/settings" element={<PermissionRoute permission=\"company.view\"><CompanySettings /></PermissionRoute>} />
            <Route path="/backups" element={<ProtectedRoute><Backups /></ProtectedRoute>} />
            <Route path="/logs" element={<ProtectedRoute><Logs /></ProtectedRoute>} />
            <Route path="/user-management" element={<PermissionRoute permission=\"users.view\"><UserManagement /></PermissionRoute>} />
            <Route path="/access-denied" element={<ProtectedRoute><AccessDenied /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to=\"/\" replace />} />
          </Routes>'''
text = text[:start] + new_routes + text[end:]
path.write_text(text, encoding='utf-8')
print('patched App.tsx')
