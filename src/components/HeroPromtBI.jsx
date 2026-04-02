import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const HeroPromtBI = () => {
  const { search } = useLocation();
  return (
    <section className="relative bg-[#050505] text-white overflow-hidden py-20 lg:py-32">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="container mx-auto px-6 relative z-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 mb-8 animate-fade-in">
          <svg className="w-4 h-4 mr-2 text-blue-400 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z"/>
          </svg>
          <span className="text-blue-400 font-medium text-sm">Official Member of Microsoft AI Cloud Partner Program</span>
        </div>

        <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent">
          Tu reporte de Power BI <br /> 
          <span className="text-blue-500">IA Conversacional con Seguridad de Grado Azure</span>
        </h1>

        <p className="max-w-2xl mx-auto text-lg lg:text-xl text-gray-400 mb-10 leading-relaxed">
          Elimina el cuello de botella del DAX. Conecta tus datos y genera dashboards mediante lenguaje natural sobre infraestructura certificada por Microsoft. Tu analista virtual en tiempo real.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
          <Link
            to={`/login${search}`}
            className="px-8 py-4 bg-white text-black font-bold rounded-xl hover:bg-blue-500 hover:text-white transition-all duration-300 transform hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.1)] text-center"
          >
            Comenzar Ahora →
          </Link>
          <button className="px-8 py-4 bg-transparent text-white font-semibold border border-white/10 rounded-xl hover:bg-white/5 transition-all">
            Ver Demo Interactiva
          </button>
        </div>

        <div className="mt-20 mb-16 flex flex-col items-center justify-center gap-4">
          <p className="text-[10px] tracking-[0.2em] text-gray-500 uppercase font-semibold">Infraestructura de grado empresarial impulsada por:</p>
          <div className="flex flex-wrap justify-center items-center gap-12 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
            <img src="/azure-icon-1.svg" alt="Microsoft Azure" className="h-7 w-auto" />
            <img src="/power-bi-2.svg" alt="Power BI" className="h-7 w-auto" />
            <img src="/microsoft-icon-1.svg" alt="Microsoft 365" className="h-7 w-auto" />
          </div>
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
