import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '@/components/Layout/MainLayout';
import AssetsPage from '@/pages/Assets';
import BorrowPage from '@/pages/Borrow';
import MaintenancePage from '@/pages/Maintenance';
import InventoryPage from '@/pages/Inventory';
import ReportsPage from '@/pages/Reports';

export default function App() {
  return (
    <Router>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/assets" replace />} />
          <Route path="/assets" element={<AssetsPage />} />
          <Route path="/borrow" element={<BorrowPage />} />
          <Route path="/maintenance" element={<MaintenancePage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="*" element={<Navigate to="/assets" replace />} />
        </Routes>
      </MainLayout>
    </Router>
  );
}
