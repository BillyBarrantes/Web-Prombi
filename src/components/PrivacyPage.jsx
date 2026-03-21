import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const PrivacyPage = () => {
  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans py-12 px-6 selection:bg-blue-500/30">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 text-sm">
          <ArrowLeft size={16} /> Volver a PromtBI
        </Link>
        <h1 className="text-3xl md:text-5xl font-bold mb-8">Política de Privacidad: Tus Datos Son Tuyos</h1>
        <div className="text-gray-400 text-lg space-y-6 leading-relaxed bg-[#0f0f0f] border border-white/10 p-8 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          <p>En PromtBI (por Tres Niveles), la seguridad de tu información corporativa es nuestra máxima prioridad. Entendemos que en el análisis de datos, la confidencialidad es innegociable.</p>
          <ul className="list-disc pl-5 space-y-4">
            <li><strong className="text-gray-200">Cero Almacenamiento Permanente:</strong> PromtBI no almacena copias de tus bases de datos ni de tus reportes de Power BI en nuestros servidores de forma permanente. Procesamos tus consultas en memoria al vuelo y luego la información se descarta.</li>
            <li><strong className="text-gray-200">No Entrenamos Modelos con tu Data:</strong> Garantizamos que las preguntas que le haces a PromtBI y los datos de tu empresa JAMÁS se utilizarán para entrenar modelos de Inteligencia Artificial públicos ni compartidos con terceros.</li>
            <li><strong className="text-gray-200">Encriptación Bancaria:</strong> Toda la comunicación entre tu entorno de Power BI, nuestra API y los motores de IA se realiza mediante conexiones encriptadas de extremo a extremo (AES-256 / TLS).</li>
            <li><strong className="text-gray-200">Transparencia Total:</strong> Solo recopilamos información básica de tu cuenta para gestionar la facturación y enviarte avisos de servicio.</li>
          </ul>
          <p className="mt-8 italic text-gray-500 border-t border-white/10 pt-6">Confiamos en nuestra arquitectura serverless y en guardias deterministas de Python para asegurar que tu privacidad sea invulnerable.</p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
