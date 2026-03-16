import React from 'react';

const HowItWorksPromtBI = () => {
  return (
    <section className="bg-[#050505] text-white py-24 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-20">
          <h2 className="text-sm font-bold text-blue-500 tracking-widest uppercase mb-3">
            Instalación Cero Fricción
          </h2>
          <h3 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Del reporte estático <br/> a la magia visual en minutos.
          </h3>
          <p className="text-gray-400 text-lg">
            No toques tu infraestructura. Solo comparte tu reporte estándar y nosotros corremos todo en nuestro entorno serverless de alta disponibilidad.
          </p>
        </div>

        <div className="relative max-w-6xl mx-auto">
          <div className="hidden md:block absolute top-12 left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-blue-600/10 via-amber-500/40 to-green-500/10 z-0"></div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative z-10">
            <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-8 hover:border-blue-500/50 transition-all duration-300 group hover:-translate-y-2 shadow-lg hover:shadow-[0_10px_30px_rgba(59,130,246,0.1)] text-center md:text-left relative overflow-hidden">
              <div className="absolute top-0 right-0 text-8xl font-black text-white/[0.03] -mt-4 -mr-4 group-hover:text-blue-500/[0.05] transition-colors">1</div>
              <div className="w-16 h-16 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6 mx-auto md:mx-0 group-hover:bg-blue-500/20 transition-colors">
                <span className="text-2xl">🔗</span>
              </div>
              <h4 className="text-xl font-bold text-white mb-3">Conecta tu reporte PBI.</h4>
              <p className="text-gray-400 text-sm leading-relaxed">
                Comparte tu reporte estándar de Power BI. Nuestro backend en FastAPI y Supabase se encarga de la integración segura en segundos.
              </p>
            </div>

            <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-8 hover:border-amber-500/50 transition-all duration-300 group hover:-translate-y-2 shadow-lg hover:shadow-[0_10px_30px_rgba(245,158,11,0.1)] text-center md:text-left relative overflow-hidden">
              <div className="absolute top-0 right-0 text-8xl font-black text-white/[0.03] -mt-4 -mr-4 group-hover:text-amber-500/[0.05] transition-colors">2</div>
              <div className="w-16 h-16 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6 mx-auto md:mx-0 group-hover:bg-amber-500/20 transition-colors">
                <span className="text-2xl">💬</span>
              </div>
              <h4 className="text-xl font-bold text-white mb-3">Pide en lenguaje natural.</h4>
              <p className="text-gray-400 text-sm leading-relaxed">
                Olvida los filtros manuales. Escribe: <span className="text-amber-400 italic">"Muéstrame el top 5 de vendedores de este mes en formato de barras"</span>.
              </p>
            </div>

            <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-8 hover:border-green-500/50 transition-all duration-300 group hover:-translate-y-2 shadow-lg hover:shadow-[0_10px_30px_rgba(34,197,94,0.1)] text-center md:text-left relative overflow-hidden">
              <div className="absolute top-0 right-0 text-8xl font-black text-white/[0.03] -mt-4 -mr-4 group-hover:text-green-500/[0.05] transition-colors">3</div>
              <div className="w-16 h-16 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-6 mx-auto md:mx-0 group-hover:bg-green-500/20 transition-colors">
                <span className="text-2xl">✨</span>
              </div>
              <h4 className="text-xl font-bold text-white mb-3">Visualiza al instante.</h4>
              <p className="text-gray-400 text-sm leading-relaxed">
                La IA interpreta, dibuja el gráfico y acomoda el layout en tu pantalla. Decisiones ejecutivas basadas en datos, sin esperas.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksPromtBI;
