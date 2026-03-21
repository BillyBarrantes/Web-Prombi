import React, { useState } from 'react';
import { MessageSquare, Plus, Settings, LogOut, Database, Send, BarChart2, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import ReportArea from '../features/orchestrator/components/ReportArea';
import ChatSidebar from '../features/orchestrator/components/ChatSidebar';

const DashboardPromtBI = () => {
  const navigate = useNavigate();
  const { signOut } = useAuthStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [actions, setActions] = useState([]);
  const [lastAction, setLastAction] = useState(null);
  const [lastResult, setLastResult] = useState(null);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleActionGenerated = (response) => {
    // Stub for future integration
    if (response.action) {
      setLastAction(response.action);
      setActions(prev => [...prev, response.action]);
    }
  };

  return (
    <div className="flex h-screen bg-[#050505] text-white font-sans overflow-hidden">
      
      {/* Sidebar (Panel Lateral) */}
      <div className={`${isSidebarOpen ? 'w-64' : 'w-[72px]'} flex-shrink-0 bg-[#0a0a0a] border-r border-white/10 flex flex-col justify-between hidden md:flex transition-all duration-300 ease-in-out z-20 overflow-hidden`}>
        <div className="p-4">
          <div className={`flex items-center ${isSidebarOpen ? 'justify-between px-2' : 'flex-col gap-4 justify-center py-2'} mb-8`}>
            {/* Logo Area */}
            {isSidebarOpen && (
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="text-xl font-black tracking-tight text-white transition-all">
                  PromtBI
                </span>
                <span className="text-[10px] font-medium text-blue-500 border border-blue-500/30 bg-blue-500/10 px-1.5 py-0.5 rounded-full">
                  PRO
                </span>
              </div>
            )}

            {/* Toggle Button */}
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/10 transition-all flex-shrink-0"
              title={isSidebarOpen ? "Contraer menú lateral" : "Expandir menú lateral"}
            >
              {isSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
            </button>
          </div>
          
          <button className={`w-full bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg py-2.5 ${isSidebarOpen ? 'px-4 justify-start' : 'justify-center'} flex items-center gap-2 transition-colors text-sm font-medium mb-6 overflow-hidden`}>
            <Plus size={16} className="flex-shrink-0" /> {isSidebarOpen && <span className="whitespace-nowrap">Nuevo Análisis</span>}
          </button>

          {isSidebarOpen && <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2 whitespace-nowrap">Chats Recientes</div>}
          <div className="space-y-1">
            <button className={`w-full text-left flex items-center gap-2 text-gray-400 hover:text-white hover:bg-white/5 py-2 rounded-lg transition-colors text-sm ${isSidebarOpen ? 'px-2 justify-start' : 'justify-center'} overflow-hidden`} title="Ventas Q3 2025">
              <MessageSquare size={16} className="flex-shrink-0" /> {isSidebarOpen && <span className="truncate whitespace-nowrap">Ventas Q3 2025</span>}
            </button>
            <button className={`w-full text-left flex items-center gap-2 text-gray-400 hover:text-white hover:bg-white/5 py-2 rounded-lg transition-colors text-sm ${isSidebarOpen ? 'px-2 justify-start' : 'justify-center'} overflow-hidden`} title="Proyección Inventario">
              <MessageSquare size={16} className="flex-shrink-0" /> {isSidebarOpen && <span className="truncate whitespace-nowrap">Proyección Inventario</span>}
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-white/10 space-y-1">
          <button className={`w-full text-left flex items-center gap-2 text-gray-400 hover:text-white hover:bg-white/5 py-2 rounded-lg transition-colors text-sm ${isSidebarOpen ? 'px-2 justify-start' : 'justify-center'} overflow-hidden`} title="Conectar Power BI">
            <Database size={16} className="flex-shrink-0" /> {isSidebarOpen && <span className="whitespace-nowrap">Conectar Power BI</span>}
          </button>
          <button className={`w-full text-left flex items-center gap-2 text-gray-400 hover:text-white hover:bg-white/5 py-2 rounded-lg transition-colors text-sm ${isSidebarOpen ? 'px-2 justify-start' : 'justify-center'} overflow-hidden`} title="Configuración">
            <Settings size={16} className="flex-shrink-0" /> {isSidebarOpen && <span className="whitespace-nowrap">Configuración</span>}
          </button>
          <button onClick={handleLogout} className={`w-full text-left flex items-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 py-2 rounded-lg transition-colors text-sm mt-2 ${isSidebarOpen ? 'px-2 justify-start' : 'justify-center'} overflow-hidden`} title="Cerrar Sesión">
            <LogOut size={16} className="flex-shrink-0" /> {isSidebarOpen && <span className="whitespace-nowrap">Cerrar Sesión</span>}
          </button>
        </div>
      </div>

      {/* Main App Canvas */}
      <div className="flex-1 flex flex-col md:flex-row w-full h-full bg-[#0a0a0a]">
        
        {/* Header Mobile (Visually hidden on desktop, pushed to the top) */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-white/10 bg-[#050505] flex-shrink-0">
          <span className="text-xl font-black tracking-tight text-white">PromtBI</span>
          <button onClick={handleLogout}><LogOut size={18} className="text-gray-400" /></button>
        </div>

        {/* Report Area Canvas (Takes 70% width on Desktop) */}
        <div className="flex-1 border-b md:border-b-0 md:border-r border-white/10 relative overflow-hidden bg-[#050505]">
          <ReportArea lastAction={lastAction} actions={actions} lastResult={lastResult} isSidebarOpen={isSidebarOpen} />
        </div>

        {/* Dynamic Chat Sidebar (Strict width governed by Dashboard layout) */}
        <div className="w-full md:w-96 lg:w-[400px] flex-shrink-0 flex flex-col h-full bg-[#050505]">
          <ChatSidebar reportId="demo" tenantId="demo" onActionGenerated={handleActionGenerated} />
        </div>
      </div>
    </div>
  );
};

export default DashboardPromtBI;
