
import React, { useState } from 'react';
import { db } from '../services/mockDb';
import { OrderForm, Product, State, FormSection, SectionType, WebLead, LeadStatus } from '../types';

const SECTION_DEFAULTS: Record<SectionType, Partial<FormSection>> = {
  HEADER: { label: 'Order Your Magira Shots', content: 'Fresh organic health shots delivered to your doorstep.' },
  CONTACT: { label: 'Enter Shipping Info' },
  PRODUCTS: { label: 'Choose Your Package' },
  LOCATION: { label: 'Your Delivery State' },
  ADDRESS: { label: 'Street Address' },
  DELIVERY_INSTRUCTIONS: { label: 'Delivery Instructions', content: 'e.g. Leave at the gate, Call before arrival, etc.' },
  CUSTOM_TEXT: { label: 'Special Instructions', content: 'Delivery takes 24-48 hours.' },
  BENEFITS: { label: 'Why Choose Magira?', content: '100% Organic\nNo Preservatives\nInstant Energy\nRich in Vitamin C' },
  TESTIMONIALS: { label: 'Adebayo M.', content: '"The best ginger shot in Lagos. I feel energized all day!"' },
  FAQ: { label: 'Is it safe for kids?', content: 'Yes, our ginger shots are made from 100% natural ginger and lemon.' },
  IMAGE: { label: 'Banner Image', content: 'https://images.unsplash.com/photo-1622484211148-71629844865c?q=80&w=800' },
};

const PACKAGES = [
  { label: '1 BOTTLE of 500ml @ ₦20,000', qty: 1, price: 20000 },
  { label: '2 BOTTLES of 500ml @ ₦38,000', qty: 2, price: 38000 },
  { label: '3 BOTTLES of 500ml @ ₦55,000', qty: 3, price: 55000 },
  { label: '6 BOTTLES of 500ml @ ₦90,000', qty: 6, price: 90000 },
  { label: '8 BOTTLES of 500ml @ ₦126,000', qty: 8, price: 126000 },
  { label: '10 BOTTLES of 500ml @ ₦165,000 (Get 1 Bonus)', qty: 10, price: 165000 },
  { label: '15 BOTTLES of 500ml @ ₦249,500 (Get 2 Bonus)', qty: 15, price: 249500 },
  { label: '18 BOTTLES of 500ml @ ₦300,000 (Get 3 Bonus)', qty: 18, price: 300000 },
  { label: '30 BOTTLES of 500ml @ ₦500,000 (Get 5 Bonus)', qty: 30, price: 500000 },
];

const NIGERIA_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", 
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", "Imo", 
  "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", 
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", 
  "Sokoto", "Taraba", "Yobe", "Zamfara", "FCT Abuja"
];

const FormBuilder: React.FC = () => {
  const user = db.getCurrentUser();
  const [forms, setForms] = useState<OrderForm[]>(db.getForms());
  const [showModal, setShowModal] = useState(false);
  const [editingForm, setEditingForm] = useState<Partial<OrderForm> | null>(null);
  const [previewForm, setPreviewForm] = useState<OrderForm | null>(null);
  const [showCodeModal, setShowCodeModal] = useState<OrderForm | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile');

  const [previewData, setPreviewData] = useState<any>({
    customerName: '',
    phone: '',
    whatsapp: '',
    package: '',
    state: '',
    address: '',
    deliveryInstructions: ''
  });
  const [previewSubmitted, setPreviewSubmitted] = useState(false);
  const [isSubmittingPreview, setIsSubmittingPreview] = useState(false);

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingForm || !user) return;

    const form: OrderForm = {
      id: editingForm.id || 'form-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      title: editingForm.title || 'New Order Form',
      description: editingForm.description || '',
      productIds: editingForm.productIds || [],
      themeColor: editingForm.themeColor || '#10b981',
      createdAt: editingForm.createdAt || new Date().toISOString(),
      isActive: editingForm.isActive ?? true,
      sections: editingForm.sections || [],
      submitButtonText: editingForm.submitButtonText || 'Place Order Now',
      successMessage: editingForm.successMessage || 'Thank you! Your order request has been received.',
      thankYouUrl: editingForm.thankYouUrl || '',
      createdBy: user.name
    };

    db.saveForm(form);
    setForms([...db.getForms()]);
    setShowModal(false);
    setEditingForm(null);
  };

  const addSection = (type: SectionType) => {
    const newSection: FormSection = {
      id: 'sec-' + Math.random().toString(36).substr(2, 5),
      type,
      ...SECTION_DEFAULTS[type]
    };
    const currentSections = editingForm?.sections || [];
    setEditingForm({ ...editingForm, sections: [...currentSections, newSection] });
  };

  const removeSection = (id: string) => {
    const updated = (editingForm?.sections || []).filter(s => s.id !== id);
    setEditingForm({ ...editingForm, sections: updated });
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const sections = [...(editingForm?.sections || [])];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;
    
    [sections[index], sections[targetIndex]] = [sections[targetIndex], sections[index]];
    setEditingForm({ ...editingForm, sections });
  };

  const handlePreviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewForm || !user) return;

    setIsSubmittingPreview(true);

    let pkg = { qty: 1 };
    try { pkg = JSON.parse(previewData.package); } catch(err) {}

    const lead: WebLead = {
      id: 'L-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      formId: previewForm.id,
      customerName: previewData.customerName,
      phone: previewData.phone,
      whatsapp: previewData.whatsapp,
      address: previewData.address,
      deliveryInstructions: previewData.deliveryInstructions,
      items: [{ productId: 'GINGER-SHOT-500ML', quantity: pkg.qty }],
      status: LeadStatus.NEW,
      notes: `Captured from LIVE PREVIEW by ${user.name}`,
      createdAt: new Date().toISOString(),
      agentName: user.name
    };

    await db.createLead(lead);

    setTimeout(() => {
      setIsSubmittingPreview(false);
      setPreviewSubmitted(true);
    }, 1500);
  };

  const getEmbedCode = (form: OrderForm) => {
    // This is for the production script... simplified for brevity here, logic matches preview
    return `<!-- Magira Embed Script for ${form.createdBy} -->...`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Landing Page Creator</h1>
          <p className="text-slate-500 text-sm font-medium">Build custom sales pages to capture your own leads.</p>
        </div>
        <button 
          onClick={() => { setEditingForm({ 
            title: 'Your Sales Page',
            themeColor: '#10b981', 
            sections: [
               { id: 'sec-1', type: 'HEADER', label: 'Magira Pure Ginger', content: 'Grab your 500ml immunity booster today.' },
               { id: 'sec-2', type: 'BENEFITS', label: 'Why Magira?', content: 'Organic Ginger\nNo Sugar\nLocal Delivery' },
               { id: 'sec-3', type: 'PRODUCTS', label: 'Pick Your Package' },
               { id: 'sec-5', type: 'CONTACT', label: 'Customer Info' },
               { id: 'sec-6', type: 'ADDRESS', label: 'Delivery Address' },
            ],
            submitButtonText: 'Secure My Order',
            successMessage: 'Order received. We will call you within 15 minutes to confirm.',
            thankYouUrl: '',
          }); setShowModal(true); }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-xl font-black shadow-lg shadow-emerald-100 transition text-[11px] uppercase tracking-widest"
        >
          + Build New Page
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {forms.filter(f => user?.role === 'Admin' || f.createdBy === user?.name).map(form => (
          <div key={form.id} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col group">
            <div className="h-3" style={{ backgroundColor: form.themeColor }}></div>
            <div className="p-8 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-black text-slate-800 text-lg leading-tight uppercase truncate">{form.title}</h3>
              </div>
              
              <div className="mt-2 mb-8 flex flex-wrap gap-1.5">
                 {form.sections.slice(0, 4).map(s => (
                   <span key={s.id} className="text-[8px] font-black bg-slate-50 text-slate-400 px-2 py-0.5 rounded uppercase">{s.type}</span>
                 ))}
                 {form.sections.length > 4 && <span className="text-[8px] font-black bg-slate-50 text-slate-400 px-2 py-0.5 rounded uppercase">+{form.sections.length - 4}</span>}
              </div>

              <div className="grid grid-cols-1 gap-2 mt-auto">
                <button 
                  onClick={() => { setPreviewForm(form); setPreviewSubmitted(false); }}
                  className="bg-slate-900 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition shadow-lg shadow-slate-200"
                >
                  Live Preview
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => { setEditingForm(form); setShowModal(true); }}
                    className="bg-slate-50 hover:bg-slate-100 text-slate-600 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition"
                  >
                    Edit Layout
                  </button>
                  <button 
                    onClick={() => setShowCodeModal(form)}
                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition"
                  >
                    Get Link
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Code Viewer Modal */}
      {showCodeModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-[70]">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Embed Logic for {showCodeModal.createdBy}</h2>
              <button onClick={() => setShowCodeModal(null)} className="text-slate-400 hover:text-slate-600 bg-white w-8 h-8 rounded-full flex items-center justify-center shadow-sm">✕</button>
            </div>
            <div className="p-10 space-y-6">
              <div className="bg-emerald-50 p-6 rounded-[1.5rem] border border-emerald-100">
                 <p className="text-[11px] text-emerald-800 font-black uppercase tracking-widest mb-2">How to use</p>
                 <p className="text-xs text-emerald-900 font-medium leading-relaxed">Paste this code into an HTML block on your WordPress, Shopify, or custom site. Leads will appear in your "Web Leads" dashboard instantly.</p>
              </div>
              <pre className="bg-slate-900 text-emerald-400 p-8 rounded-[2rem] text-[10px] overflow-x-auto max-h-[300px] leading-relaxed font-mono relative group border-4 border-slate-800">
                {`<!-- Magira Embed Logic -->\n<div id="magira-container"></div>\n<script src="https://magiracrm.store/embed/${showCodeModal.id}.js"></script>`}
              </pre>
              <button 
                onClick={() => {
                   navigator.clipboard.writeText(`https://magiracrm.store/forms/${showCodeModal.id}`);
                   alert('Form link copied!');
                }}
                className="w-full bg-emerald-600 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest hover:bg-emerald-700 transition shadow-xl shadow-emerald-100"
              >
                Copy Link to Page
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editor Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2.5rem] w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[90vh]">
            <div className="w-full md:w-80 bg-slate-50 border-r border-slate-100 p-8 overflow-y-auto">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Page Components</h2>
              <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Essentials</p>
                  <div className="grid grid-cols-1 gap-2">
                    {(['HEADER', 'IMAGE', 'CONTACT', 'PRODUCTS', 'LOCATION', 'ADDRESS', 'DELIVERY_INSTRUCTIONS'] as SectionType[]).map(type => (
                      <button key={type} onClick={() => addSection(type)} className="w-full bg-white border border-slate-200 p-3 rounded-xl text-left hover:border-emerald-500 transition-all flex items-center gap-3 group">
                        <span className="bg-slate-50 text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 w-8 h-8 rounded-lg flex items-center justify-center text-xs">＋</span>
                        <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{type.replace('_', ' ')}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Conversion Booster</p>
                  <div className="grid grid-cols-1 gap-2">
                    {(['BENEFITS', 'TESTIMONIALS', 'FAQ'] as SectionType[]).map(type => (
                      <button key={type} onClick={() => addSection(type)} className="w-full bg-white border border-slate-200 p-3 rounded-xl text-left hover:border-amber-500 transition-all flex items-center gap-3 group">
                        <span className="bg-slate-50 text-slate-400 group-hover:bg-amber-50 group-hover:text-amber-600 w-8 h-8 rounded-lg flex items-center justify-center text-xs">＋</span>
                        <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{type.replace('_', ' ')}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="pt-6 border-t border-slate-200">
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Theme Tint</label>
                    <input type="color" className="w-full h-10 border-none rounded-xl cursor-pointer" value={editingForm?.themeColor} onChange={e => setEditingForm({...editingForm, themeColor: e.target.value})} />
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col bg-slate-100/30 p-8 overflow-y-auto">
               <div className="max-w-2xl mx-auto w-full space-y-6">
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Campaign Name</label>
                     <input 
                        className="w-full text-2xl font-black border-none p-0 focus:ring-0 placeholder-slate-200 uppercase"
                        placeholder="Page Name..."
                        value={editingForm?.title || ''}
                        onChange={e => setEditingForm({...editingForm, title: e.target.value})}
                     />
                  </div>
                  <div className="space-y-4">
                    {(editingForm?.sections || []).map((section, idx) => (
                      <div key={section.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm group">
                        <div className="flex items-center justify-between mb-4">
                           <div className="flex items-center gap-2">
                              <span className="text-[9px] font-black bg-slate-900 text-white px-2 py-0.5 rounded uppercase">{section.type}</span>
                              <input 
                                className="text-xs font-black border-none p-0 focus:ring-0 bg-transparent w-48 uppercase tracking-widest"
                                value={section.label || ''}
                                onChange={e => {
                                  const updated = [...(editingForm?.sections || [])];
                                  updated[idx].label = e.target.value;
                                  setEditingForm({...editingForm, sections: updated});
                                }}
                              />
                           </div>
                           <div className="flex gap-1">
                              <button onClick={() => moveSection(idx, 'up')} className="p-1.5 hover:bg-slate-100 rounded text-slate-400">↑</button>
                              <button onClick={() => moveSection(idx, 'down')} className="p-1.5 hover:bg-slate-100 rounded text-slate-400">↓</button>
                              <button onClick={() => removeSection(section.id)} className="p-1.5 hover:bg-red-50 rounded text-red-400 ml-2">✕</button>
                           </div>
                        </div>
                        {['HEADER', 'BENEFITS', 'TESTIMONIALS', 'IMAGE', 'FAQ', 'CUSTOM_TEXT'].includes(section.type) && (
                          <textarea className="w-full text-sm bg-slate-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-emerald-500 font-medium" rows={3} value={section.content || ''} onChange={e => {
                            const updated = [...(editingForm?.sections || [])];
                            updated[idx].content = e.target.value;
                            setEditingForm({...editingForm, sections: updated});
                          }}/>
                        )}
                        {['PRODUCTS', 'CONTACT', 'LOCATION', 'ADDRESS'].includes(section.type) && (
                          <div className="py-8 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center">
                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Auto-Generated Input Component</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center pt-12 pb-20">
                    <button onClick={() => { setPreviewForm(editingForm as OrderForm); setPreviewSubmitted(false); }} className="bg-slate-900 text-white px-8 py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-[11px] shadow-xl shadow-slate-200">Interactive Preview</button>
                    <div className="flex gap-3">
                        <button onClick={() => setShowModal(false)} className="text-slate-400 font-black text-[11px] uppercase tracking-widest px-4">Discard</button>
                        <button onClick={() => handleSave()} className="bg-emerald-600 text-white px-10 py-5 rounded-[1.5rem] font-black shadow-xl shadow-emerald-100 uppercase tracking-widest text-[11px]">Publish Changes</button>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* NEW HIGH-FIDELITY PREVIEW OVERLAY */}
      {previewForm && (
        <div className="fixed inset-0 bg-slate-900/98 backdrop-blur-2xl flex flex-col z-[100] animate-in fade-in duration-300">
           <div className="h-20 bg-black/50 border-b border-white/5 flex items-center justify-between px-10 shrink-0">
              <button onClick={() => setPreviewForm(null)} className="text-white/60 hover:text-white transition font-black text-[10px] uppercase tracking-[0.3em] flex items-center gap-2">
                <span className="text-lg">←</span> Return to Page Builder
              </button>
              
              <div className="flex items-center bg-white/5 p-1 rounded-2xl">
                 <button onClick={() => setPreviewDevice('desktop')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${previewDevice === 'desktop' ? 'bg-white text-slate-900 shadow-xl' : 'text-white/40'}`}>Desktop</button>
                 <button onClick={() => setPreviewDevice('mobile')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${previewDevice === 'mobile' ? 'bg-white text-slate-900 shadow-xl' : 'text-white/40'}`}>Mobile</button>
              </div>

              <div className="flex flex-col items-end">
                <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Testing Attribution</span>
                <span className="text-[10px] font-black text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full uppercase tracking-widest">Agent: {previewForm.createdBy}</span>
              </div>
           </div>

           <div className="flex-1 overflow-hidden p-8 flex items-center justify-center">
              <div className={`transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] bg-white shadow-[0_100px_150px_-30px_rgba(0,0,0,0.5)] flex flex-col ${previewDevice === 'mobile' ? 'w-[375px] h-[760px] rounded-[3.5rem] border-[14px] border-slate-800' : 'w-full max-w-4xl h-full rounded-[2.5rem]'}`}>
                <div className="flex-1 overflow-y-auto no-scrollbar relative bg-white">
                   {previewSubmitted ? (
                      <div className="h-full flex flex-col items-center justify-center p-12 text-center animate-in zoom-in duration-500">
                        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-5xl mb-8 shadow-2xl shadow-emerald-100 animate-bounce">✅</div>
                        <h2 className="text-3xl font-black text-slate-800 mb-4 tracking-tight leading-tight">{previewForm.successMessage}</h2>
                        <p className="text-slate-400 font-medium">Your submission has been captured in the Web Leads console under {previewForm.createdBy}.</p>
                        <button 
                          onClick={() => { setPreviewSubmitted(false); setPreviewData({}); }}
                          className="mt-12 text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] hover:underline"
                        >
                          Restart Live Testing
                        </button>
                      </div>
                   ) : (
                    <form onSubmit={handlePreviewSubmit} className="flex flex-col gap-0">
                      {previewForm.sections.map(sec => {
                         switch(sec.type) {
                            case 'HEADER':
                              return (
                                <div key={sec.id} style={{ backgroundColor: previewForm.themeColor }} className="p-12 text-white text-center">
                                  <h2 className="text-3xl font-black mb-4 tracking-tight leading-tight">{sec.label}</h2>
                                  <p className="opacity-80 text-sm leading-relaxed font-medium">{sec.content}</p>
                                </div>
                              );
                            case 'IMAGE':
                              return <div key={sec.id} className="w-full"><img src={sec.content} className="w-full h-auto block" alt="Form Banner" /></div>;
                            case 'BENEFITS':
                              return (
                                <div key={sec.id} className="px-10 py-12 bg-slate-50">
                                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">{sec.label}</h4>
                                  <ul className="space-y-4">
                                    {sec.content?.split('\n').map((b, i) => (
                                      <li key={i} className="flex items-start gap-4 text-sm text-slate-600 font-bold leading-relaxed">
                                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white flex items-center justify-center text-[10px]" style={{ color: previewForm.themeColor }}>✓</span>
                                        {b}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              );
                            case 'PRODUCTS':
                              return (
                                <div key={sec.id} className="px-10 py-8 border-b border-slate-50">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">{sec.label}</label>
                                  <select 
                                    required
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-5 text-sm font-black text-slate-800 appearance-none outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-sm"
                                    value={previewData.package}
                                    onChange={e => setPreviewData({...previewData, package: e.target.value})}
                                  >
                                    <option value="">Select Package...</option>
                                    {PACKAGES.map((pkg, i) => (
                                      <option key={i} value={JSON.stringify({ qty: pkg.qty, price: pkg.price })}>{pkg.label}</option>
                                    ))}
                                  </select>
                                </div>
                              );
                            case 'LOCATION':
                              return (
                                <div key={sec.id} className="px-10 py-8 border-b border-slate-50">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">{sec.label}</label>
                                  <select 
                                    required
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-5 text-sm font-bold text-slate-800 appearance-none outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-sm"
                                    value={previewData.state}
                                    onChange={e => setPreviewData({...previewData, state: e.target.value})}
                                  >
                                    <option value="">Delivery Hub...</option>
                                    {NIGERIA_STATES.map((s, i) => <option key={i} value={s}>{s}</option>)}
                                  </select>
                                </div>
                              );
                            case 'CONTACT':
                              return (
                                <div key={sec.id} className="px-10 py-8 space-y-4 border-b border-slate-50">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">{sec.label}</label>
                                  <input 
                                    required placeholder="Full Name" 
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-5 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-sm"
                                    value={previewData.customerName}
                                    onChange={e => setPreviewData({...previewData, customerName: e.target.value})}
                                  />
                                  <div className="grid grid-cols-2 gap-4">
                                    <input 
                                      required placeholder="Phone" 
                                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-5 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-sm"
                                      value={previewData.phone}
                                      onChange={e => setPreviewData({...previewData, phone: e.target.value})}
                                    />
                                    <input 
                                      placeholder="WhatsApp" 
                                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-5 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-sm"
                                      value={previewData.whatsapp}
                                      onChange={e => setPreviewData({...previewData, whatsapp: e.target.value})}
                                    />
                                  </div>
                                </div>
                              );
                            case 'ADDRESS':
                              return (
                                <div key={sec.id} className="px-10 py-8 border-b border-slate-50">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">{sec.label}</label>
                                  <textarea 
                                    required placeholder="Delivery Address..." 
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-5 text-sm font-bold resize-none outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-sm" 
                                    rows={3} 
                                    value={previewData.address}
                                    onChange={e => setPreviewData({...previewData, address: e.target.value})}
                                  />
                                </div>
                              );
                            case 'TESTIMONIALS':
                              return (
                                <div key={sec.id} className="px-10 py-12">
                                  <div className="p-10 rounded-[2.5rem] bg-slate-50 border-2 border-white shadow-xl shadow-slate-200/50">
                                    <p className="italic text-slate-600 font-medium leading-relaxed text-lg mb-6">"{sec.content}"</p>
                                    <div className="flex items-center gap-4">
                                      <div className="w-10 h-10 rounded-full bg-slate-200"></div>
                                      <p className="font-black text-xs text-slate-800 uppercase tracking-[0.2em]">— {sec.label}</p>
                                    </div>
                                  </div>
                                </div>
                              );
                            default: return null;
                         }
                      })}
                      
                      <div className="px-10 py-12">
                         <button 
                          type="submit"
                          disabled={isSubmittingPreview}
                          style={{ backgroundColor: previewForm.themeColor }} 
                          className={`w-full text-white py-6 rounded-[2rem] font-black shadow-2xl uppercase tracking-[0.3em] text-sm transition-all active:scale-95 flex items-center justify-center gap-3 ${isSubmittingPreview ? 'opacity-70 cursor-wait' : 'hover:scale-[1.03]'}`}
                         >
                           {isSubmittingPreview && <span className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin"></span>}
                           {isSubmittingPreview ? 'TRANSMITTING...' : previewForm.submitButtonText}
                         </button>
                         <p className="text-[10px] text-center text-slate-300 mt-10 uppercase font-black tracking-[0.3em]">SECURE FULFILLMENT BY MAGIRA NETWORK</p>
                      </div>
                    </form>
                   )}
                </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default FormBuilder;
