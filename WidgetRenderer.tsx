
import React, { useEffect, useState } from 'react';
import { db } from './services/mockDb';
import { Widget, WidgetType } from './types';
import TestimonialWidget from './components/TestimonialWidget';

const WidgetRenderer: React.FC = () => {
  const id = window.location.pathname.split('/').pop();
  const [widget, setWidget] = useState<Widget | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, we'd fetch this from the server
    // For now, we'll try to find it in the local DB
    const found = db.getWidgets().find(w => w.id === id);
    setWidget(found || null);
    setLoading(false);

    // Handle resizing for the parent iframe
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        window.parent.postMessage({
          type: 'magira-resize',
          widgetId: id,
          height: entry.contentRect.height
        }, '*');
      }
    });

    observer.observe(document.body);
    return () => observer.disconnect();
  }, [id]);

  if (loading) return null;
  if (!widget) return <div className="p-4 text-slate-400 text-xs font-mono">Widget not found</div>;

  return (
    <div className={`min-h-screen ${widget.config.theme === 'dark' ? 'bg-slate-900' : 'bg-transparent'}`}>
      {widget.type === WidgetType.TESTIMONIAL && (
        <div className="p-2">
          <TestimonialWidget />
        </div>
      )}
      
      {widget.type === WidgetType.CONTACT_FORM && (
        <div className="p-4 bg-white rounded-3xl shadow-lg border border-slate-100 max-w-md mx-auto">
          <h2 className="text-xl font-black text-slate-800 mb-2">Get in Touch</h2>
          <p className="text-slate-500 text-sm mb-6">Leave your details and we'll get back to you.</p>
          <div className="space-y-4">
            <input type="text" placeholder="Full Name" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm" />
            <input type="tel" placeholder="Phone Number" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm" />
            <textarea placeholder="Message" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm h-24"></textarea>
            <button className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase tracking-widest text-[10px]">Send Message</button>
          </div>
        </div>
      )}

      {widget.type === WidgetType.RECENT_SALES && (
        <div className="p-4 flex items-center gap-4 bg-white rounded-2xl shadow-xl border border-slate-100 max-w-xs animate-bounce">
          <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
            <Zap size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900">New Sale!</p>
            <p className="text-[10px] text-slate-500">Someone in Lagos just bought Ginger Shot x3</p>
          </div>
        </div>
      )}

      {widget.type === WidgetType.PRODUCT_SHOWCASE && (
        <div className="p-4 bg-white rounded-3xl shadow-lg border border-slate-100 max-w-xs mx-auto overflow-hidden">
          <img src="https://picsum.photos/seed/ginger/400/300" alt="Product" className="w-full h-40 object-cover rounded-2xl mb-4" />
          <h3 className="font-black text-slate-800">Ginger Shot Recovery</h3>
          <p className="text-xs text-slate-500 mb-4">Pure organic ginger extract for your daily wellness.</p>
          <div className="flex items-center justify-between">
            <span className="font-black text-emerald-600">₦12,000</span>
            <button className="bg-slate-900 text-white px-4 py-2 rounded-lg font-black uppercase text-[9px]">Buy Now</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WidgetRenderer;

// Helper for icons in the renderer
const Zap = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
  </svg>
);
