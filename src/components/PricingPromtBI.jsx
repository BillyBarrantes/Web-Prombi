import React from 'react';

const PricingPromtBI = () => {
  return (
    <section className="bg-[#050505] text-white py-24 relative overflow-hidden">
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Invierte en decisiones, no en horas de Excel
          </h2>
          <p className="text-gray-400 text-lg">
            Planes diseñados para escalar con tu negocio. Cancela cuando quieras.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-center">
          <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-8 hover:bg-white/[0.02] transition-colors">
            <h3 className="text-xl font-semibold text-gray-300 mb-2">Plan Piloto</h3>
            <p className="text-gray-500 text-sm mb-6">Ideal para probar la magia del lenguaje natural.</p>
            <div className="mb-8">
              <span className="text-4xl font-bold">S/ 0</span>
            </div>
            <ul className="space-y-4 mb-8 text-gray-400 text-sm">
              <li className="flex items-center gap-3"><span className="text-blue-500">✓</span> 1 Conexión a Base de Datos</li>
              <li className="flex items-center gap-3"><span className="text-blue-500">✓</span> 50 consultas mensuales</li>
              <li className="flex items-center gap-3"><span className="text-blue-500">✓</span> Respuestas en texto</li>
              <li className="flex items-center gap-3"><span className="text-blue-500">✓</span> Soporte comunitario</li>
            </ul>
            <button className="w-full py-3 rounded-xl border border-white/20 text-white font-medium hover:bg-white/10 transition-all">
              Probar Gratis
            </button>
          </div>

          <div className="bg-gradient-to-b from-[#1a1f2e] to-[#0f0f0f] border border-blue-500/50 rounded-2xl p-8 transform md:scale-105 shadow-[0_0_30px_rgba(59,130,246,0.15)] relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              Más Elegido
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Plan Profesional</h3>
            <p className="text-gray-400 text-sm mb-6">Para gerentes y analistas que toman decisiones diarias.</p>
            <div className="mb-8">
              <span className="text-5xl font-bold">S/ 69</span>
              <span className="text-gray-400 text-lg">/mes</span>
            </div>
            <ul className="space-y-4 mb-8 text-gray-300 text-sm font-medium">
              <li className="flex items-center gap-3"><span className="text-blue-400">✓</span> Conexión directa con SQL/ERP</li>
              <li className="flex items-center gap-3"><span className="text-blue-400">✓</span> Consultas ilimitadas</li>
              <li className="flex items-center gap-3"><span className="text-blue-400">✓</span> Generación de Dashboards visuales</li>
              <li className="flex items-center gap-3"><span className="text-blue-400">✓</span> Análisis de notas de voz</li>
              <li className="flex items-center gap-3"><span className="text-blue-400">✓</span> Soporte prioritario por email</li>
            </ul>
            <button className="w-full py-4 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all">
              Probar PromtBI en mi empresa
            </button>
          </div>

          <div className="bg-[#0f0f0f] border border-amber-500/30 rounded-2xl p-8 relative overflow-hidden group hover:border-amber-500/60 transition-colors">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[50px] group-hover:bg-amber-500/20 transition-all"></div>
            <h3 className="text-xl font-bold text-amber-500 mb-2">Plan Business</h3>
            <p className="text-gray-500 text-sm mb-6">Para organizaciones que exigen control y gobernanza.</p>
            <div className="mb-8">
              <span className="text-4xl font-bold">S/ 289</span>
              <span className="text-gray-500">/mes</span>
            </div>
            <ul className="space-y-4 mb-8 text-gray-400 text-sm">
              <li className="flex items-center gap-3"><span className="text-amber-500">✓</span> Todo lo del Plan Profesional</li>
              <li className="flex items-center gap-3"><span className="text-amber-500">✓</span> Seguridad de Grado Microsoft Azure</li>
              <li className="flex items-center gap-3"><span className="text-amber-500">✓</span> Soporte Técnico Dedicado</li>
              <li className="flex items-center gap-3"><span className="text-amber-500">✓</span> API Access para integraciones</li>
              <li className="flex items-center gap-3"><span className="text-amber-500">✓</span> Account Manager dedicado 24/7</li>
            </ul>
            <button className="w-full py-3 rounded-xl border border-amber-500/50 text-amber-500 font-bold hover:bg-amber-500/10 transition-all">
              Contactar Ventas
            </button>
          </div>
        </div>
      </div>

    </section>
  );
};

export default PricingPromtBI;
