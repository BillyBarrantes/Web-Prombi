import React, { useState } from 'react';

const PricingPromBi = () => {
  const [checkoutPlan, setCheckoutPlan] = useState(null);
  const [showCalendly, setShowCalendly] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardBrand, setCardBrand] = useState('unknown'); // 'visa', 'mastercard', 'amex', 'unknown'

  const handleCardNumber = (e) => {
    let value = e.target.value.replace(/\D/g, ''); // keep numbers only
    let brand = 'unknown';

    // Detect brand
    if (value.match(/^4/)) {
      brand = 'visa';
    } else if (value.match(/^(5[1-5]|2[2-7])/)) {
      brand = 'mastercard';
    } else if (value.match(/^3[47]/)) {
      brand = 'amex';
    }
    setCardBrand(brand);

    // Format
    if (brand === 'amex') {
      value = value.substring(0, 15);
      const parts = [];
      if (value.length > 0) parts.push(value.substring(0, 4));
      if (value.length > 4) parts.push(value.substring(4, 10));
      if (value.length > 10) parts.push(value.substring(10, 15));
      value = parts.join(' ');
    } else {
      value = value.substring(0, 16);
      const parts = [];
      for (let i = 0; i < value.length; i += 4) {
         parts.push(value.substring(i, i + 4));
      }
      value = parts.join(' ');
    }
    setCardNumber(value);
  };

  const handleExpiry = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 2) {
      value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    setExpiry(value);
  };

  const handleCvc = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    const maxLength = cardBrand === 'amex' ? 4 : 3;
    setCvc(value.substring(0, maxLength));
  };

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
            <p className="text-gray-500 text-sm mb-6">Para validar la magia de PromBi.</p>
            <div className="mb-8">
              <span className="text-4xl font-bold">S/ 0</span>
            </div>
            <ul className="space-y-4 mb-8 text-gray-400 text-sm">
              <li className="flex items-center gap-3"><span className="text-blue-500">✓</span> 1 Conexión a Base de Datos</li>
              <li className="flex items-center gap-3"><span className="text-blue-500">✓</span> 50 consultas mensuales</li>
              <li className="flex items-center gap-3"><span className="text-blue-500">✓</span> Respuestas en texto</li>
              <li className="flex items-center gap-3"><span className="text-blue-500">✓</span> Soporte comunitario</li>
            </ul>
            <button 
              onClick={() => setCheckoutPlan('piloto')}
              className="w-full py-3 rounded-xl border border-white/20 text-white font-medium hover:bg-white/10 transition-all">
              Probar Gratis
            </button>
          </div>

          <div className="bg-gradient-to-b from-[#1a1f2e] to-[#0f0f0f] border border-blue-500/50 rounded-2xl p-8 transform md:scale-105 shadow-[0_0_30px_rgba(59,130,246,0.15)] relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              Más Elegido
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Plan Profesional</h3>
            <p className="text-gray-400 text-sm mb-6">Para dueños que toman el control.</p>
            <div className="mb-8">
              <span className="text-5xl font-bold">S/ 69</span>
              <span className="text-gray-400 text-lg">/mes</span>
            </div>
            <ul className="space-y-4 mb-8 text-gray-300 text-sm font-medium">
              <li className="flex items-center gap-3"><span className="text-blue-400">✓</span> Conexiones ilimitadas</li>
              <li className="flex items-center gap-3"><span className="text-blue-400">✓</span> Consultas ilimitadas</li>
              <li className="flex items-center gap-3"><span className="text-blue-400">✓</span> Generación de Dashboards visuales</li>
              <li className="flex items-center gap-3"><span className="text-blue-400">✓</span> Análisis de notas de voz</li>
              <li className="flex items-center gap-3"><span className="text-blue-400">✓</span> Soporte prioritario por email</li>
            </ul>
            <button 
              onClick={() => setCheckoutPlan('pro')}
              className="w-full py-4 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all">
              Probar PromBi en mi empresa
            </button>
          </div>

          <div className="bg-[#0f0f0f] border border-amber-500/30 rounded-2xl p-8 relative overflow-hidden group hover:border-amber-500/60 transition-colors">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[50px] group-hover:bg-amber-500/20 transition-all"></div>
            <h3 className="text-xl font-bold text-amber-500 mb-2">Plan Business</h3>
            <p className="text-gray-500 text-sm mb-6">Para empresas que escalan con datos.</p>
            <div className="mb-8">
              <span className="text-4xl font-bold">S/ 289</span>
              <span className="text-gray-500">/mes</span>
            </div>
            <ul className="space-y-4 mb-8 text-gray-400 text-sm">
              <li className="flex items-center gap-3"><span className="text-amber-500">✓</span> Todo lo del Plan Profesional</li>
              <li className="flex items-center gap-3"><span className="text-amber-500">✓</span> Modelos de IA personalizados</li>
              <li className="flex items-center gap-3"><span className="text-amber-500">✓</span> Cruce de inventarios multi-sucursal</li>
              <li className="flex items-center gap-3"><span className="text-amber-500">✓</span> API Access para integraciones</li>
              <li className="flex items-center gap-3"><span className="text-amber-500">✓</span> Account Manager dedicado 24/7</li>
            </ul>
            <button 
              onClick={() => setShowCalendly(true)}
              className="w-full py-3 rounded-xl border border-amber-500/50 text-amber-500 font-bold hover:bg-amber-500/10 transition-all">
              Contactar Ventas
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Checkout */}
      {checkoutPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-8 max-w-md w-full relative shadow-[0_0_50px_rgba(59,130,246,0.1)]">
            <button 
              onClick={() => setCheckoutPlan(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
            >
              ✕
            </button>
            <h3 className="text-2xl font-bold mb-6 text-white text-center">
              {checkoutPlan === 'piloto' ? 'Comienza tu Prueba de 15 Días' : 'Suscripción Profesional'}
            </h3>
            
            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nombre en la Tarjeta</label>
                <input 
                  type="text" 
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  autoComplete="cc-name"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors" 
                  placeholder="Ej. Juan Pérez" 
                />
              </div>
              <div className="relative">
                <label className="block text-sm text-gray-400 mb-1">Número de Tarjeta</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={cardNumber}
                    onChange={handleCardNumber}
                    autoComplete="cc-number"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 pr-16 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors font-mono" 
                    placeholder="0000 0000 0000 0000" 
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center">
                    {cardBrand === 'visa' && (
                      <div className="bg-[#1a1f36] border border-[#2d334a] rounded px-2 py-0.5 shadow-sm">
                        <span className="text-white font-black italic text-[10px] tracking-wider">VISA</span>
                      </div>
                    )}
                    {cardBrand === 'mastercard' && (
                      <div className="flex relative items-center justify-center w-8">
                        <div className="w-5 h-5 rounded-full bg-[#eb001b] opacity-90 absolute -translate-x-1.5 mix-blend-screen"></div>
                        <div className="w-5 h-5 rounded-full bg-[#f79e1b] opacity-90 absolute translate-x-1.5 mix-blend-screen"></div>
                      </div>
                    )}
                    {cardBrand === 'amex' && (
                      <div className="bg-[#006fcf] rounded px-1.5 py-0.5 shadow-sm">
                        <span className="text-white font-bold text-[10px] tracking-wider">AMEX</span>
                      </div>
                    )}
                    {cardBrand === 'unknown' && (
                      <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-xs font-medium text-gray-400 mb-1">Vencimiento</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="MM/AA" 
                      value={expiry} 
                      onChange={handleExpiry} 
                      autoComplete="cc-exp"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors font-mono" 
                    />
                  </div>
                </div>
                <div className="relative group">
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-medium text-gray-400">CVC</label>
                    <div className="text-gray-500 cursor-help hover:text-white transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                  </div>
                  <input 
                    type="text" 
                    placeholder="123" 
                    value={cvc} 
                    onChange={handleCvc} 
                    autoComplete="cc-csc"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors font-mono" 
                  />
                  
                  {/* Tooltip Flotante Premium Optimizado */}
                  <div className="absolute z-50 hidden group-hover:block w-48 bg-[#1a1f2e] border border-white/10 rounded-xl p-3 shadow-[0_20px_50px_rgba(0,0,0,0.9)] animate-fade-in pointer-events-none
                                  bottom-full right-0 mb-2 md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:left-full md:ml-4 md:mb-0">
                    <p className="text-[10px] text-gray-300 mb-2 text-center font-medium">
                      {cardBrand === 'amex' ? '4 dígitos al frente' : '3 dígitos al reverso'}
                    </p>
                    
                    {/* Tarjeta rediseñada en tonos claros/metálicos */}
                    <div className={`w-full h-20 rounded-lg relative overflow-hidden flex flex-col justify-center shadow-inner ${cardBrand === 'amex' ? 'bg-gradient-to-br from-blue-100 to-blue-300' : 'bg-gradient-to-br from-gray-200 to-gray-400'}`}>
                      {cardBrand === 'amex' ? (
                        // Dibujo Amex (Frente - Claro)
                        <div className="w-full h-full relative">
                          <div className="absolute top-2 right-2 border border-blue-400/50 bg-white/60 px-1 rounded shadow-sm">
                            <span className="text-[9px] text-blue-900 font-bold font-mono tracking-widest">1234</span>
                          </div>
                          <div className="absolute bottom-3 left-3 w-6 h-4 bg-blue-900/20 rounded-sm"></div>
                        </div>
                      ) : (
                        // Dibujo Standard (Reverso - Plateado)
                        <div className="w-full h-full relative flex flex-col">
                          <div className="w-full h-4 bg-gray-800 mt-2 opacity-90"></div>
                          <div className="w-3/4 h-5 bg-white mt-2 ml-2 flex items-center justify-end pr-1 rounded-sm shadow-sm">
                            <span className="text-[10px] text-red-600 font-bold font-mono tracking-widest border border-red-500/30 px-1 rounded bg-red-50">123</span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Triángulo del Tooltip (Ajustado para Desktop y Mobile) */}
                    <div className="absolute w-3 h-3 bg-[#1a1f2e] border-white/10 transform rotate-45
                                    -bottom-1.5 right-3 border-b border-r 
                                    md:bottom-auto md:top-1/2 md:-left-1.5 md:-translate-y-1/2 md:border-l md:border-b md:border-r-0"></div>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => setCheckoutPlan(null)}
                className="w-full py-4 mt-6 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all">
                {checkoutPlan === 'piloto' ? 'Iniciar Prueba (S/ 0.00)' : 'Pagar S/ 69.00'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Calendly */}
      {showCalendly && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-6 max-w-4xl w-full h-[80vh] relative shadow-[0_0_50px_rgba(245,158,11,0.1)] flex flex-col">
            <button 
              onClick={() => setShowCalendly(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors z-10"
            >
              ✕
            </button>
            <h3 className="text-2xl font-bold mb-4 text-white text-center">
              Agendar Demo Ejecutiva
            </h3>
            <div className="flex-1 w-full bg-white rounded-xl overflow-hidden">
              <iframe 
                src="https://calendly.com/" 
                width="100%" 
                height="100%" 
                frameBorder="0"
                title="Calendly"
              ></iframe>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default PricingPromBi;
