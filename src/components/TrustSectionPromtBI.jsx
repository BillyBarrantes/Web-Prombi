import React from 'react';

const TrustSectionPromtBI = () => {
  return (
    <section className="bg-[#030712] py-24 px-6 border-t border-gray-800/50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
            Seguridad y Cumplimiento de <span className="text-blue-500">Grado Enterprise</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            Tu información financiera y operativa nunca sale de un ecosistema protegido. Diseñado para cumplir con los estándares corporativos más estrictos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1: Infraestructura */}
          <div className="bg-[#0a0f1a] p-8 rounded-2xl border border-gray-800 hover:border-blue-500/50 transition-colors">
            <div className="flex items-center justify-center mb-8 h-16 w-full">
              <img src="/azure-icon-1.svg" alt="Microsoft Azure Logo" className="h-16 w-auto object-contain" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Infraestructura Microsoft Azure</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Toda nuestra operación y procesamiento reside en nodos dedicados de Microsoft Azure, garantizando redundancia global y cifrado de grado bancario de extremo a extremo.
            </p>
          </div>

          {/* Card 2: Privacidad */}
          <div className="bg-[#0a0f1a] p-8 rounded-2xl border border-gray-800 hover:border-blue-500/50 transition-colors">
            <div className="flex items-center justify-center mb-8 h-16 w-full">
              <img src="/defender.svg" alt="Microsoft Defender Security" className="h-16 w-auto object-contain" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Zero-Data-Retention</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Tus bases de datos permanecen contigo. Las consultas se procesan en la memoria RAM y se destruyen instantáneamente. Nunca almacenamos tu información ni entrenamos modelos con ella.
            </p>
          </div>

          {/* Card 3: Certificación */}
          <div className="bg-[#0a0f1a] p-8 rounded-2xl border border-gray-800 hover:border-blue-500/50 transition-colors">
            <div className="flex items-center justify-center mb-8 h-16 w-full">
              <img src="/microsoft-certified-partner.svg" alt="Microsoft Certified Partner Badge" className="h-16 w-auto object-contain" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Socio Oficial Certificado</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Como miembros del Microsoft AI Cloud Partner Program, PromtBI ha sido validado bajo los más altos estándares de calidad, seguridad e innovación en Inteligencia Artificial.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustSectionPromtBI;
