import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const AuthPromtBI = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const handleMicrosoftLogin = async () => {
    await supabase.auth.signInWithOAuth({ 
      provider: 'azure', 
      options: { 
        scopes: 'offline_access https://analysis.windows.net/powerbi/api/Report.Read.All https://analysis.windows.net/powerbi/api/Dataset.Read.All https://analysis.windows.net/powerbi/api/Workspace.Read.All',
        redirectTo: window.location.origin + '/dashboard' + (location.search || '')
      } 
    });
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    try {
      let authError = null;

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        authError = error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName
            }
          }
        });
        authError = error;
      }

      if (!authError) {
        // Redirigir explícitamente al dashboard si no hay error
        navigate('/dashboard' + (location.search || ''));
      } else {
        alert(authError.message);
      }
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col md:flex-row font-sans overflow-hidden selection:bg-blue-500/30">
      
      {/* Panel Izquierdo: Branding (Oculto en móviles) */}
      <div className="hidden md:flex md:w-1/2 relative p-12 flex-col justify-between border-r border-white/10 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-900/20 via-[#050505] to-[#050505] z-0"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
        
        <div className="relative z-10 flex items-center gap-2">
          <span className="text-2xl font-black tracking-tight text-white">PromtBI</span>
          <span className="text-xs font-medium text-blue-500 border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 rounded-full">by Tres Niveles</span>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl font-bold mb-6 leading-tight">Tu copiloto de datos corporativo.</h1>
          <p className="text-gray-400 text-lg">Conecta Power BI, escribe en lenguaje natural y toma decisiones ejecutivas en segundos, sin escribir una sola línea de DAX.</p>
        </div>
        
        <div className="relative z-10 text-sm text-gray-500">
          © {new Date().getFullYear()} Tres Niveles. Software seguro y encriptado.
        </div>
      </div>

      {/* Panel Derecho: Formulario */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12 relative">
        {/* Botón Volver */}
        <a href="/" className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors flex items-center gap-2 text-sm">
          <X size={16} /> Volver a inicio
        </a>

        <div className="w-full max-w-md">
          {/* Logo Mobile */}
          <div className="md:hidden flex items-center gap-2 mb-10">
            <span className="text-2xl font-black tracking-tight text-white">PromtBI</span>
          </div>

          <h2 className="text-3xl font-bold mb-2">{isLogin ? 'Bienvenido de vuelta' : 'Crea tu espacio de trabajo'}</h2>
          <p className="text-gray-400 mb-8">{isLogin ? 'Ingresa a tu panel de control de PromtBI.' : 'Comienza tu prueba gratuita de 15 días.'}</p>

          {/* Botón SSO Microsoft (Estratégico para Power BI) */}
          <button 
            type="button"
            onClick={handleMicrosoftLogin}
            className="w-full flex items-center justify-center gap-3 bg-[#2F2F2F] hover:bg-[#3F3F3F] text-white py-3.5 rounded-xl transition-colors font-medium border border-white/5 mb-6">
            <svg className="w-5 h-5" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
              <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
              <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
              <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
            </svg>
            Continuar con Microsoft 365
          </button>

          <div className="flex items-center gap-4 mb-6">
            <div className="h-px bg-white/10 flex-1"></div>
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">O usa tu correo</span>
            <div className="h-px bg-white/10 flex-1"></div>
          </div>

          {/* Formulario Tradicional */}
          <form className="space-y-4" onSubmit={handleEmailAuth}>
            {!isLogin && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Nombre completo</label>
                <input 
                  type="text" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ej. Juan Pérez" 
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none transition-colors" 
                  required={!isLogin}
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Correo electrónico</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500"><Mail size={18} /></div>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@empresa.com" 
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white focus:border-blue-500 focus:outline-none transition-colors" 
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Contraseña</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500"><Lock size={18} /></div>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white focus:border-blue-500 focus:outline-none transition-colors" 
                  required
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] flex items-center justify-center gap-2 mt-4">
              {isLogin ? 'Ingresar a PromtBI' : 'Crear cuenta'} <ArrowRight size={18} />
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-gray-400">
            {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes una cuenta?'} {' '}
            <button onClick={() => setIsLogin(!isLogin)} className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
              {isLogin ? 'Regístrate aquí' : 'Inicia sesión'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPromtBI;
