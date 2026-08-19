import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import ShaderBackground from '../components/ShaderBackground';
import SignIn from '../components/SignIn';
import SignUp from '../components/SignUp';
import ForgotPassword from '../components/ForgotPassword';
import { User } from '../types';

const Login: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialView = searchParams.get('view') as 'signin' | 'signup' | 'forgot' || 'signin';
  
  const [view, setView] = useState<'signin' | 'signup' | 'forgot'>(initialView);
  const [, setCurrentUser] = useState<User | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    const savedSession = localStorage.getItem('dtv_student_session');
    if (savedSession) {
      try {
        setCurrentUser(JSON.parse(savedSession));
      } catch (err) {
        console.error('Failed to parse saved session', err);
      }
    }
  }, []);

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center selection:bg-[#d4af37] selection:text-[#101415] overflow-x-hidden text-white font-sans bg-[#101415]" style={{ minHeight: '80vh', padding: '4rem 0' }}>
      <ShaderBackground />
      <div className="relative z-10 w-full flex-grow flex flex-col justify-center items-center">
        {view === 'signin' && (
          <SignIn
            onSignUpClick={() => setView('signup')}
            onForgotPasswordClick={() => setView('forgot')}
            onSignInSuccess={() => navigate('/offer-letter-studio')}
          />
        )}
        {view === 'signup' && (
          <SignUp
            onSignInClick={() => setView('signin')}
            onSignUpSuccess={() => navigate('/offer-letter-studio')}
          />
        )}
        {view === 'forgot' && (
          <ForgotPassword onSignInClick={() => setView('signin')} />
        )}
      </div>
    </div>
  );
};

export default Login;
