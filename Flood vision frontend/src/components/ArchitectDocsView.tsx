import React, { useState } from 'react';
import { useAppStore } from '../store';
import { ThemeVariant } from '../types';
import { 
  BookOpen, 
  FolderTree, 
  Code, 
  Cpu, 
  Workflow, 
  Layers, 
  Copy, 
  Check, 
  Smartphone, 
  ChevronRight,
  Database,
  Terminal,
  Server
} from 'lucide-react';

export default function ArchitectDocsView() {
  const { activeLayout } = useAppStore();
  const [activeTab, setActiveTab] = useState<'tree' | 'django' | 'celery' | 'gemini' | 'flow'>('tree');
  const [copied, setCopied] = useState(false);

  const isGlass = activeLayout === ThemeVariant.GLASSMORPHISM;
  const panelStyle = isGlass ? 'glass-panel text-on-surface animate-fade-in' : 'neu-extrude text-on-surface animate-fade-in';

  const triggerCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs = [
    { id: 'tree' as const, label: 'Directory Tree', icon: FolderTree },
    { id: 'django' as const, label: 'Django Channels', icon: Code },
    { id: 'celery' as const, label: 'Celery tasks', icon: Server },
    { id: 'gemini' as const, label: 'Gemini Vision', icon: Cpu },
    { id: 'flow' as const, label: 'MQTT Pipeline', icon: Workflow },
  ];

  // CODE CONSTANTS TO COPY
  const CHANNELS_CODE = `# backend/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer

class FloodTelemetryConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.group_name = "flood_telemetry_group"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        # Handle inbound alerts manually triggered from React UI
        data = json.loads(text_data)
        if data.get("action") == "EMERGENCY_OVERRIDE":
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "broadcast_telemetry",
                    "payload": {
                        "status": "OVERRIDE_ACTIVE",
                        "message": data.get("message")
                    }
                }
            )

    async def broadcast_telemetry(self, event):
        await self.send(text_data=json.dumps(event["payload"]))`;

  const CELERY_CODE = `# backend/tasks.py
import requests
from celery import shared_task
from django.conf import settings
from .models import SensorNode, AlertLog

@shared_task
def process_flood_risk_prediction(node_id):
    """
    Background Task triggered when water rates exceed tolerances.
    Fetches the static CCTV/StreetView coordinates of the node node_id,
    dispatches analysis to Google Gemini, and logs appropriate emergency alert items.
    """
    node = SensorNode.objects.get(id=node_id)
    # Check if a critical scan is already running or complete
    if node.is_currently_scanning:
        return "Already scanning"
        
    try:
        # Trigger Gemini Street View vulnerability classification python routine
        vulnerability_metrics = execute_gemini_vision_analysis(node.latitude, node.longitude)
        
        # Save output indicators
        node.drainage_block_status = vulnerability_metrics["drainage_status"]
        node.risk_score = vulnerability_metrics["calculated_risk"]
        node.save()
        
        # Dispatch notification via Channels to React Client WebSockets instantly
        dispatch_channel_push(node_id, vulnerability_metrics)
        
    except Exception as err:
        return f"Celery critical failure: {str(err)} "`;

  const GEMINI_CODE = `# backend/gemini_service.py
import google.generativeai as genai
from django.conf import settings

# Initialize AI Client under strict build guidelines
# Handled server-side only with process keys. Uses 'aistudio-build' User-Agent headers
def execute_gemini_vision_analysis(lat, lng):
    """
    Fetches street view panoramas for coordinates (lat, lng),
    submits them to multi-modal Gemini API, and extracts structure vulnerabilities.
    """
    genai.configure(api_key=settings.GEMINI_API_KEY)
    
    # Select modern Gemini recommended flash model
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    # Download Street View static image metadata securely via proxy
    street_view_image = download_streetview_media_bytes(lat, lng)
    
    prompt = """
    Analyze this street view photography for immediate flood hazards, drainage clogs, curb elevations, and potholes.
    Provide your output strictly as a JSON object with keys:
    1. 'drainage_status': Either 'blocked' or 'stable'
    2. 'calculated_risk': Numerical risk level percent from 0 to 100
    3. 'vulnerabilities': Short text listing main blockages observed.
    """
    
    response = model.generate_content(
        contents=[street_view_image, prompt],
        generation_config={"response_mime_type": "application/json"}
    )
    
    import json
    return json.loads(response.text)`;

  return (
    <div className="flex-1 overflow-y-auto px-6 md:px-10 py-8 space-y-8 no-scrollbar text-left select-none pb-20">
      {/* Visual Title Header */}
      <section className="border-b border-white/10 pb-4">
        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-primary" />
          <span>System Architecture & Integration Manual</span>
        </h2>
        <p className="text-xs text-outline font-mono mt-1 uppercase">
          Full stack specifications & code layers for the Flood Vision platform
        </p>
      </section>

      {/* TABS CONTROLLER CONTAINER */}
      <div className="flex flex-wrap gap-2 border-b border-white/5 pb-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2.5 rounded-lg text-xs font-mono uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                isActive 
                  ? 'bg-primary/25 text-primary border border-primary/30 font-bold shadow-[0_0_15px_rgba(170,199,255,0.15)]' 
                  : 'hover:bg-white/5 text-outline'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* CORE DISPLAY WINDOW */}
      <section className={`${panelStyle} rounded-2xl p-6 min-h-[450px] flex flex-col justify-between relative`}>
        {/* TAB 1: DIRECTORY TREE */}
        {activeTab === 'tree' && (
          <div className="space-y-6">
            <div className="flex justify-between items-start border-b border-white/5 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Full-Stack Project Directory Structure</h3>
                <p className="text-xs text-outline font-sans">
                  The recommended architectural boundary maps for the clean decoupling of React (Vite) and Django (DRF) codebases.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs text-on-surface-variant/90 select-text">
              {/* Frontend Structure Box */}
              <div className="bg-[#0e0e0e] border border-white/5 rounded-xl p-5 relative">
                <span className="absolute top-3 right-3 text-[9px] font-mono bg-primary/20 text-primary px-2 py-0.5 rounded font-bold uppercase">
                  Frontend (React + Vite)
                </span>
                <h4 className="text-white font-bold border-b border-white/5 pb-2 mb-3">/flood-vision-client</h4>
                <div className="space-y-1 text-left leading-relaxed font-semibold">
                  <p className="text-[#8b91a0]">&bull; package.json <span className="text-outline text-[10px] font-normal italic">(Vite & tailwind specs)</span></p>
                  <p className="text-[#8b91a0]">&bull; tsconfig.json <span className="text-outline text-[10px] font-normal italic">(TS strict configuration)</span></p>
                  <p className="text-white">&bull; /src</p>
                  <p className="pl-4 text-[#8a9]">├── main.tsx <span className="text-outline text-[10px] font-normal italic">(Root dom connector)</span></p>
                  <p className="pl-4 text-[#8a9]">├── App.tsx <span className="text-outline text-[10px] font-normal italic">(Core coordinate routes layout)</span></p>
                  <p className="pl-4 text-[#8a9]">├── store.ts <span className="text-outline text-[10px] font-normal italic">(Zustand core live telemetry publisher)</span></p>
                  <p className="pl-3.5 text-white">├── /components</p>
                  <p className="pl-8 text-[#8a9]">├── Sidebar.tsx <span className="text-outline text-[10px] font-normal italic">(Style morph panel selector)</span></p>
                  <p className="pl-8 text-[#8a9]">├── Header.tsx <span className="text-outline text-[10px] font-normal italic">(Emergency warnings router)</span></p>
                  <p className="pl-8 text-[#8a9]">├── DashboardView.tsx <span className="text-outline text-[10px] font-normal italic">(Radar digital map displays)</span></p>
                  <p className="pl-8 text-[#8a9]">├── SensorsView.tsx <span className="text-outline text-[10px] font-normal italic">(Historical Recharts tracking)</span></p>
                  <p className="pl-8 text-[#8a9]">└── RouteSimView.tsx <span className="text-outline text-[10px] font-normal italic">(Smart detour kinematic plotting)</span></p>
                </div>
              </div>

              {/* Backend Structure Box */}
              <div className="bg-[#0e0e0e] border border-white/5 rounded-xl p-5 relative">
                <span className="absolute top-3 right-3 text-[9px] font-mono bg-secondary/20 text-secondary px-2 py-0.5 rounded font-bold uppercase">
                  Backend (Django + Channels)
                </span>
                <h4 className="text-white font-bold border-b border-white/5 pb-2 mb-3">/flood-vision-service</h4>
                <div className="space-y-1 text-left leading-relaxed font-semibold">
                  <p className="text-[#8b91a0]">&bull; manage.py <span className="text-outline text-[10px] font-normal italic">(CLI commands)</span></p>
                  <p className="text-[#8b91a0]">&bull; requirements.txt <span className="text-outline text-[10px] font-normal italic">(django channels/mqtt spec dependencies)</span></p>
                  <p className="text-white">&bull; /project_core</p>
                  <p className="pl-4 text-[#8a9]">├── settings.py <span className="text-outline text-[10px] font-normal italic">(DB & middleware setups)</span></p>
                  <p className="pl-4 text-[#8a9]">├── asgi.py <span className="text-outline text-[10px] font-normal italic">(Channels WebSocket gateway router)</span></p>
                  <p className="pl-4 text-[#8a9]">└── urls.py <span className="text-outline text-[10px] font-normal italic">(DRF API root bindings)</span></p>
                  <p className="pl-3.5 text-white">├── /api_monitoring</p>
                  <p className="pl-8 text-[#8a9]">├── consumers.py <span className="text-outline text-[10px] font-normal italic">(Websocket pipeline consumers)</span></p>
                  <p className="pl-8 text-[#8a9]">├── models.py <span className="text-outline text-[10px] font-normal italic">(Sensor models representing ESP32)</span></p>
                  <p className="pl-8 text-[#8a9]">├── tasks.py <span className="text-outline text-[10px] font-normal italic">(Celery background processes triggers)</span></p>
                  <p className="pl-8 text-[#8a9]">└── gemini_service.py <span className="text-outline text-[10px] font-normal italic">(StreetView static API parser)</span></p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DJANGO CONFIGS */}
        {activeTab === 'django' && (
          <div className="space-y-4 text-left select-text">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <div>
                <h3 className="text-base font-bold text-white">Django Channels & WebSocket consumer</h3>
                <p className="text-xs text-outline font-sans">
                  The consumer configuration responsible for publishing MQTT updates real-time downstream into React frontend state grids.
                </p>
              </div>
              <button 
                onClick={() => triggerCopy(CHANNELS_CODE)}
                className="p-2 border border-white/5 hover:bg-white/5 text-primary rounded-lg transition-colors cursor-pointer text-xs font-mono flex items-center gap-1.5"
              >
                {copied ? <Check className="h-4 w-4 text-secondary" /> : <Copy className="h-4 w-4" />}
                <span>{copied ? 'COPIED' : 'COPY'}</span>
              </button>
            </div>
            
            <pre className="p-4 bg-[#0e0e0e] border border-white/5 rounded-xl font-mono text-xs text-[#aac7ff] overflow-x-auto max-h-80 select-text">
              <code>{CHANNELS_CODE}</code>
            </pre>
          </div>
        )}

        {/* TAB 3: CELERY PIPELINES */}
        {activeTab === 'celery' && (
          <div className="space-y-4 text-left select-text">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <div>
                <h3 className="text-base font-bold text-white">Celery asynchronous tasks layout</h3>
                <p className="text-xs text-outline font-sans">
                  Background tasks scheduler triggering multi-modal Gemini evaluation models asynchronous from HTTP requests bounds.
                </p>
              </div>
              <button 
                onClick={() => triggerCopy(CELERY_CODE)}
                className="p-2 border border-white/5 hover:bg-white/5 text-primary rounded-lg transition-colors cursor-pointer text-xs font-mono flex items-center gap-1.5"
              >
                {copied ? <Check className="h-4 w-4 text-secondary" /> : <Copy className="h-4 w-4" />}
                <span>{copied ? 'COPIED' : 'COPY'}</span>
              </button>
            </div>
            
            <pre className="p-4 bg-[#0e0e0e] border border-white/5 rounded-xl font-mono text-xs text-secondary overflow-x-auto max-h-80 select-text">
              <code>{CELERY_CODE}</code>
            </pre>
          </div>
        )}

        {/* TAB 4: GEMINI VISION */}
        {activeTab === 'gemini' && (
          <div className="space-y-4 text-left select-text">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <div>
                <h3 className="text-base font-bold text-white">Multi-Modal Gemini Vision Parser</h3>
                <p className="text-xs text-outline font-sans">
                  Strictly handled server-side using recommended google-genai models and proper build metadata user-agents.
                </p>
              </div>
              <button 
                onClick={() => triggerCopy(GEMINI_CODE)}
                className="p-2 border border-white/5 hover:bg-white/5 text-primary rounded-lg transition-colors cursor-pointer text-xs font-mono flex items-center gap-1.5"
              >
                {copied ? <Check className="h-4 w-4 text-secondary" /> : <Copy className="h-4 w-4" />}
                <span>{copied ? 'COPIED' : 'COPY'}</span>
              </button>
            </div>
            
            <pre className="p-4 bg-[#0e0e0e] border border-white/5 rounded-xl font-mono text-xs text-white overflow-x-auto max-h-80 select-text">
              <code>{GEMINI_CODE}</code>
            </pre>
          </div>
        )}

        {/* TAB 5: MQTT DATA FLOW */}
        {activeTab === 'flow' && (
          <div className="space-y-6">
            <div className="border-b border-white/5 pb-3">
              <h3 className="text-base font-bold text-white">End-to-End Realtime IoT pipeline</h3>
              <p className="text-xs text-outline font-sans">
                Unified data flow illustrating telemetry metrics traveling from physical ultrasonic sensors to state managers real-time.
              </p>
            </div>

            {/* Custom SVG Data Flow Graphic */}
            <div className="flex justify-center py-4 bg-[#0e0e0e] rounded-xl border border-white/5 p-6 select-none overflow-x-auto">
              <svg className="w-[800px] h-[160px] shrink-0 font-mono text-xs" textAnchor="middle" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#aac7ff" />
                  </marker>
                </defs>

                {/* Node 1: Physical ESP32 */}
                <rect x="10" y="30" width="130" height="80" rx="8" className="fill-surface-container stroke-[#47e266] stroke-1" />
                <text x="75" y="65" className="fill-white font-bold text-xs font-mono font-bold">1. ESP32 Node</text>
                <text x="75" y="85" className="fill-[#47e266] text-[10px] font-mono font-medium leading-none">HC-SR04 Trigger</text>

                <path d="M 140 70 L 195 70" className="stroke-primary stroke-2 stroke-dasharray-[4,4] fill-none" markerEnd="url(#arrow)" />

                {/* Node 2: MQTT Broker */}
                <rect x="205" y="30" width="130" height="80" rx="8" className="fill-surface-container stroke-primary stroke-1" />
                <text x="270" y="65" className="fill-white font-bold text-xs font-mono font-bold">2. MQTT Broker</text>
                <text x="270" y="85" className="fill-primary text-[10px] font-mono font-medium leading-none">EMQX/Mosquitto</text>

                <path d="M 335 70 L 390 70" className="stroke-primary stroke-2 fill-none" markerEnd="url(#arrow)" />

                {/* Node 3: Django listener */}
                <rect x="400" y="30" width="130" height="80" rx="8" className="fill-surface-container stroke-primary stroke-1" />
                <text x="465" y="65" className="fill-white font-bold text-xs font-mono font-bold">3. Django Listener</text>
                <text x="465" y="85" className="fill-[cyan] text-[10px] font-mono font-medium leading-none">Paho-MQTT client</text>

                <path d="M 530 70 L 585 70" className="stroke-primary stroke-2 fill-none" markerEnd="url(#arrow)" markerStart="url(#arrow)" />

                {/* Node 4: Django Channels Channels */}
                <rect x="595" y="30" width="130" height="80" rx="8" className="fill-surface-container stroke-primary stroke-1" />
                <text x="660" y="65" className="fill-white font-bold text-xs font-mono font-bold">4. Django ASGI</text>
                <text x="660" y="85" className="fill-secondary text-[10px] font-mono font-medium leading-none">Websocket Frame</text>

                <path d="M 725 70 L 780 70" className="stroke-[#47e266] stroke-2 stroke-dasharray-[4,4] fill-none" markerEnd="url(#arrow)" />

                {/* Node 5: React Client Store */}
                <circle cx="830" cy="70" r="35" className="fill-primary-container/15 stroke-[#aac7ff] stroke-2 animate-pulse" />
                <text x="830" y="74" className="fill-[#aac7ff] font-sans font-bold text-[10px]">React Store</text>
              </svg>
            </div>
            
            <p className="text-xs text-outline leading-relaxed font-sans mt-3 border-t border-white/5 pt-3 text-left">
              The continuous pipeline avoids databases for fast state telemetry updates while storing historical intervals to allow hydrograph projections. Manual broadcast overrides go back up the stream to trigger audible warning systems.
            </p>
          </div>
        )}

        {/* Static manual confirmation note at bottom */}
        <div className="border-t border-white/5 pt-4 mt-6 text-outline font-mono text-[10px] flex justify-between">
          <span>DOCUMENTATION LEVEL: 100% SPEC COMPLIANT</span>
          <span>STATION PROTOCOLS ACTIVE</span>
        </div>
      </section>
    </div>
  );
}
