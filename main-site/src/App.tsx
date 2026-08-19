// @ts-nocheck
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';

import OfferLetterApp from './pages/OfferLetterStudio/OfferLetterApp';
import PublicVerification from './pages/OfferLetterStudio/PublicVerification';
import CandidatePortal from './pages/OfferLetterStudio/CandidatePortal';
import Login from './pages/Login';

const App = () => {
  return (
    <HashRouter>
      <Routes>
        {/* Redirect base URL to the studio */}
        <Route path="/" element={<Navigate to="/offer-letter-studio" replace />} />
        
        {/* Auth Route */}
        <Route path="/login" element={<Login />} />

        {/* Core Studio App */}
        <Route path="/offer-letter-studio/*" element={<OfferLetterApp />} />
        
        {/* Public Verification Link */}
        <Route path="/offer/verify/:token" element={<PublicVerification />} />
        
        {/* Candidate Actions Portal Link */}
        <Route path="/offer/action/:token" element={<CandidatePortal />} />
        
        {/* Catch-all to prevent 404s */}
        <Route path="*" element={<Navigate to="/offer-letter-studio" replace />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
