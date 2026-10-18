import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import RouteErrorBoundary from '../components/RouteErrorBoundary';
import PageLoader from '../components/PageLoader';

const Login = React.lazy(() => import('../pages/Login'));
const Dashboard = React.lazy(() => import('../pages/Dashboard'));
const AddTransaction = React.lazy(() => import('../pages/AddTransaction'));
const TransactionHistory = React.lazy(() => import('../pages/TransactionHistory'));
const CustomerLedger = React.lazy(() => import('../pages/CustomerLedger'));
const BankLedger = React.lazy(() => import('../pages/BankLedger'));
const ReceiptUpload = React.lazy(() => import('../pages/ReceiptUpload'));
const TransactionDetail = React.lazy(() => import('../pages/TransactionDetail'));
const Reports = React.lazy(() => import('../pages/Reports'));
const Settings = React.lazy(() => import('../pages/Settings'));
const UserManagement = React.lazy(() => import('../pages/UserManagement'));
const BackupRestore = React.lazy(() => import('../pages/BackupRestore'));

function PrivateRoute({ children }) {
  const token = localStorage.getItem('sky_banking_token');
  return token ? children : <Navigate to="/login" replace />;
}

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('sky_banking_user') || '{}');
  } catch {
    localStorage.removeItem('sky_banking_user');
    return {};
  }
}

function RoleRoute({ children, allowedRoles }) {
  const user = getStoredUser();
  const userRole = user.role || 'Viewer';
  return allowedRoles.includes(userRole) ? children : <Navigate to="/" replace />;
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <AppLayout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard" element={<Navigate to="/" replace />} />
                <Route path="/add-transaction" element={<RoleRoute allowedRoles={['Admin', 'Accountant']}><AddTransaction /></RoleRoute>} />
                <Route path="/edit-transaction/:id" element={<RoleRoute allowedRoles={['Admin', 'Accountant']}><AddTransaction /></RoleRoute>} />
                <Route path="/transactions" element={<TransactionHistory />} />
                <Route path="/transactions/:id" element={<TransactionDetail />} />
                <Route path="/customer-ledger" element={<CustomerLedger />} />
                <Route path="/bank-ledger" element={<BankLedger />} />
                <Route
                  path="/upload"
                  element={
                    <RoleRoute allowedRoles={['Admin', 'Accountant']}>
                      <RouteErrorBoundary
                        title="Receipt Upload / OCR could not load"
                        message="The OCR workspace hit a temporary problem. You can retry without losing your session."
                      >
                        <ReceiptUpload />
                      </RouteErrorBoundary>
                    </RoleRoute>
                  }
                />
                <Route path="/reports" element={<Reports />} />
                <Route path="/settings" element={<RoleRoute allowedRoles={['Admin']}><Settings /></RoleRoute>} />
                <Route
                  path="/users"
                  element={
                    <RoleRoute allowedRoles={['Admin']}>
                      <RouteErrorBoundary
                        title="User Directory could not load"
                        message="Something went wrong while initializing the users directory. Your data is safe. Please try again."
                      >
                        <UserManagement />
                      </RouteErrorBoundary>
                    </RoleRoute>
                  }
                />
                <Route path="/backup" element={<RoleRoute allowedRoles={['Admin']}><BackupRestore /></RoleRoute>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AppLayout>
          </PrivateRoute>
        }
      />
    </Routes>
    </Suspense>
  );
}
