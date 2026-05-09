import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './app/store';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import DividendPage from './pages/DividendPage';

function App() {
  return (
    <Provider store={store}>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dividends" element={<DividendPage />} />
          </Routes>
        </Layout>
      </Router>
    </Provider>
  );
}

export default App;
