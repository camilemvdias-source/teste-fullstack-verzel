import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import LotDetail from './pages/LotDetail.jsx';
import Wallet from './pages/Wallet.jsx';
import MyLots from './pages/MyLots.jsx';
import CreateLot from './pages/CreateLot.jsx';
import MyBids from './pages/MyBids.jsx';
import Receipt from './pages/Receipt.jsx';
import Audit from './pages/Audit.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="login" element={<Login />} />
        <Route path="lotes/:id" element={<LotDetail />} />
        <Route path="meus-lotes" element={<ProtectedRoute role="auctioneer"><MyLots /></ProtectedRoute>} />
        <Route path="meus-lotes/novo" element={<ProtectedRoute role="auctioneer"><CreateLot /></ProtectedRoute>} />
        <Route path="meus-lances" element={<ProtectedRoute role="bidder"><MyBids /></ProtectedRoute>} />
        <Route path="comprovante/:token" element={<Receipt />} />
        <Route path="auditoria/:lotId" element={<Audit />} />
        <Route path="carteira" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
        <Route path="*" element={<p className="center muted">Página não encontrada.</p>} />
      </Route>
    </Routes>
  );
}
