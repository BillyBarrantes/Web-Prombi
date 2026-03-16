import React from 'react';
import { MessageSquare, Plus, Settings, LogOut, Database, Send, BarChart2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DashboardPromtBI = () => {
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-[#050505] text-white font-sans overflow-hidden">
      
      {/* Sidebar (Panel Lateral) */}
      <div className="w-64 bg-[#0a0a0a] border-r border-white/10 flex flex-col justify-between hidden md:flex">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-8 px-2">
            <span className="text-xl font-black tracking-tight text-white">PromtBI</span>
            <span className="text-[10px] font-medium text-blue-500 border border-blue-500/30 bg-blue-500/10 px-1.5 py-0.5 rounded-full">PRO</span>
          </div>
          
          <button className="w-full bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg py-2.5 px-4 flex items-center gap-2 transition-colors text-sm font-medium mb-6">
            <Plus size={16} /> Nuevo Análisis
          </button>

          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">Chats Recientes</div>
          <div className="space-y-1">
            <button className="w-full text-left flex items-center gap-2 text-gray-400 hover:text-white hover:bg-white/5 px-2 py-2 rounded-lg transition-colors text-sm">
              <MessageSquare size={14} /> Ventas Q3 2025
            </button>
            <button className="w-full text-left flex items-center gap-2 text-gray-400 hover:text-white hover:bg-white/5 px-2 py-2 rounded-lg transition-colors text-sm">
              <MessageSquare size={14} /> Proyección Inventario
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-white/10 space-y-1">
          <button className="w-full text-left flex items-center gap-2 text-gray-400 hover:text-white hover:bg-white/5 px-2 py-2 rounded-lg transition-colors text-sm">
            <Database size={16} /> Conectar Power BI
          </button>
          <button className="w-full text-left flex items-center gap-2 text-gray-400 hover:text-white hover:bg-white/5 px-2 py-2 rounded-lg transition-colors text-sm">
            <Settings size={16} /> Configuración
          </button>
          <button onClick={() => navigate('/')} className="w-full text-left flex items-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 py-2 rounded-lg transition-colors text-sm mt-2">
            <LogOut size={16} /> Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Main Content (Zona de Chat) */}
      <div className="flex-1 flex flex-col relative w-full h-full">
        {/* Header Mobile */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-white/10 bg-[#0a0a0a]">
          <span className="text-xl font-black tracking-tight text-white">PromtBI</span>
          <button onClick={() => navigate('/')}><LogOut size={18} className="text-gray-400" /></button>
        </div>

        {/* Chat Area (Vacia por ahora, lista para recibir mensajes) */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col items-center justify-center">
          <div className="w-full max-w-2xl text-center space-y-6">
            <div className="w-16 h-16 bg-blue-600/10 rounded-2xl border border-blue-500/20 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(59,130,246,0.15)]">
              <BarChart2 size={32} className="text-blue-500" />
            </div>
            <h2 className="text-3xl font-bold">¿Qué datos analizamos hoy?</h2>
            <p className="text-gray-400">Pide un dashboard, haz consultas DAX o analiza tendencias en lenguaje natural.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-8 text-left">
              <div className="bg-white/5 border border-white/10 p-3 rounded-xl text-sm text-gray-300 hover:bg-white/10 cursor-pointer transition-colors">"Genera un resumen de las ventas del último trimestre por región."</div>
              <div className="bg-white/5 border border-white/10 p-3 rounded-xl text-sm text-gray-300 hover:bg-white/10 cursor-pointer transition-colors">"¿Cuál es el producto con mayor margen de ganancia este mes?"</div>
            </div>
          </div>
        </div>

        {/* Input Box */}
        <div className="p-4 md:p-8 pt-0">
          <div className="max-w-3xl mx-auto relative group">
            <input 
              type="text" 
              placeholder="Pregúntale a tus datos..." 
              className="w-full bg-[#1a1a1a] border border-white/10 rounded-2xl pl-6 pr-14 py-4 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all shadow-lg"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-500 p-2 rounded-xl text-white transition-colors">
              <Send size={18} />
            </button>
          </div>
          <div className="text-center text-[10px] text-gray-500 mt-3">
            PromtBI puede cometer errores. Verifica siempre los datos críticos.
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPromtBI;
