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
                Tus KPIs financieros y operativos se generan en tiempo real. Sin esperas, sin cuellos de botella.
              </p>
            </div>
            <div className="relative mt-8 h-48 w-full bg-[#0a0f1a] rounded-xl border border-gray-800/50 overflow-hidden flex items-end justify-center gap-2 sm:gap-4 p-4">
              {/* Logo de Power BI de fondo como marca de agua */}
              <img src="/power-bi-2.svg" alt="Power BI" className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-24 opacity-10 grayscale group-hover:grayscale-0 group-hover:opacity-20 transition-all duration-700" />
              
              {/* Barras del gráfico animadas con Tailwind */}
              <div className="w-1/6 bg-blue-800/80 h-1/4 group-hover:h-[60%] transition-all duration-700 ease-out rounded-t-md relative z-10 shadow-[0_0_15px_rgba(30,64,175,0.5)]"></div>
              <div className="w-1/6 bg-blue-600/80 h-1/3 group-hover:h-[85%] transition-all duration-1000 ease-out rounded-t-md relative z-10 shadow-[0_0_15px_rgba(37,99,235,0.5)] delay-75"></div>
              <div className="w-1/6 bg-blue-500/80 h-1/5 group-hover:h-[40%] transition-all duration-500 ease-out rounded-t-md relative z-10 shadow-[0_0_15px_rgba(59,130,246,0.5)] delay-150"></div>
              <div className="w-1/6 bg-orange-500/90 h-1/2 group-hover:h-[95%] transition-all duration-700 ease-out rounded-t-md relative z-10 shadow-[0_0_15px_rgba(249,115,22,0.5)] delay-200"></div>
            </div>
          </div>

          {/* Tarjeta Mediana (Ahorro) */}
          <div className="md:col-span-2 md:row-span-1 bg-[#0f0f0f] border border-white/10 rounded-3xl p-8 group hover:border-green-500/40 transition-all duration-500 relative overflow-hidden shadow-lg flex flex-col justify-center">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 blur-[50px] group-hover:bg-green-500/20 transition-all duration-500"></div>
            <div className="relative z-10 flex flex-col items-start">
              <img src="/cost-management.svg" alt="Cost Management" className="h-12 w-12 object-contain mb-4 drop-shadow-sm" />
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Optimización de Costos</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Despliegue escalable para toda tu organización sin depender de licencias Premium (XMLA) por cada usuario.
                </p>
              </div>
            </div>
          </div>

          {/* Tarjeta Mediana (Cero DAX) */}
          <div className="md:col-span-1 md:row-span-1 bg-[#0f0f0f] border border-white/10 rounded-3xl p-6 group hover:border-amber-500/40 transition-all duration-500 relative overflow-hidden shadow-lg flex flex-col justify-between">
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-amber-500/10 blur-[40px] group-hover:bg-amber-500/20 transition-all duration-500"></div>
            <img src="/azure-openai.svg" alt="Azure OpenAI" className="h-12 w-12 object-contain mb-4 drop-shadow-sm" />
            <h3 className="text-lg font-bold text-white mb-2 relative z-10">Cero Código DAX</h3>
            <p className="text-gray-400 text-sm relative z-10 mb-4">
              De lenguaje natural a consultas complejas en milisegundos. Impulsado por el motor semántico de Azure OpenAI.
            </p>
          </div>

          {/* Tarjeta Pequeña (Resiliencia) */}
          <div className="md:col-span-1 md:row-span-1 bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-white/10 rounded-3xl p-6 group hover:border-purple-500/30 transition-all duration-500 relative overflow-hidden shadow-lg flex flex-col justify-center items-center text-center">
            <img src="/anomaly.svg" alt="Anomaly Detector" className="h-12 w-12 object-contain mb-4 drop-shadow-sm" />
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
