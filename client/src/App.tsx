import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './app/store';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import DividendPage from './pages/DividendPage';
import LoginPage from './pages/LoginPage';
import MarketDataPage from './pages/MarketDataPage';
import PaperTradePage from './pages/PaperTradePage';
import ProtectedRoute from './components/auth/ProtectedRoute';

function App() {
  return (
    <Provider store={store}>
      <Router>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/dividends" element={<ProtectedRoute><Layout><DividendPage /></Layout></ProtectedRoute>} />
          <Route path="/market" element={<ProtectedRoute><Layout><MarketDataPage /></Layout></ProtectedRoute>} />
          <Route path="/paper-trade" element={<ProtectedRoute><Layout><PaperTradePage /></Layout></ProtectedRoute>} />
        </Routes>
      </Router>
    </Provider>
  );
}

export default App;
