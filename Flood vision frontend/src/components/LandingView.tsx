import { useAppStore } from '../store';
import { ThemeVariant } from '../types';
import { ArrowRight, Eye, ShieldCheck, Cpu, Waves } from 'lucide-react';

export default function LandingView() {
  const { setView, activeLayout } = useAppStore();

  const isGlass = activeLayout === ThemeVariant.GLASSMORPHISM;
  const panelStyle = isGlass ? 'glass-panel' : 'neu-extrude';

  const bentoCards = [
    {
      title: 'Street View AI',
      icon: Eye,
      color: 'text-primary',
      desc: 'Analyzing ground-level assets natively. Cybernetic computer vision uses multi-modal Gemini evaluation to classify drain clogging, curb elevation, and structural blockages before storms arrive.'
    },
    {
      title: 'Smart Routing',
      icon: ShieldCheck,
      color: 'text-secondary',
      desc: 'Dynamic risk-aware route planning. Prioritizes vehicle clearance and water heights over sheer shortest path to secure safe corridors for citizen evacuations or emergency responders.'
    },
    {
      title: 'IoT Sentinel',
      icon: Cpu,
      color: 'text-tertiary',
      desc: 'Ultra low-power ESP32 microcontrollers reporting continuous HC-SR04 ultrasonic water monitoring metrics over robust remote MQTT gateways directly into active warning channels.'
    }
  ];

  return (
    <div className="flex-1 overflow-y-auto px-6 md:px-12 py-12 md:py-20 relative space-y-20 no-scrollbar select-none">
      {/* Decorative Orbs */}
      <div className="absolute top-[-100px] left-[-100px] w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-200px] right-[-100px] w-96 h-96 bg-secondary/5 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Hero Module Split Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative">
        <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
          <h1 className="text-4xl md:text-[56px] font-bold leading-tight tracking-tight text-on-surface">
            AI-Powered <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-primary-container">
              Flood Resilience
            </span>
          </h1>
          <p className="text-on-surface-variant/80 text-sm md:text-base leading-relaxed max-w-xl mx-auto lg:mx-0">
            A high-fidelity multi-pillar intelligence environment bridging natural water risks and urban infrastructure. Assess, anticipate, and mitigate flash floods with unprecedented software precision.
          </p>
          <div className="pt-4 flex justify-center lg:justify-start">
            <button
              onClick={() => setView('dashboard')}
              className="px-8 py-4 bg-primary-container text-black font-semibold rounded-full hover:shadow-[0_0_30px_rgba(62,144,255,0.4)] active:scale-98 transition-all hover:scale-102 flex items-center gap-2 group border border-white/10 cursor-pointer"
            >
              <span>Launch Command Dashboard</span>
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* Hero Visual Render Panel */}
        <div className="lg:col-span-6 flex justify-center">
          <div className={`relative w-full aspect-square max-w-md ${panelStyle} rounded-3xl overflow-hidden shadow-2xl group border border-white/10 transition-all duration-300`}>
            {/* Dark tinting matching Hydro-Aura */}
            <div className="absolute inset-0 bg-black/40 mix-blend-multiply z-10 pointer-events-none"></div>
            <img 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBT-PPdmuYJJxalbnUkE3eGHWSg8YiGb4JjTyV11MUxyOW8SemPqahs0mcdQeobgDkkXAu7x83yV8HF3ja7gNpIK6w7D5tIpaMeIuhCTnFyaMGWUtmR94dvfKzqVavUplmLfbjjOQIpa9Bo9bAqxuZAODjM245rX8DiUyI8ohuwcWWDBxNo4qiZVTsMI5V4PhscgSvmP6aFyPwzY8G3ol8i7r8T2ZekMrG5D4b15B_cxQtYOeyaAemnILCyT2kVvCUlKAV1SOkmNeo" 
              alt="Holographic Town Hydrological Heat Grid" 
              className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:scale-103 transition-transform duration-700"
              referrerPolicy="no-referrer"
            />
            {/* Floating Telemetry Badge Overlay inside image container */}
            <div className={`absolute bottom-6 left-6 right-6 ${isGlass ? 'glass-panel' : 'bg-surface/90 border border-white/5'} rounded-xl p-4 flex justify-between items-center z-20 shadow-xl opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300`}>
              <div>
                <p className="text-[10px] font-mono uppercase text-primary tracking-widest">Active Monitors</p>
                <h4 className="text-sm font-semibold text-white">2.4K Sensors Feeding</h4>
              </div>
              <div className="flex items-center gap-2 text-secondary font-semibold font-mono text-xs">
                <span className="h-2 w-2 rounded-full bg-secondary animate-pulse shadow-[0_0_5px_#47e266]"></span>
                <span>ONLINE</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Pillar Modules section */}
      <section className="space-y-4">
        <div className="text-center max-w-xl mx-auto mb-10">
          <h2 className="text-xl md:text-2xl font-bold">Six Foundations of Flood Mitigation</h2>
          <p className="text-xs text-outline font-mono uppercase tracking-widest mt-1">
            Engineered full-stack monitoring ecosystems
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {bentoCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <div 
                key={i} 
                className={`${panelStyle} rounded-2xl p-6 flex flex-col gap-4 hover:-translate-y-1.5 transition-transform duration-300 relative overflow-hidden text-left`}
              >
                {/* Edge accent line matching the theme */}
                <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-primary to-transparent"></div>
                
                <div className={`w-12 h-12 rounded-full bg-white/5 flex items-center justify-center ${card.color} border border-white/5`}>
                  <Icon className="h-6 w-6" />
                </div>
                
                <h3 className="text-lg font-bold text-white tracking-tight border-b border-white/5 pb-2">
                  {card.title}
                </h3>
                
                <p className="text-xs text-on-surface-variant/90 leading-relaxed font-sans">
                  {card.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Landing Foot banner and interactive command prompt click */}
      <section className={`p-8 rounded-2xl ${panelStyle} flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative`}>
        <div className="absolute inset-0 bg-primary/2 opacity-5 pointer-events-none"></div>
        <div className="space-y-2 text-left">
          <h3 className="text-base font-semibold text-white">Ready to examine active flood telemetry streams?</h3>
          <p className="text-xs text-outline font-sans max-w-xl">
            Simulate path tolerances inside Mekong Delta risk vectors or analyze real-time CCTV imagery predictions via gemini integrations.
          </p>
        </div>
        <button
          onClick={() => setView('dashboard')}
          className="px-6 py-3 bg-[#1c1b1b] border border-white/10 text-primary uppercase font-mono tracking-widest text-xs font-semibold rounded-lg hover:bg-white/5 cursor-pointer flex-shrink-0"
        >
          Activate Console
        </button>
      </section>
    </div>
  );
}
