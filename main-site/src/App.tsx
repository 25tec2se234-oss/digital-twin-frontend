// @ts-nocheck
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import OfferLetterApp from './pages/OfferLetterStudio/OfferLetterApp';
import PublicVerification from './pages/OfferLetterStudio/PublicVerification';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Redirect base URL to the studio */}
        <Route path="/" element={<Navigate to="/offer-letter-studio" replace />} />
        
        {/* Core Studio App */}
        <Route path="/offer-letter-studio/*" element={<OfferLetterApp />} />
        
        {/* Public Verification Link */}
        <Route path="/offer/verify/:token" element={<PublicVerification />} />
        
        {/* Catch-all to prevent 404s */}
        <Route path="*" element={<Navigate to="/offer-letter-studio" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
