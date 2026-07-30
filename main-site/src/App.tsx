
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';

// Pages
import Home from './pages/Home';
import Features from './pages/Features';
import Advisor from './pages/Advisor';
import Pricing from './pages/Pricing';
import Reviews from './pages/Reviews';
import Login from './pages/Login';
import Explorer from './pages/Explorer';
import Blog from './pages/Blog';
import CareerGalaxy from './pages/CareerGalaxy';

// Layout Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import SplashScreen from './components/SplashScreen';

import ParentApp from './parent/ParentApp';
import RoleSelectionModal from './components/RoleSelectionModal';
import AIChatButton from './components/AIChatButton';

const ScrollToTopAndReveal = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    // Add .in class to all .rv elements to reveal them (opacity: 1)
    setTimeout(() => {
      document.querySelectorAll('.rv').forEach(el => {
        el.classList.add('in');
      });
    }, 100);
  }, [pathname]);

  return null;
};

const MainLayout = ({ children }: { children: React.ReactNode }) => (
  <>
    <Navbar />
    {children}
    <Footer />
  </>
);

/**
 * GlobalOverlays — renders SplashScreen, RoleSelectionModal, AIChatButton
 * ONLY on non-login routes. Login page must be completely clean and standalone.
 */
const GlobalOverlays = () => {
  const { pathname } = useLocation();
  const isLoginPage = pathname === '/login' || pathname === '/login.html';
  if (isLoginPage) return null;
  return (
    <>
      <SplashScreen />
      <RoleSelectionModal />
      <AIChatButton />
    </>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <GlobalOverlays />
      <ScrollToTopAndReveal />
      <Routes>
        {/* Standalone Login without main Navbar, Footer, SplashScreen, or any overlay */}
        <Route path="/login" element={<Login />} />
        <Route path="/login.html" element={<Login />} />

        {/* Main Marketing Pages wrapped in Navbar and Footer */}
        <Route path="/*" element={
          <MainLayout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/features" element={<Features />} />
              <Route path="/advisor" element={<Advisor />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/reviews" element={<Reviews />} />
              <Route path="/explorer" element={<Explorer />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/galaxy" element={<CareerGalaxy />} />
            </Routes>
          </MainLayout>
        } />
        
        {/* Standalone Portals without main Navbar and Footer */}
        <Route path="/parent/*" element={<ParentApp />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
