import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import HeroPromtBI from './components/HeroPromtBI'
import HowItWorksPromtBI from './components/HowItWorksPromtBI'
import FeaturesBentoPromtBI from './components/FeaturesBentoPromtBI'
import PricingPromtBI from './components/PricingPromtBI'
import FAQPromtBI from './components/FAQPromtBI'
import FooterPromtBI from './components/FooterPromtBI'
import AuthPromtBI from './components/AuthPromtBI'
import DashboardPromtBI from './components/DashboardPromtBI'
import TermsPage from './components/TermsPage'
import PrivacyPage from './components/PrivacyPage'

const LandingPageComponents = () => (
  <main className="min-h-screen bg-[#050505] font-sans selection:bg-blue-500/30">
    <HeroPromtBI />
    <HowItWorksPromtBI />
    <FeaturesBentoPromtBI />
    <PricingPromtBI />
    <FAQPromtBI />
    <FooterPromtBI />
  </main>
);

const ProtectedRoute = ({ children, session }) => {
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

export default function App() {
  const { initializeAuth, session, isLoading } = useAuthStore();

  useEffect(() => {
    const cleanup = initializeAuth();
    return cleanup;
  }, [initializeAuth]);

  if (isLoading) {
    return <div className="min-h-screen bg-[#050505] text-gray-500 flex items-center justify-center font-sans text-sm tracking-wide">Iniciando espacio de trabajo...</div>;
  }

  return (
    <Router>
      <Routes>
        {/* Ruta Raíz Inteligente */}
        <Route 
          path="/" 
          element={
            session ? <Navigate to="/dashboard" replace /> : <LandingPageComponents />
          } 
        />
        
        {/* Ruta de Login Inteligente */}
        <Route 
          path="/login" 
          element={
            session ? <Navigate to="/dashboard" replace /> : <AuthPromtBI />
          } 
        />

        {/* Legal Standalone Routes (For external validations like Azure) */}
        <Route path="/terminos" element={<TermsPage />} />
        <Route path="/politicas" element={<PrivacyPage />} />
        
        {/* Ruta Protegida Existente */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute session={session}>
              <DashboardPromtBI />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  );
}
