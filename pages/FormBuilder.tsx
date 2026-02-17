
import React, { useState } from 'react';
import { db } from '../services/mockDb';
import { OrderForm, Product, State, FormSection, SectionType } from '../types';

const SECTION_DEFAULTS: Record<SectionType, Partial<FormSection>> = {
  HEADER: { label: 'Order Your Magira Shots', content: 'Fresh organic health shots delivered to your doorstep.' },
  CONTACT: { label: 'Customer Information' },
  PRODUCTS: { label: 'Select Your Package' },
  LOCATION: { label: 'Delivery State' },
  ADDRESS: { label: 'Street Address' },
  CUSTOM_TEXT: { label: 'Special Instructions', content: 'Please note that delivery takes 24-48 hours.' },
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
      sections: editingForm.sections || [
        { id: 'sec-1', type: 'HEADER', label: 'Order Form', content: 'Fill the details below.' },
        { id: 'sec-2', type: 'CONTACT' },
        { id: 'sec-3', type: 'PRODUCTS' },
        { id: 'sec-4', type: 'ADDRESS' }
      ],
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
          return `
    <div style="background-color: ${form.themeColor}; padding: 24px; color: white;">
      <h2 style="margin: 0; font-size: 20px; font-weight: 800;">${sec.label || form.title}</h2>
      <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">${sec.content || form.description}</p>
    </div>`;
        case 'CONTACT':
          return `
    <div style="padding: 0 24px;">
      <label style="display: block; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 6px;">${sec.label || 'Contact Info'}</label>
      <input type="text" name="customerName" placeholder="Full Name" required style="width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 10px; box-sizing: border-box; margin-bottom: 12px;">
      <input type="tel" name="phone" placeholder="Phone Number" required style="width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 10px; box-sizing: border-box;">
    </div>`;
        case 'PRODUCTS':
          return `
    <div style="padding: 0 24px;">
      <label style="display: block; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 6px;">${sec.label || 'Select Package'}</label>
      <select name="packageData" required style="width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 10px; box-sizing: border-box; background: white;">
        <option value="">-- Choose Ginger Shot Offer --</option>
        ${packageOptions}
      </select>
    </div>`;
        case 'LOCATION':
          return `
    <div style="padding: 0 24px;">
      <label style="display: block; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 6px;">${sec.label || 'State'}</label>
      <select name="stateName" required style="width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 10px; box-sizing: border-box; background: white;">
        <option value="">-- Select State --</option>
        ${stateOptions}
      </select>
    </div>`;
        case 'ADDRESS':
          return `
    <div style="padding: 0 24px;">
      <label style="display: block; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 6px;">${sec.label || 'Address'}</label>
      <textarea name="address" required rows="2" placeholder="Full Delivery Address" style="width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 10px; box-sizing: border-box; font-family: sans-serif;"></textarea>
    </div>`;
        case 'CUSTOM_TEXT':
          return `
    <div style="padding: 0 24px;">
       <h4 style="margin: 0; font-size: 13px; color: #334155;">${sec.label}</h4>
       <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b; line-height: 1.5;">${sec.content}</p>
    </div>`;
        default: return '';
      }
    }).join('\n');

    return `<!-- Magira Lead Capture: ${form.title} -->
<div id="magira-container-${form.id}" style="font-family: 'Inter', sans-serif; max-width: 480px; margin: 20px auto; border: 1px solid #f1f5f9; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05);">
  <form id="magira-form-${form.id}" style="display: flex; flex-direction: column; gap: 20px; padding-bottom: 24px;">
    ${sectionsHtml}
    
    <div style="padding: 0 24px;">
      <button type="submit" style="width: 100%; background-color: ${form.themeColor}; color: white; border: none; padding: 16px; border-radius: 14px; font-weight: 800; font-size: 15px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 10px ${form.themeColor}33;">
        ${form.submitButtonText}
      </button>
      <p style="text-align: center; margin: 12px 0 0 0; font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Powered by Magira Distribution CRM</p>
    </div>
  </form>
</div>

<script>
document.getElementById('magira-form-${form.id}').addEventListener('submit', function(e) {
  e.preventDefault();
  const formData = new FormData(this);
  const rawData = Object.fromEntries(formData.entries());
  
  // Parse package data
  let pkg = { qty: 1, price: 0 };
  try { pkg = JSON.parse(rawData.packageData); } catch(err) {}

  const payload = {
    customerName: rawData.customerName,
    phone: rawData.phone,
    address: rawData.address,
    stateName: rawData.stateName,
    productId: 'GINGER-SHOT-500ML', 
    quantity: pkg.qty,
    totalPrice: pkg.price,
    formId: '${form.id}'
  };

  const btn = this.querySelector('button');
  btn.disabled = true;
  btn.innerText = 'Processing...';
  
  console.log('Magira Lead Data:', payload);
  
  setTimeout(() => {
    const thankYouUrl = "${form.thankYouUrl || ''}";
    if (thankYouUrl) {
      window.location.href = thankYouUrl;
    } else {
      document.getElementById('magira-container-${form.id}').innerHTML = \`
        <div style="padding: 60px 40px; text-align: center; color: #1e293b;">
          <div style="font-size: 60px; margin-bottom: 24px;">🎉</div>
          <h3 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 800;">Order Received!</h3>
          <p style="color: #64748b; font-size: 14px; line-height: 1.6;">${form.successMessage}</p>
        </div>
      \`;
    }
  }, 1000);
});
</script>`;
  };

  const handlePreviewUnsaved = () => {
    if (!editingForm) return;
    const tempForm: OrderForm = {
      id: editingForm.id || 'PREVIEW-TEMP',
      title: editingForm.title || 'Preview Form',
      description: editingForm.description || '',
      productIds: editingForm.productIds || [],
      themeColor: editingForm.themeColor || '#10b981',
      createdAt: new Date().toISOString(),
      isActive: true,
      sections: editingForm.sections || [],
      submitButtonText: editingForm.submitButtonText || 'Place Order Now',
      successMessage: editingForm.successMessage || 'Success!',
      thankYouUrl: editingForm.thankYouUrl || ''
    };
    setPreviewForm(tempForm);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Form Builder</h1>
          <p className="text-slate-500">Configure your "Ginger Shot" landing page forms.</p>
        </div>
        <button 
          onClick={() => { setEditingForm({ 
            productIds: [], 
            themeColor: '#10b981', 
            sections: [
               { id: 'sec-1', type: 'HEADER', label: 'Order Form', content: 'Magira Health Shots: 100% Organic.' },
               { id: 'sec-2', type: 'CONTACT' },
               { id: 'sec-3', type: 'PRODUCTS' },
               { id: 'sec-4', type: 'LOCATION' },
               { id: 'sec-5', type: 'ADDRESS' }
            ],
            submitButtonText: 'Order Now',
            successMessage: 'We will contact you via WhatsApp to confirm your delivery.',
            thankYouUrl: '',
          }); setShowModal(true); }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition"
        >
          + Create New Form
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {forms.map(form => (
          <div key={form.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition">
            <div className="h-2" style={{ backgroundColor: form.themeColor }}></div>
            <div className="p-6">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-slate-800 text-lg">{form.title || 'Untitled Form'}</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${form.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {form.isActive ? 'Active' : 'Draft'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-4">Form Layout</p>
              <div className="flex flex-wrap gap-1 mt-2 mb-6">
                {(form.sections || []).map(s => (
                   <span key={s.id} className="text-[9px] font-black bg-slate-50 text-slate-500 border border-slate-100 px-2 py-1 rounded-full">{s.type}</span>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setPreviewForm(form)}
                  className="bg-slate-50 hover:bg-slate-100 text-slate-600 py-2 rounded-lg text-xs font-bold transition"
                >
                  Preview
                </button>
                <button 
                  onClick={() => { setEditingForm(form); setShowModal(true); }}
                  className="bg-slate-50 hover:bg-slate-100 text-slate-600 py-2 rounded-lg text-xs font-bold transition"
                >
                  Edit Layout
                </button>
                <button 
                  onClick={() => setShowCodeModal(form)}
                  className="col-span-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2"
                >
                  <span>📋</span> Copy Embed Code
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Code Viewer Modal */}
      {showCodeModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-[70]">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Form Embed Code</h2>
                <p className="text-xs text-slate-500">Paste this HTML into your landing page builder.</p>
              </div>
              <button onClick={() => setShowCodeModal(null)} className="text-slate-400 hover:text-slate-600 bg-white w-8 h-8 rounded-full flex items-center justify-center shadow-sm">✕</button>
            </div>
            <div className="p-8 space-y-4">
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 mb-2">
                 <p className="text-[10px] text-amber-800 font-bold uppercase tracking-widest">Note</p>
                 <p className="text-xs text-amber-900 mt-1">This form is optimized for the <strong>Ginger Shot</strong> package offers and includes all 36 Nigerian states.</p>
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
                  COPY
                </button>
              </pre>
              <button 
                onClick={() => setShowCodeModal(null)}
                className="w-full bg-slate-800 text-white py-4 rounded-2xl font-bold hover:bg-slate-900 transition"
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
          <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col md:flex-row h-[85vh]">
            {/* Sidebar Controls */}
            <div className="w-full md:w-80 bg-slate-50 border-r border-slate-100 p-6 overflow-y-auto">
              <h2 className="text-lg font-black text-slate-800 mb-6">Components</h2>
              <div className="space-y-2">
                {(['HEADER', 'CONTACT', 'PRODUCTS', 'LOCATION', 'ADDRESS', 'CUSTOM_TEXT'] as SectionType[]).map(type => (
                  <button 
                    key={type}
                    onClick={() => addSection(type)}
                    className="w-full bg-white border border-slate-200 p-3 rounded-xl text-left hover:border-emerald-500 transition-all flex items-center gap-3 group"
                  >
                    <span className="bg-slate-50 text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 w-8 h-8 rounded-lg flex items-center justify-center text-xs">＋</span>
                    <div>
                       <p className="text-xs font-bold text-slate-700">{type.replace('_', ' ')}</p>
                       <p className="text-[10px] text-slate-400">Add to form</p>
                    </div>
                  </button>
                ))}
              </div>
              
              <div className="mt-10 pt-6 border-t border-slate-200">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Brand Color</label>
                <div className="flex items-center gap-3 bg-white border border-slate-200 p-2 rounded-xl">
                  <input 
                    type="color"
                    className="w-8 h-8 rounded cursor-pointer border-none bg-transparent"
                    value={editingForm?.themeColor || '#10b981'}
                    onChange={e => setEditingForm({...editingForm, themeColor: e.target.value})}
                  />
                  <span className="text-[10px] font-mono font-bold text-slate-500">{editingForm?.themeColor}</span>
                </div>
              </div>
            </div>

            {/* Main Canvas */}
            <div className="flex-1 flex flex-col bg-slate-100/50 p-6 overflow-y-auto">
               <div className="max-w-xl mx-auto w-full space-y-4">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Campaign Name</label>
                     <input 
                        className="w-full text-xl font-bold border-none p-0 focus:ring-0 placeholder-slate-300"
                        placeholder="e.g. Ginger Shot Promo Page"
                        value={editingForm?.title || ''}
                        onChange={e => setEditingForm({...editingForm, title: e.target.value})}
                     />
                  </div>

                  <div className="space-y-3">
                    {(editingForm?.sections || []).map((section, idx) => (
                      <div key={section.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm group relative animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center justify-between mb-4">
                           <div className="flex items-center gap-2">
                              <span className="text-[9px] font-black bg-slate-800 text-white px-2 py-0.5 rounded uppercase">{section.type}</span>
                              <input 
                                className="text-sm font-bold border-none p-0 focus:ring-0 bg-transparent w-40"
                                value={section.label || ''}
                                onChange={e => {
                                  const updated = [...(editingForm?.sections || [])];
                                  updated[idx].label = e.target.value;
                                  setEditingForm({...editingForm, sections: updated});
                                }}
                                placeholder="Section Label"
                              />
                           </div>
                           <div className="flex items-center gap-1">
                              <button onClick={() => moveSection(idx, 'up')} className="p-1 hover:bg-slate-50 rounded text-slate-400 text-xs">↑</button>
                              <button onClick={() => moveSection(idx, 'down')} className="p-1 hover:bg-slate-50 rounded text-slate-400 text-xs">↓</button>
                              <button onClick={() => removeSection(section.id)} className="p-1 hover:bg-red-50 rounded text-red-400 text-xs ml-2">✕</button>
                           </div>
                        </div>

                        {(section.type === 'HEADER' || section.type === 'CUSTOM_TEXT') && (
                          <textarea 
                            className="w-full text-xs bg-slate-50 border-none rounded-xl p-3 focus:ring-1 focus:ring-emerald-500"
                            rows={2}
                            value={section.content || ''}
                            onChange={e => {
                              const updated = [...(editingForm?.sections || [])];
                              updated[idx].content = e.target.value;
                              setEditingForm({...editingForm, sections: updated});
                            }}
                            placeholder="Add descriptive text..."
                          />
                        )}

                        {(section.type === 'PRODUCTS') && (
                           <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 flex flex-col gap-2">
                              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Fixed Package Tiers</span>
                              <p className="text-[11px] text-emerald-800 leading-relaxed italic">Displays the 9 standard Ginger Shot pricing packages (1-30 bottles).</p>
                           </div>
                        )}

                        {(section.type === 'LOCATION') && (
                           <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex flex-col gap-2">
                              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Full Nigerian States List</span>
                              <p className="text-[11px] text-blue-800 leading-relaxed italic">Dropdown containing all 36 states + FCT for customer selection.</p>
                           </div>
                        )}

                        {(section.type === 'CONTACT' || section.type === 'ADDRESS') && (
                           <div className="bg-slate-50 h-10 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dynamic {section.type} Block</span>
                           </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-8">
                     <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Submit Button Text</label>
                        <input 
                           className="w-full text-xs font-bold bg-slate-50 border-none rounded-lg p-2"
                           value={editingForm?.submitButtonText || ''}
                           onChange={e => setEditingForm({...editingForm, submitButtonText: e.target.value})}
                        />
                     </div>
                     <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Success Message</label>
                        <input 
                           className="w-full text-xs font-bold bg-slate-50 border-none rounded-lg p-2"
                           value={editingForm?.successMessage || ''}
                           onChange={e => setEditingForm({...editingForm, successMessage: e.target.value})}
                        />
                     </div>
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-slate-100 mt-8">
                    <button onClick={() => setShowModal(false)} className="text-slate-400 font-bold text-xs uppercase hover:text-slate-600 transition">Cancel</button>
                    <div className="flex items-center gap-3">
                      <button 
                        type="button"
                        onClick={handlePreviewUnsaved}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition"
                      >
                        Preview Form
                      </button>
                      <button 
                        onClick={() => handleSave()} 
                        className="bg-emerald-600 text-white px-10 py-4 rounded-2xl font-black shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition"
                      >
                        Finalize Form
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
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl flex flex-col z-[100] animate-in fade-in duration-300">
           {/* Preview Toolbar */}
           <div className="h-16 bg-slate-950 border-b border-white/10 flex items-center justify-between px-6 shrink-0">
              <div className="flex items-center gap-4">
                 <button onClick={() => setPreviewForm(null)} className="text-white/50 hover:text-white transition p-2">
                    <span className="text-xl">←</span> Back to Editor
                 </button>
              </div>

              <div className="flex items-center bg-white/5 p-1 rounded-xl">
                 <button 
                    onClick={() => setPreviewDevice('desktop')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${previewDevice === 'desktop' ? 'bg-white text-slate-950 shadow-lg' : 'text-white/40 hover:text-white'}`}
                 >
                    🖥️ Desktop
                 </button>
                 <button 
                    onClick={() => setPreviewDevice('mobile')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${previewDevice === 'mobile' ? 'bg-white text-slate-950 shadow-lg' : 'text-white/40 hover:text-white'}`}
                 >
                    📱 Mobile
                 </button>
              </div>

              <button 
                onClick={() => { setPreviewForm(null); setShowCodeModal(previewForm); }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg shadow-emerald-900/20"
              >
                Get Embed Code
              </button>
           </div>

           {/* Preview Body */}
           <div className="flex-1 overflow-y-auto p-4 md:p-8 flex items-center justify-center bg-[radial-gradient(#ffffff11_1px,transparent_1px)] [background-size:20px_20px]">
              <div className="relative transition-all duration-500 ease-in-out flex items-center justify-center w-full h-full max-h-[90vh]">
                <div 
                  className={`bg-white shadow-2xl transition-all duration-500 ease-in-out origin-center flex flex-col ${
                    previewDevice === 'mobile' 
                      ? 'w-[375px] h-[760px] rounded-[3rem] border-[12px] border-slate-900 relative scale-[0.8] sm:scale-90 lg:scale-100' 
                      : 'w-full max-w-5xl h-full rounded-2xl border border-white/10'
                  }`}
                >
                   <div className="flex-1 overflow-y-auto no-scrollbar rounded-[2rem] md:rounded-2xl bg-white">
                      <div className="flex flex-col gap-6 pb-12">
                         {previewForm.sections.map(sec => {
                            switch(sec.type) {
                               case 'HEADER':
                                 return (
                                    <div key={sec.id} style={{ backgroundColor: previewForm.themeColor }} className="p-8 md:p-12 text-white">
                                       <h2 className="text-2xl md:text-4xl font-black mb-4 tracking-tight leading-tight">{sec.label || previewForm.title}</h2>
                                       <p className="opacity-90 text-sm md:text-base leading-relaxed font-medium">{sec.content || previewForm.description}</p>
                                    </div>
                                 );
                               case 'CONTACT':
                                 return (
                                   <div key={sec.id} className="px-8 md:px-12 space-y-4">
                                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">{sec.label}</label>
                                     <input disabled placeholder="Full Name" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm focus:outline-none placeholder:text-slate-300" />
                                     <input disabled placeholder="Phone Number" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm focus:outline-none placeholder:text-slate-300" />
                                   </div>
                                 );
                               case 'PRODUCTS':
                                 return (
                                    <div key={sec.id} className="px-8 md:px-12">
                                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">{sec.label}</label>
                                       <div className="relative">
                                          <select disabled className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm appearance-none text-slate-800 font-bold">
                                             <option>Select Ginger Shot Package...</option>
                                             {PACKAGES.map(p => (
                                                <option key={p.qty}>{p.label}</option>
                                             ))}
                                          </select>
                                          <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300">▼</div>
                                       </div>
                                    </div>
                                 );
                               case 'LOCATION':
                                 return (
                                    <div key={sec.id} className="px-8 md:px-12">
                                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">{sec.label}</label>
                                       <div className="relative">
                                          <select disabled className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm appearance-none text-slate-800">
                                             <option>Select State Hub...</option>
                                             {NIGERIA_STATES.map(s => <option key={s}>{s}</option>)}
                                          </select>
                                          <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300">▼</div>
                                       </div>
                                    </div>
                                 );
                               case 'ADDRESS':
                                 return (
                                    <div key={sec.id} className="px-8 md:px-12">
                                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">{sec.label}</label>
                                       <textarea disabled placeholder="Street, City, Area" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm resize-none placeholder:text-slate-300" rows={2} />
                                    </div>
                                 );
                               case 'CUSTOM_TEXT':
                                 return (
                                    <div key={sec.id} className="px-8 md:px-12">
                                       <div className="bg-slate-50 p-6 rounded-2xl border-l-4" style={{ borderColor: previewForm.themeColor }}>
                                          <h4 className="text-sm font-bold text-slate-700">{sec.label}</h4>
                                          <p className="text-xs text-slate-500 mt-2 leading-relaxed">{sec.content}</p>
                                       </div>
                                    </div>
                                 );
                               default: return null;
                            }
                         })}
                         
                         <div className="px-8 md:px-12 mt-4">
                            <button 
                               disabled 
                               style={{ backgroundColor: previewForm.themeColor }}
                               className="w-full text-white py-5 rounded-[1.25rem] font-black shadow-xl opacity-90"
                            >
                               {previewForm.submitButtonText}
                            </button>
                            <p className="text-[9px] text-center text-slate-300 mt-8 uppercase font-black tracking-[0.1em]">Magira Distribution CRM</p>
                         </div>
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
