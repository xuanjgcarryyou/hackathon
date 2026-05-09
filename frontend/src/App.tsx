import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/Login/LoginPage'
import HRDashboardPage from './pages/HRDashboard/HRDashboardPage'
import EmployeeOrderPage from './pages/EmployeeOrder/EmployeeOrderPage'
import QRScannerPage from './pages/QRScanner/QRScannerPage'
import ESGReportPage from './pages/ESGReport/ESGReportPage'
import VendorPortalPage from './pages/VendorPortal/VendorPortalPage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token')
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<PrivateRoute><HRDashboardPage /></PrivateRoute>} />
        <Route path="/order" element={<PrivateRoute><EmployeeOrderPage /></PrivateRoute>} />
        <Route path="/scan" element={<PrivateRoute><QRScannerPage /></PrivateRoute>} />
        <Route path="/esg" element={<PrivateRoute><ESGReportPage /></PrivateRoute>} />
        <Route path="/vendor-portal" element={<VendorPortalPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
