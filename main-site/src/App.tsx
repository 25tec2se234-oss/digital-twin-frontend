// @ts-nocheck
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';

import Login from './pages/Login';

const App = () => {
  return (
    <HashRouter>
      <Routes>
        {/* Redirect base URL to the login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Auth Route */}
        <Route path="/login" element={<Login />} />

        {/* Catch-all to prevent 404s */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
