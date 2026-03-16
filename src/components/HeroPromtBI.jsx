import React from 'react';

const HeroPromtBI = () => {
  return (
    <section className="relative bg-[#050505] text-white overflow-hidden py-20 lg:py-32">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="container mx-auto px-6 relative z-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 mb-8 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]"></span>
          <span className="text-sm font-medium text-gray-400">Impulsado por Gemini + LangGraph</span>
        </div>

        <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent">
          Tu reporte de Power BI <br /> 
          <span className="text-blue-500">ahora habla tu idioma</span>
        </h1>

        <p className="max-w-2xl mx-auto text-lg lg:text-xl text-gray-400 mb-10 leading-relaxed">
          Olvida el cuello de botella del DAX. Escribe lo que necesitas y nuestro orquestador dibuja gráficos, filtra fechas y acomoda tu dashboard en 5 segundos. **Tu analista de datos virtual en tiempo real.**
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <button className="px-8 py-4 bg-white text-black font-bold rounded-xl hover:bg-blue-500 hover:text-white transition-all duration-300 transform hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
            Integrar PromtBI en mi empresa
          </button>
          <button className="px-8 py-4 bg-transparent text-white font-semibold border border-white/10 rounded-xl hover:bg-white/5 transition-all">
            Ver Demo Interactiva
          </button>
        </div>

        <div className="relative max-w-4xl mx-auto mt-12 group">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-amber-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
          <div className="relative bg-[#0f0f0f] border border-white/10 rounded-2xl p-4 shadow-2xl">
             <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-4">
                <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center font-bold text-black">PBI</div>
                <div className="text-left">
                  <p className="text-sm font-bold">PromtBI AI Analyst</p>
                  <p className="text-[10px] text-amber-400">Conectado a Power BI Embedded</p>
                </div>
             </div>
             <div className="space-y-4 text-left p-4">
                <div className="bg-white/5 p-3 rounded-lg max-w-[80%] ml-auto text-sm border border-white/5">
                  "Genera una matriz con las ventas de este trimestre y compáralas con el Q anterior."
                </div>
                <div className="bg-blue-600/20 p-3 rounded-lg max-w-[85%] text-sm border border-blue-500/30">
                  <p className="font-bold text-blue-400 mb-1">Layout actualizado en 4.2s:</p>
                  Filtro temporal aplicado. He dibujado la matriz en el lienzo principal y agregado un KPI de crecimiento. No se detectaron errores en tu modelo.
                  <br/><span className="text-xs text-gray-400 mt-2 block">⚡ Infraestructura Serverless Activa</span>
                </div>
             </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroPromtBI;
