
import React, { useState, useEffect } from 'react';
import { db } from '../services/mockDb';
import { Widget, WidgetType, UserRole } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Plus, Trash2, Copy, Code, Settings, 
  MessageSquare, UserPlus, ShoppingBag, Zap,
  Check, ExternalLink, Info, Sparkles, Loader2
} from 'lucide-react';

const Widgets: React.FC = () => {
  const [widgets, setWidgets] = useState<Widget[]>(db.getWidgets());
  const [isCreating, setIsCreating] = useState(false);
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null);
  const [showCode, setShowCode] = useState<Widget | null>(null);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const [newWidget, setNewWidget] = useState<Partial<Widget>>({
    name: '',
    type: WidgetType.TESTIMONIAL,
    prompt: '',
    config: {
      theme: 'light',
      autoPlay: true,
      interval: 5000,
      showRating: true
    }
  });

  useEffect(() => {
    const unsub = db.subscribe(() => {
      setWidgets(db.getWidgets());
    });
    return unsub;
  }, []);

  const handleSave = async () => {
    if (!newWidget.name || !newWidget.type) return;

    const widget: Widget = {
      id: editingWidget?.id || 'WID-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
      name: newWidget.name,
      type: newWidget.type as WidgetType,
      config: newWidget.config,
      prompt: newWidget.prompt,
      generatedContent: newWidget.generatedContent,
      createdAt: editingWidget?.createdAt || new Date().toISOString(),
      createdBy: editingWidget?.createdBy || db.getCurrentUser()?.name || 'System'
    };

    await db.saveWidget(widget);
    setIsCreating(false);
    setEditingWidget(null);
    setNewWidget({
      name: '',
      type: WidgetType.TESTIMONIAL,
      prompt: '',
      config: { theme: 'light', autoPlay: true, interval: 5000, showRating: true }
    });
  };

  const generateWithAI = async () => {
    if (!newWidget.prompt) return;
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const model = "gemini-3-flash-preview";
      
      let schema: any = {};
      if (newWidget.type === WidgetType.TESTIMONIAL) {
        schema = {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.NUMBER },
              name: { type: Type.STRING },
              role: { type: Type.STRING },
              content: { type: Type.STRING },
              rating: { type: Type.NUMBER },
              avatar: { type: Type.STRING }
            },
            required: ["id", "name", "role", "content", "rating", "avatar"]
          }
        };
      } else if (newWidget.type === WidgetType.PRODUCT_SHOWCASE) {
        schema = {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            price: { type: Type.STRING },
            image: { type: Type.STRING }
          },
          required: ["title", "description", "price", "image"]
        };
      }

      const response = await ai.models.generateContent({
        model,
        contents: `Generate content for a ${newWidget.type} widget. Instruction: ${newWidget.prompt}. Use high quality placeholder images from picsum.photos.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema
        }
      });

      const content = JSON.parse(response.text || '{}');
      setNewWidget(prev => ({ ...prev, generatedContent: content }));
    } catch (error) {
      console.error("AI Generation Error:", error);
      alert("Failed to generate content. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this widget? This will break any website using its code.")) {
      await db.deleteWidget(id);
    }
  };

  const getWidgetCode = (widget: Widget) => {
    const baseUrl = window.location.origin;
    const embedUrl = `${baseUrl}/embed/widget/${widget.id}`;
    
    return `<!-- Magira CRM Widget: ${widget.name} -->
<!-- Paste this HTML code into your Elementor HTML Widget -->
<div id="magira-widget-${widget.id}" style="width: 100%; min-height: 200px; overflow: hidden;">
  <iframe 
    src="${embedUrl}" 
    id="magira-iframe-${widget.id}"
    style="width: 100%; border: none; overflow: hidden; display: block;" 
    scrolling="no"
    onload="this.style.height=this.contentWindow.document.body.scrollHeight+'px';"
  ></iframe>
</div>

<script>
  (function() {
    var iframe = document.getElementById('magira-iframe-${widget.id}');
    
    // Listen for resize messages from the widget
    window.addEventListener('message', function(e) {
      if (e.data.type === 'magira-resize' && e.data.widgetId === '${widget.id}') {
        iframe.style.height = e.data.height + 'px';
      }
    });

    // Periodic check for height if needed
    setInterval(function() {
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'magira-ping' }, '*');
      }
    }, 2000);
  })();
</script>`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Website Widgets</h1>
          <p className="text-slate-500 font-medium">Create and manage embeddable tools for your sales website.</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 hover:bg-black transition shadow-lg shadow-slate-200"
        >
          <Plus size={16} />
          Create New Widget
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {widgets.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white rounded-[2rem] border border-dashed border-slate-200">
            <div className="text-5xl mb-4">🧩</div>
            <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">No widgets created yet.</p>
            <button 
              onClick={() => setIsCreating(true)}
              className="mt-4 text-blue-600 font-black text-xs uppercase hover:underline"
            >
              Build your first widget
            </button>
          </div>
        ) : (
          widgets.map(widget => (
            <motion.div 
              key={widget.id}
              layout
              className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 hover:shadow-md transition-all group"
            >
              <div className="flex justify-between items-start mb-6">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  widget.type === WidgetType.TESTIMONIAL ? 'bg-amber-50 text-amber-600' :
                  widget.type === WidgetType.CONTACT_FORM ? 'bg-blue-50 text-blue-600' :
                  widget.type === WidgetType.RECENT_SALES ? 'bg-emerald-50 text-emerald-600' :
                  'bg-purple-50 text-purple-600'
                }`}>
                  {widget.type === WidgetType.TESTIMONIAL && <MessageSquare size={24} />}
                  {widget.type === WidgetType.CONTACT_FORM && <UserPlus size={24} />}
                  {widget.type === WidgetType.RECENT_SALES && <Zap size={24} />}
                  {widget.type === WidgetType.PRODUCT_SHOWCASE && <ShoppingBag size={24} />}
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => { setEditingWidget(widget); setNewWidget(widget); setIsCreating(true); }}
                    className="p-2 text-slate-400 hover:text-slate-900 transition"
                  >
                    <Settings size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(widget.id)}
                    className="p-2 text-slate-400 hover:text-red-600 transition"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <h3 className="text-lg font-black text-slate-800 mb-1">{widget.name}</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">{widget.type}</p>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowCode(widget)}
                  className="flex-1 bg-slate-50 text-slate-600 py-3 rounded-xl font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 hover:bg-slate-900 hover:text-white transition"
                >
                  <Code size={14} />
                  Get Code
                </button>
                <button 
                  onClick={() => window.open(`/embed/widget/${widget.id}`, '_blank')}
                  className="w-12 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-blue-50 hover:text-blue-600 transition"
                >
                  <ExternalLink size={16} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-12">
                <h2 className="text-2xl font-black text-slate-800 mb-2">
                  {editingWidget ? 'Configure Widget' : 'Create New Widget'}
                </h2>
                <p className="text-slate-500 text-sm mb-10 font-medium">Customize how your widget looks and behaves.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Widget Name</label>
                      <input 
                        type="text"
                        placeholder="e.g. Homepage Testimonials"
                        className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-slate-900 font-bold"
                        value={newWidget.name}
                        onChange={e => setNewWidget({...newWidget, name: e.target.value})}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Widget Type</label>
                      <div className="grid grid-cols-2 gap-3">
                        {Object.values(WidgetType).map(type => (
                          <button
                            key={type}
                            onClick={() => setNewWidget({...newWidget, type})}
                            className={`p-4 rounded-2xl border-2 transition-all text-left ${
                              newWidget.type === type 
                                ? 'border-slate-900 bg-slate-900 text-white' 
                                : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'
                            }`}
                          >
                            <p className="text-[10px] font-black uppercase tracking-widest">{type}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">AI Content Instructions</label>
                      <textarea 
                        placeholder="e.g. Create 3 testimonials for a weight loss product. Sound enthusiastic and mention fast results."
                        className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-slate-900 font-bold h-32 text-sm"
                        value={newWidget.prompt}
                        onChange={e => setNewWidget({...newWidget, prompt: e.target.value})}
                      />
                      <button 
                        onClick={generateWithAI}
                        disabled={isGenerating || !newWidget.prompt}
                        className="mt-3 w-full bg-emerald-600 text-white py-3 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-emerald-700 transition disabled:bg-slate-200"
                      >
                        {isGenerating ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
                        {isGenerating ? 'Generating...' : 'Generate Content with AI'}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Configuration & Preview</label>
                    <div className="bg-slate-50 rounded-[2rem] p-6 space-y-4">
                      {newWidget.generatedContent ? (
                        <div className="p-4 bg-white rounded-2xl border border-slate-100">
                          <p className="text-[10px] font-black text-emerald-600 uppercase mb-2">AI Content Ready</p>
                          <p className="text-xs text-slate-500 line-clamp-3">
                            {JSON.stringify(newWidget.generatedContent)}
                          </p>
                        </div>
                      ) : (
                        <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                          <p className="text-[10px] font-black text-slate-300 uppercase">No AI Content Yet</p>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-600">Dark Mode</span>
                        <button 
                          onClick={() => setNewWidget({
                            ...newWidget, 
                            config: { ...newWidget.config, theme: newWidget.config.theme === 'dark' ? 'light' : 'dark' }
                          })}
                          className={`w-12 h-6 rounded-full transition-colors relative ${newWidget.config.theme === 'dark' ? 'bg-slate-900' : 'bg-slate-200'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${newWidget.config.theme === 'dark' ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-600">Auto Play</span>
                        <button 
                          onClick={() => setNewWidget({
                            ...newWidget, 
                            config: { ...newWidget.config, autoPlay: !newWidget.config.autoPlay }
                          })}
                          className={`w-12 h-6 rounded-full transition-colors relative ${newWidget.config.autoPlay ? 'bg-emerald-500' : 'bg-slate-200'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${newWidget.config.autoPlay ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>

                      {newWidget.type === WidgetType.TESTIMONIAL && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-600">Show Ratings</span>
                          <button 
                            onClick={() => setNewWidget({
                              ...newWidget, 
                              config: { ...newWidget.config, showRating: !newWidget.config.showRating }
                            })}
                            className={`w-12 h-6 rounded-full transition-colors relative ${newWidget.config.showRating ? 'bg-emerald-500' : 'bg-slate-200'}`}
                          >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${newWidget.config.showRating ? 'left-7' : 'left-1'}`} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-12 flex gap-4">
                  <button 
                    onClick={handleSave}
                    className="flex-1 bg-slate-900 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest hover:bg-black transition shadow-xl shadow-slate-200"
                  >
                    {editingWidget ? 'Update Widget' : 'Create Widget'}
                  </button>
                  <button 
                    onClick={() => { setIsCreating(false); setEditingWidget(null); }}
                    className="px-8 bg-slate-100 text-slate-400 py-5 rounded-[1.5rem] font-black uppercase tracking-widest hover:bg-slate-200 hover:text-slate-600 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Code Modal */}
      <AnimatePresence>
        {showCode && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-12">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 mb-2">Embed Code</h2>
                    <p className="text-slate-500 text-sm font-medium">Copy and paste this code into your website's HTML.</p>
                  </div>
                  <button 
                    onClick={() => setShowCode(null)}
                    className="p-2 text-slate-400 hover:text-slate-900 transition"
                  >
                    <Plus size={24} className="rotate-45" />
                  </button>
                </div>

                <div className="relative">
                  <pre className="bg-slate-900 text-slate-300 p-8 rounded-[2rem] text-xs overflow-x-auto font-mono leading-relaxed">
                    {getWidgetCode(showCode)}
                  </pre>
                  <button 
                    onClick={() => copyToClipboard(getWidgetCode(showCode!))}
                    className={`absolute top-4 right-4 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                      copied ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copied!' : 'Copy Code'}
                  </button>
                </div>

                <div className="mt-8 p-6 bg-blue-50 rounded-2xl border border-blue-100 flex gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                    <Info size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-blue-900 mb-1">Integration Tip</p>
                    <p className="text-[11px] text-blue-700 leading-relaxed">
                      Place the `&lt;div&gt;` where you want the widget to appear. The script can be placed anywhere, but ideally just before the closing `&lt;/body&gt;` tag.
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => setShowCode(null)}
                  className="w-full mt-8 bg-slate-900 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest hover:bg-black transition"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Widgets;
