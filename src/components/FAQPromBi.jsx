import React from 'react';

const FAQPromBi = () => {
  return (
    <section className="bg-[#050505] text-white py-24 relative overflow-hidden border-t border-white/5">
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            La técnica detrás de la magia
          </h2>
          <p className="text-gray-400 text-lg">
            Claridad total sobre licencias, código y seguridad estructural.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          
          {/* Objeción 1: Licencias Premium */}
          <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-8 hover:border-green-500/30 transition-colors shadow-lg">
            <h3 className="text-lg font-bold text-white mb-3">¿Necesito licencias Premium de Microsoft?</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              <strong className="text-gray-200">Definitivamente no.</strong> Ese es nuestro mayor diferenciador. PromBi logra un nivel de interactividad avanzada utilizando tu Power BI Embedded estándar. Cortamos de raíz la necesidad de escalar a licencias Premium o depender de capacidades XMLA de alto costo.
            </p>
          </div>

          {/* Objeción 2: Conocimiento DAX */}
          <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-8 hover:border-amber-500/30 transition-colors shadow-lg">
            <h3 className="text-lg font-bold text-white mb-3">¿Mi equipo necesita saber programar en DAX?</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              <strong className="text-gray-200">Cero.</strong> Democratizamos el dato. El usuario solo escribe en lenguaje natural. Si la petición requiere una medida que tu modelo actual no tiene, PromBi actúa como tu tutor: genera el código DAX preciso y te guía paso a paso sobre cómo insertarlo.
            </p>
          </div>

          {/* Objeción 3: Seguridad y Alucinaciones */}
          <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-8 hover:border-blue-500/30 transition-colors shadow-lg">
            <h3 className="text-lg font-bold text-white mb-3">¿Es seguro? ¿La IA puede inventar datos?</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              <strong className="text-gray-200">Imposible.</strong> No dejamos que el LLM decida solo. Hemos construido "Guardias Deterministas" en Python que validan cada instrucción. No hay alucinaciones. Además, nuestra arquitectura es resiliente: si las APIs de Microsoft fallan, el sistema se auto-cura y reintenta antes de mostrar un error al usuario.
            </p>
          </div>

        </div>
      </div>
    </section>
  );
};

export default FAQPromBi;
