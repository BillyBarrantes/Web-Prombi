import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const TermsPage = () => {
  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans py-12 px-6 selection:bg-blue-500/30">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 text-sm">
          <ArrowLeft size={16} /> Volver a PromtBI
        </Link>
        <h1 className="text-3xl md:text-5xl font-bold mb-8">Términos de Servicio de PromtBI</h1>
        <div className="text-gray-400 text-lg space-y-6 leading-relaxed bg-[#0f0f0f] border border-white/10 p-8 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          <p>¡Bienvenido a PromtBI, impulsado por Tres Niveles! Al utilizar nuestro servicio de orquestación de IA para Power BI, aceptas los siguientes términos de forma sencilla y transparente:</p>
          <ul className="list-disc pl-5 space-y-4">
            <li><strong className="text-gray-200">Uso de la Plataforma:</strong> PromtBI es una herramienta diseñada para interactuar con tus reportes de Power BI mediante lenguaje natural. Nos comprometemos a mantener la plataforma operativa y actualizada para garantizar la mejor experiencia.</li>
            <li><strong className="text-gray-200">Responsabilidad de Datos:</strong> Tú mantienes la propiedad total y absoluta de tus datos y modelos de Power BI. PromtBI actúa únicamente como un intermediario (Copiloto) que lee e interpreta, sin alterar tu información original sin tu autorización explícita.</li>
            <li><strong className="text-gray-200">Suscripciones y Cancelaciones:</strong> Nuestras suscripciones se facturan mensualmente. Puedes cancelar tu plan en cualquier momento sin penalizaciones; el servicio se mantendrá activo hasta el final de tu ciclo de facturación actual.</li>
            <li><strong className="text-gray-200">Uso Adecuado:</strong> Esperamos que utilices PromtBI para potenciar tu análisis de datos de manera ética y legal. Nos reservamos el derecho de suspender cuentas que intenten vulnerar la seguridad de la plataforma.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
