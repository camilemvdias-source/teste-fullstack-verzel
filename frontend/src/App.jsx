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
import { EmptyState } from './components/States.jsx';
import { Link, Route, Routes } from 'react-router-dom';
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
        <Route path="*" element={<div className="page"><EmptyState title="Página não encontrada" action={<Link to="/" className="btn">Voltar ao catálogo</Link>}>O endereço pode estar errado ou a página mudou de lugar.</EmptyState></div>} />
      </Route>
    </Routes>
  );
}
