
import React, { useState } from 'react';
import { db } from '../services/mockDb';
import { OrderForm, Product, State, FormSection, SectionType } from '../types';

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
  { label: '10 BOTTLES of 500ml @ ₦165,000 (Get 1 Free)', qty: 10, price: 165000 },
  { label: '15 BOTTLES of 500ml @ ₦249,500 (Get 2 Free)', qty: 15, price: 249500 },
  { label: '18 BOTTLES of 500ml @ ₦300,000 (Get 3 Free)', qty: 18, price: 300000 },
  { label: '30 BOTTLES of 500ml @ ₦500,000 (Get 5 Free)', qty: 30, price: 500000 },
];

const NIGERIA_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", 
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", "Imo", 
  "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", 
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", 
  "Sokoto", "Taraba", "Yobe", "Zamfara", "Federal Capital Territory (FCT)"
];

const FormBuilder: React.FC = () => {
  const [forms, setForms] = useState<OrderForm[]>(db.getForms());
  const [products] = useState<Product[]>(db.getProducts());
  const [states] = useState<State[]>(db.getStates());
  const [showModal, setShowModal] = useState(false);
  const [editingForm, setEditingForm] = useState<Partial<OrderForm> | null>(null);
  const [previewForm, setPreviewForm] = useState<OrderForm | null>(null);
  const [showCodeModal, setShowCodeModal] = useState<OrderForm | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile');

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingForm) return;

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

  const getEmbedCode = (form: OrderForm) => {
    const packageOptions = PACKAGES.map(pkg => 
      `<option value='{"qty":${pkg.qty}, "price":${pkg.price}}'>${pkg.label}</option>`
    ).join('\n            ');

    const stateOptions = NIGERIA_STATES.map(s => `<option value="${s}">${s}</option>`).join('\n            ');

    const sectionsHtml = form.sections.map(sec => {
      switch (sec.type) {
        case 'HEADER':
          return `<div style="background-color: ${form.themeColor}; padding: 32px 24px; color: white; text-align: center;"><h2 style="margin: 0; font-size: 24px; font-weight: 900;">${sec.label || form.title}</h2><p style="margin: 12px 0 0 0; font-size: 15px; opacity: 0.9; line-height: 1.5;">${sec.content || form.description}</p></div>`;
        case 'IMAGE':
          return `<div style="width: 100%;"><img src="${sec.content}" style="width: 100%; display: block; height: auto;" alt="Magira Image"></div>`;
        case 'CONTACT':
          return `<div style="padding: 0 24px;"><label style="display: block; font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 8px;">${sec.label}</label><input type="text" name="customerName" placeholder="Full Name" required style="width: 100%; padding: 14px; border: 1.5px solid #f1f5f9; border-radius: 12px; box-sizing: border-box; margin-bottom: 12px; font-size: 14px;"><input type="tel" name="phone" placeholder="Phone Number (Call)" required style="width: 100%; padding: 14px; border: 1.5px solid #f1f5f9; border-radius: 12px; box-sizing: border-box; margin-bottom: 12px; font-size: 14px;"><input type="tel" name="whatsapp" placeholder="WhatsApp Number" style="width: 100%; padding: 14px; border: 1.5px solid #f1f5f9; border-radius: 12px; box-sizing: border-box; font-size: 14px;"></div>`;
        case 'PRODUCTS':
          return `<div style="padding: 0 24px;"><label style="display: block; font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 8px;">${sec.label}</label><select name="packageData" required style="width: 100%; padding: 14px; border: 1.5px solid #f1f5f9; border-radius: 12px; box-sizing: border-box; background: white; font-size: 14px; font-weight: 600;"><option value="">-- Choose Ginger Shot Package --</option>${packageOptions}</select></div>`;
        case 'LOCATION':
          return `<div style="padding: 0 24px;"><label style="display: block; font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 8px;">${sec.label}</label><select name="stateName" required style="width: 100%; padding: 14px; border: 1.5px solid #f1f5f9; border-radius: 12px; box-sizing: border-box; background: white; font-size: 14px;"><option value="">-- Select State --</option>${stateOptions}</select></div>`;
        case 'ADDRESS':
          return `<div style="padding: 0 24px;"><label style="display: block; font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 8px;">${sec.label}</label><textarea name="address" required rows="2" placeholder="Full Delivery Address" style="width: 100%; padding: 14px; border: 1.5px solid #f1f5f9; border-radius: 12px; box-sizing: border-box; font-family: sans-serif; font-size: 14px;"></textarea></div>`;
        case 'DELIVERY_INSTRUCTIONS':
          return `<div style="padding: 0 24px;"><label style="display: block; font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 8px;">${sec.label}</label><textarea name="deliveryInstructions" rows="2" placeholder="${sec.content || 'Add specific instructions for the delivery agent...'}" style="width: 100%; padding: 14px; border: 1.5px solid #f1f5f9; border-radius: 12px; box-sizing: border-box; font-family: sans-serif; font-size: 14px;"></textarea></div>`;
        case 'BENEFITS':
          const benefits = (sec.content || '').split('\n').map(b => `<li style="margin-bottom: 10px; display: flex; align-items: flex-start; gap: 10px; font-size: 14px; color: #475569;"><span style="color: ${form.themeColor}; font-weight: bold;">✓</span> <span>${b.trim()}</span></li>`).join('');
          return `<div style="padding: 24px; background: #f8fafc; border-radius: 16px; margin: 0 24px;"><h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 800; color: #1e293b;">${sec.label}</h3><ul style="list-style: none; padding: 0; margin: 0;">${benefits}</ul></div>`;
        case 'TESTIMONIALS':
          return `<div style="padding: 24px; border-radius: 16px; border: 2px solid #f1f5f9; margin: 0 24px; background: white;"><p style="margin: 0; font-style: italic; color: #475569; line-height: 1.6; font-size: 15px;">${sec.content}</p><p style="margin: 12px 0 0 0; font-weight: 800; font-size: 13px; color: #1e293b;">— ${sec.label}</p></div>`;
        case 'FAQ':
          return `<div style="padding: 0 24px;"><h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 800; color: #1e293b;">Q: ${sec.label}</h3><p style="margin: 0; font-size: 14px; color: #64748b; line-height: 1.6;">A: ${sec.content}</p></div>`;
        case 'CUSTOM_TEXT':
          return `<div style="padding: 0 24px;"><h4 style="margin: 0; font-size: 14px; font-weight: 800; color: #334155;">${sec.label}</h4><p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b; line-height: 1.6;">${sec.content}</p></div>`;
        default: return '';
      }
    }).join('\n');

    return `<!-- Magira Landing Page: ${form.title} -->
<div id="magira-container-${form.id}" style="font-family: 'Inter', sans-serif; max-width: 480px; margin: 20px auto; border: 1px solid #f1f5f9; border-radius: 24px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.08); background: white;">
  <form id="magira-form-${form.id}" style="display: flex; flex-direction: column; gap: 24px; padding-bottom: 32px;">
    ${sectionsHtml}
    
    <div style="padding: 8px 24px 0 24px;">
      <button type="submit" style="width: 100%; background-color: ${form.themeColor}; color: white; border: none; padding: 18px; border-radius: 16px; font-weight: 900; font-size: 16px; cursor: pointer; transition: all 0.2s; box-shadow: 0 10px 15px -3px ${form.themeColor}33;">
        ${form.submitButtonText}
      </button>
      <p style="text-align: center; margin: 16px 0 0 0; font-size: 10px; color: #cbd5e1; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Powered by Magira Distribution CRM</p>
    </div>
  </form>
</div>

<script>
document.getElementById('magira-form-${form.id}').addEventListener('submit', function(e) {
  e.preventDefault();
  const formData = new FormData(this);
  const rawData = Object.fromEntries(formData.entries());
  
  let pkg = { qty: 1, price: 0 };
  try { pkg = JSON.parse(rawData.packageData); } catch(err) {}

  const payload = {
    customerName: rawData.customerName,
    phone: rawData.phone,
    whatsapp: rawData.whatsapp,
    address: rawData.address,
    deliveryInstructions: rawData.deliveryInstructions,
    stateName: rawData.stateName,
    productId: 'GINGER-SHOT-500ML', 
    quantity: pkg.qty,
    totalPrice: pkg.price,
    formId: '${form.id}'
  };

  const btn = this.querySelector('button');
  btn.disabled = true;
  btn.innerText = 'Transmitting...';
  
  console.log('Lead Captured:', payload);
  
  setTimeout(() => {
    const thankYouUrl = "${form.thankYouUrl || ''}";
    if (thankYouUrl) {
      window.location.href = thankYouUrl;
    } else {
      document.getElementById('magira-container-${form.id}').innerHTML = \`
        <div style="padding: 80px 40px; text-align: center; color: #1e293b;">
          <div style="font-size: 72px; margin-bottom: 24px;">✅</div>
          <h3 style="margin: 0 0 12px 0; font-size: 24px; font-weight: 900;">Order Captured!</h3>
          <p style="color: #64748b; font-size: 15px; line-height: 1.7;">${form.successMessage}</p>
        </div>
      \`;
    }
  }, 1200);
});
</script>`;
  };

  const handlePreviewUnsaved = () => {
    if (!editingForm) return;
    setPreviewForm({ ...editingForm } as OrderForm);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Magira Page Builder</h1>
          <p className="text-slate-500 text-sm">Design high-converting landing pages for your distribution network.</p>
        </div>
        <button 
          onClick={() => { setEditingForm({ 
            title: 'Flash Sale: Ginger Shots',
            themeColor: '#10b981', 
            sections: [
               { id: 'sec-1', type: 'HEADER', label: 'Magira Pure Ginger', content: 'Grab your 500ml immunity booster today.' },
               { id: 'sec-2', type: 'BENEFITS', label: 'Why Magira?', content: 'Organic Ginger\nNo Sugar\nLocal Delivery' },
               { id: 'sec-3', type: 'PRODUCTS', label: 'Pick Your Package' },
               { id: 'sec-4', type: 'LOCATION', label: 'Shipping State' },
               { id: 'sec-5', type: 'CONTACT', label: 'Customer Info' },
               { id: 'sec-6', type: 'ADDRESS', label: 'Delivery Address' },
               { id: 'sec-7', type: 'DELIVERY_INSTRUCTIONS', label: 'Instructions' }
            ],
            submitButtonText: 'Secure My Order',
            successMessage: 'Order received. We will call you within 15 minutes to confirm.',
            thankYouUrl: '',
          }); setShowModal(true); }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-xl font-bold shadow-lg shadow-emerald-100 transition"
        >
          + Build New Page
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {forms.map(form => (
          <div key={form.id} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl transition-all duration-300">
            <div className="h-3" style={{ backgroundColor: form.themeColor }}></div>
            <div className="p-8">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-black text-slate-800 text-lg leading-tight">{form.title}</h3>
                <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-widest ${form.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                  {form.isActive ? 'Active' : 'Draft'}
                </span>
              </div>
              
              <div className="flex flex-wrap gap-1.5 mt-6 mb-8">
                {(form.sections || []).map(s => (
                   <span key={s.id} className="text-[9px] font-black bg-slate-50 text-slate-400 border border-slate-100 px-2 py-1 rounded-md uppercase">{s.type}</span>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-2">
                <button 
                  onClick={() => setPreviewForm(form)}
                  className="bg-slate-900 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition"
                >
                  Live Preview
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => { setEditingForm(form); setShowModal(true); }}
                    className="bg-slate-50 hover:bg-slate-100 text-slate-600 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => setShowCodeModal(form)}
                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition"
                  >
                    Code
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
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Landing Page Script</h2>
              <button onClick={() => setShowCodeModal(null)} className="text-slate-400 hover:text-slate-600 bg-white w-8 h-8 rounded-full flex items-center justify-center shadow-sm">✕</button>
            </div>
            <div className="p-8 space-y-4">
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 mb-2">
                 <p className="text-[10px] text-amber-800 font-black uppercase tracking-widest">Expert Tip</p>
                 <p className="text-xs text-amber-900 mt-1 font-medium leading-relaxed">Paste this code into any HTML block in WordPress, Shopify, or custom sites. It is pre-styled and handles state validation automatically.</p>
              </div>
              <pre className="bg-slate-900 text-emerald-400 p-6 rounded-2xl text-[10px] overflow-x-auto max-h-[400px] leading-relaxed font-mono relative group">
                {getEmbedCode(showCodeModal)}
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(getEmbedCode(showCodeModal));
                    alert('Code copied!');
                  }}
                  className="absolute top-4 right-4 bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-bold shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  COPY SCRIPT
                </button>
              </pre>
              <button 
                onClick={() => setShowCodeModal(null)}
                className="w-full bg-slate-800 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-900 transition"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Layout Editor Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2.5rem] w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[90vh]">
            {/* Sidebar Controls */}
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
                    {(['BENEFITS', 'TESTIMONIALS', 'FAQ', 'CUSTOM_TEXT'] as SectionType[]).map(type => (
                      <button key={type} onClick={() => addSection(type)} className="w-full bg-white border border-slate-200 p-3 rounded-xl text-left hover:border-emerald-500 transition-all flex items-center gap-3 group">
                        <span className="bg-slate-50 text-slate-400 group-hover:bg-amber-50 group-hover:text-amber-600 w-8 h-8 rounded-lg flex items-center justify-center text-xs">＋</span>
                        <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{type.replace('_', ' ')}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-200">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Primary Theme</label>
                  <div className="flex items-center gap-3 bg-white border border-slate-200 p-2 rounded-xl">
                    <input type="color" className="w-8 h-8 rounded cursor-pointer border-none bg-transparent" value={editingForm?.themeColor || '#10b981'} onChange={e => setEditingForm({...editingForm, themeColor: e.target.value})}/>
                    <span className="text-[10px] font-mono font-black text-slate-500">{editingForm?.themeColor}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Canvas */}
            <div className="flex-1 flex flex-col bg-slate-100/30 p-8 overflow-y-auto">
               <div className="max-w-2xl mx-auto w-full space-y-6">
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Campaign Title</label>
                     <input 
                        className="w-full text-2xl font-black border-none p-0 focus:ring-0 placeholder-slate-200"
                        placeholder="Page Name..."
                        value={editingForm?.title || ''}
                        onChange={e => setEditingForm({...editingForm, title: e.target.value})}
                     />
                  </div>

                  <div className="space-y-4">
                    {(editingForm?.sections || []).map((section, idx) => (
                      <div key={section.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm group animate-in fade-in slide-in-from-top-2">
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
                                placeholder="SECTION LABEL"
                              />
                           </div>
                           <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => moveSection(idx, 'up')} className="p-1.5 hover:bg-slate-100 rounded text-slate-400">↑</button>
                              <button onClick={() => moveSection(idx, 'down')} className="p-1.5 hover:bg-slate-100 rounded text-slate-400">↓</button>
                              <button onClick={() => removeSection(section.id)} className="p-1.5 hover:bg-red-50 rounded text-red-400 ml-2">✕</button>
                           </div>
                        </div>

                        {['HEADER', 'CUSTOM_TEXT', 'BENEFITS', 'TESTIMONIALS', 'FAQ', 'IMAGE', 'DELIVERY_INSTRUCTIONS'].includes(section.type) && (
                          <textarea 
                            className="w-full text-sm bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-emerald-500 font-medium"
                            rows={section.type === 'BENEFITS' ? 4 : 2}
                            value={section.content || ''}
                            onChange={e => {
                              const updated = [...(editingForm?.sections || [])];
                              updated[idx].content = e.target.value;
                              setEditingForm({...editingForm, sections: updated});
                            }}
                            placeholder={
                              section.type === 'IMAGE' ? 'https://image-url.com' :
                              section.type === 'BENEFITS' ? 'One benefit per line...' : 
                              section.type === 'TESTIMONIALS' ? 'Quote from customer...' : 
                              section.type === 'DELIVERY_INSTRUCTIONS' ? 'Placeholder for instructions...' : 'Enter content...'
                            }
                          />
                        )}

                        {['CONTACT', 'PRODUCTS', 'LOCATION', 'ADDRESS'].includes(section.type) && (
                           <div className="bg-slate-50 h-12 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Magira {section.type} Component</span>
                           </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-8">
                     <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Button Text</label>
                        <input className="w-full text-xs font-bold bg-slate-50 border-none rounded-xl p-3" value={editingForm?.submitButtonText || ''} onChange={e => setEditingForm({...editingForm, submitButtonText: e.target.value})}/>
                     </div>
                     <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Completion Msg</label>
                        <input className="w-full text-xs font-bold bg-slate-50 border-none rounded-xl p-3" value={editingForm?.successMessage || ''} onChange={e => setEditingForm({...editingForm, successMessage: e.target.value})}/>
                     </div>
                  </div>

                  <div className="flex items-center justify-between pt-8 border-t border-slate-100 mt-12 pb-12">
                    <button onClick={() => setShowModal(false)} className="text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-600 transition">Discard</button>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={handlePreviewUnsaved} className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition">
                        Preview
                      </button>
                      <button onClick={() => handleSave()} className="bg-emerald-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition">
                        Publish Changes
                      </button>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Preview Mode */}
      {previewForm && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl flex flex-col z-[100] animate-in fade-in duration-300">
           <div className="h-20 bg-black border-b border-white/10 flex items-center justify-between px-10 shrink-0">
              <button onClick={() => setPreviewForm(null)} className="text-white/60 hover:text-white transition font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                <span>←</span> Return to Builder
              </button>
              <div className="flex items-center bg-white/5 p-1 rounded-2xl">
                 <button onClick={() => setPreviewDevice('desktop')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${previewDevice === 'desktop' ? 'bg-white text-slate-900' : 'text-white/40'}`}>Desktop</button>
                 <button onClick={() => setPreviewDevice('mobile')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${previewDevice === 'mobile' ? 'bg-white text-slate-900' : 'text-white/40'}`}>Mobile</button>
              </div>
              <button onClick={() => { setPreviewForm(null); setShowCodeModal(previewForm); }} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-900/20">
                Get Script
              </button>
           </div>

           <div className="flex-1 overflow-y-auto p-8 flex items-center justify-center">
              <div className={`relative transition-all duration-700 ease-in-out flex items-center justify-center ${previewDevice === 'mobile' ? 'w-[375px] h-[760px] rounded-[3.5rem] border-[14px] border-slate-800 scale-[0.85]' : 'w-full max-w-5xl h-full rounded-3xl'}`}>
                <div className="flex-1 overflow-y-auto no-scrollbar rounded-[2.5rem] bg-white w-full h-full shadow-2xl">
                   <div className="flex flex-col gap-8 pb-20">
                      {previewForm.sections.map(sec => {
                         switch(sec.type) {
                            case 'HEADER':
                              return <div key={sec.id} style={{ backgroundColor: previewForm.themeColor }} className="p-12 text-white text-center"><h2 className="text-3xl font-black mb-4 tracking-tight leading-tight">{sec.label}</h2><p className="opacity-80 text-sm leading-relaxed font-medium">{sec.content}</p></div>;
                            case 'IMAGE':
                              return <div key={sec.id} className="w-full"><img src={sec.content} className="w-full h-auto block" /></div>;
                            case 'CONTACT':
                              return <div key={sec.id} className="px-10 space-y-4"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">{sec.label}</label><input disabled placeholder="Full Name" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm" /><input disabled placeholder="Phone Number" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm" /><input disabled placeholder="WhatsApp Number" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm" /></div>;
                            case 'PRODUCTS':
                              return <div key={sec.id} className="px-10"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">{sec.label}</label><select disabled className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-black text-slate-800 appearance-none"><option>Select Ginger Shot Package...</option></select></div>;
                            case 'LOCATION':
                              return <div key={sec.id} className="px-10"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">{sec.label}</label><select disabled className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm appearance-none"><option>Select State Hub...</option></select></div>;
                            case 'ADDRESS':
                              return <div key={sec.id} className="px-10"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">{sec.label}</label><textarea disabled placeholder="Street, City, Area" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm resize-none" rows={2} /></div>;
                            case 'DELIVERY_INSTRUCTIONS':
                              return <div key={sec.id} className="px-10"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">{sec.label}</label><textarea disabled placeholder={sec.content || "e.g. Call before arrival"} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm resize-none" rows={2} /></div>;
                            case 'BENEFITS':
                              return <div key={sec.id} className="px-10"><div className="bg-slate-50 p-8 rounded-3xl"><h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">{sec.label}</h4><ul className="space-y-3">{sec.content?.split('\n').map((b, i) => <li key={i} className="flex items-center gap-3 text-sm text-slate-600 font-medium"><span style={{ color: previewForm.themeColor }}>✓</span> {b}</li>)}</ul></div></div>;
                            case 'TESTIMONIALS':
                              return <div key={sec.id} className="px-10"><div className="p-8 rounded-3xl border-2 border-slate-50 italic text-slate-600 font-medium leading-relaxed">"{sec.content}"<p className="mt-4 not-italic font-black text-xs text-slate-800 uppercase tracking-widest">— {sec.label}</p></div></div>;
                            case 'FAQ':
                              return <div key={sec.id} className="px-10"><h3 className="text-sm font-black text-slate-800 mb-2">Q: {sec.label}</h3><p className="text-sm text-slate-500 leading-relaxed font-medium">A: {sec.content}</p></div>;
                            case 'CUSTOM_TEXT':
                              return <div key={sec.id} className="px-10"><h4 className="text-sm font-black text-slate-700">{sec.label}</h4><p className="text-xs text-slate-400 mt-2 leading-relaxed font-medium">{sec.content}</p></div>;
                            default: return null;
                         }
                      })}
                      
                      <div className="px-10">
                         <button disabled style={{ backgroundColor: previewForm.themeColor }} className="w-full text-white py-5 rounded-[1.5rem] font-black shadow-2xl opacity-90 uppercase tracking-[0.2em] text-sm">{previewForm.submitButtonText}</button>
                         <p className="text-[10px] text-center text-slate-300 mt-10 uppercase font-black tracking-widest">Magira CRM Production</p>
                      </div>
                   </div>
                </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default FormBuilder;
