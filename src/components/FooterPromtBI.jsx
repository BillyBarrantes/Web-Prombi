import React, { useState } from 'react';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl max-w-2xl w-full p-6 md:p-8 relative shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h3 className="text-2xl font-bold text-white mb-6 border-b border-white/10 pb-4">{title}</h3>
        <div className="text-gray-400 text-sm space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          {children}
        </div>
        <div className="mt-8 text-right">
          <button 
            onClick={onClose} 
            className="px-6 py-2 bg-white/10 text-white font-medium rounded-lg hover:bg-white/20 transition-all"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};

const FooterPromtBI = () => {
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  // Configuración de WhatsApp
  const waNumber = "51907948972";
  const waMessage = encodeURIComponent("Hola, me gustaría solicitar una demo B2B de PromtBI y conocer cómo funciona su infraestructura sobre Azure.");
  const waLink = `https://wa.me/${waNumber}?text=${waMessage}`;

  return (
    <footer className="bg-[#050505] text-white border-t border-white/10 pt-16 pb-8 relative overflow-hidden">
      <div className="container mx-auto px-6 relative z-10">
        
        {/* Call to Action Final */}
        <div className="bg-gradient-to-r from-[#0f0f0f] to-[#1a1f2e] border border-blue-500/20 rounded-3xl p-10 md:p-16 text-center max-w-5xl mx-auto mb-16 shadow-[0_0_50px_rgba(59,130,246,0.05)]">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 flex items-center justify-center">
            <img src="/power-bi-2.svg" alt="Power BI" className="h-10 md:h-12 w-auto inline-block mr-4 align-middle" />
            Habla con tu Power BI hoy mismo.
          </h2>
          <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">
            Únete a los gerentes que ya están interactuando con sus modelos de datos en segundos y ahorrando en licencias Premium. Empieza gratis, cancela cuando quieras.
          </p>
          <a 
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-8 py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition-all duration-300 transform hover:scale-105 shadow-[0_0_20px_rgba(59,130,246,0.4)]"
          >
            Integrar PromtBI Ahora →
          </a>
        </div>

        {/* Footer Links & Copyright */}
        <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-white/5">
          <div className="mb-4 md:mb-0 flex items-center gap-2">
            <span className="text-xl font-black tracking-tight text-white">PromtBI</span>
            <span className="text-gray-600 text-sm">|</span>
            <span className="text-xs font-medium text-gray-500">Tecnología de Tres Niveles</span>
          </div>
          
          <div className="flex gap-6 text-sm text-gray-500">
            <button onClick={() => setShowTerms(true)} className="hover:text-blue-400 transition-colors">Términos de Servicio</button>
            <button onClick={() => setShowPrivacy(true)} className="hover:text-blue-400 transition-colors">Política de Privacidad</button>
            <a href={waLink} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors flex items-center gap-1">
              <span className="text-green-500 text-base">✆</span> Contacto Ventas
            </a>
          </div>
        </div>
        
        <div className="mt-16 flex flex-col items-center justify-center gap-6 text-center w-full pb-8">
          <img 
            src="/Socio Microsoft.svg" 
            alt="Socio Oficial Microsoft" 
            className="h-16 md:h-20 w-auto object-contain drop-shadow-lg" 
          />
          <p className="text-white text-sm md:text-base font-medium tracking-wide drop-shadow-sm">
            © 2026 PromtBI | Official Member of Microsoft AI Cloud Partner Program | Tecnología respaldada por Tres Niveles.
          </p>
        </div>
      </div>

      {/* Modals */}
      <Modal isOpen={showTerms} onClose={() => setShowTerms(false)} title="Términos de Servicio de PromtBI">
        <p>¡Bienvenido a PromtBI, impulsado por Tres Niveles! Al utilizar nuestro servicio de orquestación de IA para Power BI, aceptas los siguientes términos de forma sencilla y transparente:</p>
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li><strong className="text-gray-200">Uso de la Plataforma:</strong> PromtBI es una herramienta diseñada para interactuar con tus reportes de Power BI mediante lenguaje natural. Nos comprometemos a mantener la plataforma operativa y actualizada para garantizar la mejor experiencia.</li>
          <li><strong className="text-gray-200">Responsabilidad de Datos:</strong> Tú mantienes la propiedad total y absoluta de tus datos y modelos de Power BI. PromtBI actúa únicamente como un intermediario (Copiloto) que lee e interpreta, sin alterar tu información original sin tu autorización explícita.</li>
          <li><strong className="text-gray-200">Suscripciones y Cancelaciones:</strong> Nuestras suscripciones se facturan mensualmente. Puedes cancelar tu plan en cualquier momento sin penalizaciones; el servicio se mantendrá activo hasta el final de tu ciclo de facturación actual.</li>
          <li><strong className="text-gray-200">Uso Adecuado:</strong> Esperamos que utilices PromtBI para potenciar tu análisis de datos de manera ética y legal. Nos reservamos el derecho de suspender cuentas que intenten vulnerar la seguridad de la plataforma.</li>
        </ul>
      </Modal>

      <Modal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} title="Política de Privacidad: Tus Datos Son Tuyos">
        <p>En PromtBI (por Tres Niveles), la seguridad de tu información corporativa es nuestra máxima prioridad. Entendemos que en el análisis de datos, la confidencialidad es innegociable.</p>
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li><strong className="text-gray-200">Cero Almacenamiento Permanente:</strong> PromtBI no almacena copias de tus bases de datos ni de tus reportes de Power BI en nuestros servidores de forma permanente. Procesamos tus consultas en memoria al vuelo y luego la información se descarta.</li>
          <li><strong className="text-gray-200">No Entrenamos Modelos con tu Data:</strong> Garantizamos que las preguntas que le haces a PromtBI y los datos de tu empresa JAMÁS se utilizarán para entrenar modelos de Inteligencia Artificial públicos ni compartidos con terceros.</li>
          <li><strong className="text-gray-200">Encriptación Bancaria:</strong> Toda la comunicación entre tu entorno de Power BI, nuestra API y los motores de IA se realiza mediante conexiones encriptadas de extremo a extremo (AES-256 / TLS).</li>
          <li><strong className="text-gray-200">Transparencia Total:</strong> Solo recopilamos información básica de tu cuenta para gestionar la facturación y enviarte avisos de servicio.</li>
        </ul>
        <p className="mt-4 italic text-gray-500">Confiamos en nuestra arquitectura serverless y en guardias deterministas de Python para asegurar que tu privacidad sea invulnerable.</p>
      </Modal>

    </footer>
  );
};

export default FooterPromtBI;
