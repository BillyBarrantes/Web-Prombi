import React from 'react'
import HeroPromBi from './components/HeroPromBi'
import HowItWorksPromBi from './components/HowItWorksPromBi'
import FeaturesBentoPromBi from './components/FeaturesBentoPromBi'
import PricingPromBi from './components/PricingPromBi'
import FAQPromBi from './components/FAQPromBi'
import FooterPromBi from './components/FooterPromBi'

export default function App() {
  return (
    <main className="min-h-screen bg-[#050505] font-sans selection:bg-blue-500/30">
      <HeroPromBi />
      <HowItWorksPromBi />
      <FeaturesBentoPromBi />
      <PricingPromBi />
      <FAQPromBi />
      <FooterPromBi />
    </main>
  );
}
