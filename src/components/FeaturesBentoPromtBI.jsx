import React from 'react';

const FeaturesBentoPromtBI = () => {
  return (
    <section className="bg-[#050505] text-white py-24 relative overflow-hidden">
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            El fin de los cuellos de botella en datos.
          </h2>
          <p className="text-gray-400 text-lg">
            Arquitectura de vanguardia que no solo visualiza, sino que protege tu bolsillo y educa a tu equipo.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-6xl mx-auto auto-rows-[240px]">
          
          {/* Tarjeta Principal */}
          <div className="md:col-span-2 md:row-span-2 bg-[#0f0f0f] border border-white/10 rounded-3xl p-8 group hover:border-blue-500/50 transition-all duration-500 relative overflow-hidden flex flex-col justify-between shadow-lg">
            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-blue-600/20 blur-[80px] group-hover:bg-blue-500/30 transition-all duration-500"></div>
            <div className="relative z-10 mb-8">
              <h3 className="text-2xl font-bold text-white mb-3">Magia Visual Dinámica</h3>
              <p className="text-gray-400 text-base leading-relaxed max-w-md">
                Tú pides, PromtBI dibuja. La IA genera gráficos de barras, matrices y KPIs en tiempo real. Filtra fechas dinámicamente ("este trimestre") y acomoda el layout en pantalla en menos de 5 segundos. Interactividad total sin clics.
              </p>
            </div>
            <div className="relative w-full h-48 bg-white/5 border border-white/10 rounded-xl overflow-hidden group-hover:-translate-y-2 transition-transform duration-500 p-4 flex items-end gap-2">
              <div className="w-1/4 bg-blue-500/80 rounded-t-sm h-[40%]"></div>
              <div className="w-1/4 bg-blue-400/80 rounded-t-sm h-[70%]"></div>
              <div className="w-1/4 bg-blue-300/80 rounded-t-sm h-[50%]"></div>
              <div className="w-1/4 bg-cyan-400/80 rounded-t-sm h-[90%] shadow-[0_0_15px_rgba(34,211,238,0.5)]"></div>
            </div>
          </div>

          {/* Tarjeta Mediana (Ahorro) */}
          <div className="md:col-span-2 md:row-span-1 bg-[#0f0f0f] border border-white/10 rounded-3xl p-8 group hover:border-green-500/40 transition-all duration-500 relative overflow-hidden shadow-lg flex flex-col justify-center">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 blur-[50px] group-hover:bg-green-500/20 transition-all duration-500"></div>
            <div className="relative z-10 flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0 border border-green-500/20">
                <span className="text-green-500 text-xl">$</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Ahorro Brutal en Licencias</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Logra interactividad avanzada usando <strong className="text-gray-200">Power BI Embedded estándar</strong>. Evita pagar miles de dólares en las carísimas licencias Premium (XMLA) de Microsoft.
                </p>
              </div>
            </div>
          </div>

          {/* Tarjeta Mediana (Cero DAX) */}
          <div className="md:col-span-1 md:row-span-1 bg-[#0f0f0f] border border-white/10 rounded-3xl p-6 group hover:border-amber-500/40 transition-all duration-500 relative overflow-hidden shadow-lg flex flex-col justify-between">
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-amber-500/10 blur-[40px] group-hover:bg-amber-500/20 transition-all duration-500"></div>
            <h3 className="text-lg font-bold text-white mb-2 relative z-10">Cero Conocimiento DAX</h3>
            <p className="text-gray-400 text-sm relative z-10 mb-4">
              ¿Pides algo imposible? La IA no falla: te da un minitutorial con el <strong className="text-amber-400">código DAX exacto</strong> para agregarlo a tu modelo.
            </p>
          </div>

          {/* Tarjeta Pequeña (Resiliencia) */}
          <div className="md:col-span-1 md:row-span-1 bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-white/10 rounded-3xl p-6 group hover:border-purple-500/30 transition-all duration-500 relative overflow-hidden shadow-lg flex flex-col justify-center items-center text-center">
            <div className="flex gap-2 mb-4 opacity-70 group-hover:opacity-100 transition-opacity">
               <span className="text-2xl">🛡️</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Auto-Curación</h3>
            <p className="text-gray-500 text-xs">
              Guardias deterministas en Python. Cero alucinaciones y reintento automático si Microsoft falla.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesBentoPromtBI;
