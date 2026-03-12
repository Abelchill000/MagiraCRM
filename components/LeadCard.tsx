
import React from 'react';
import { WebLead, LeadStatus, Order, OrderForm, Product, DeliveryStatus } from '../types';
import { Phone, Copy, MessageCircle, MapPin, User, Calendar, Eye, Edit2, Trash2, Zap, Package, Globe } from 'lucide-react';
import { motion } from 'framer-motion';

interface LeadCardProps {
  lead: WebLead;
  onView: (lead: WebLead) => void;
  onConvert: (lead: WebLead) => void;
  onDelete: (id: string) => void;
  onCopy: (lead: WebLead) => void;
  onUpdateStatus: (id: string, status: LeadStatus) => void;
  linkedOrder?: Order;
  canManageFulfillment: boolean;
  onMarkDelivered: (orderId: string, leadId: string) => void;
  formSource?: OrderForm;
  products: Product[];
  isNew?: boolean;
}

const LeadCard: React.FC<LeadCardProps> = ({
  lead,
  onView,
  onConvert,
  onDelete,
  onCopy,
  onUpdateStatus,
  linkedOrder,
  canManageFulfillment,
  onMarkDelivered,
  formSource,
  products,
  isNew
}) => {
  const estimatedValue = lead.items.reduce((acc, item) => {
    const price = typeof item.priceAtCapture === 'string' ? parseFloat(item.priceAtCapture) : item.priceAtCapture;
    if (price !== undefined && price > 0) {
      return acc + price;
    }
    // Fallback: Try to extract price from packageLabel
    if (item.packageLabel) {
      const match = item.packageLabel.match(/₦([\d,]+)/);
      if (match) {
        return acc + parseInt(match[1].replace(/,/g, ''));
      }
    }
    const p = products.find(prod => prod.id === item.productId || prod.name.toLowerCase().includes('ginger'));
    return acc + (p ? p.sellingPrice * item.quantity : 20000 * item.quantity);
  }, 0);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  };

  const getDeliveryStatusColor = (status: DeliveryStatus) => {
    switch (status) {
      case DeliveryStatus.DELIVERED: return 'bg-emerald-100 text-emerald-700';
      case DeliveryStatus.FAILED: return 'bg-red-100 text-red-700';
      case DeliveryStatus.CANCELLED: return 'bg-slate-200 text-slate-600';
      case DeliveryStatus.RESCHEDULED: return 'bg-amber-100 text-amber-700';
      case DeliveryStatus.PENDING: return 'bg-blue-100 text-blue-700';
      default: return 'bg-slate-100 text-slate-500';
    }
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-300"
    >
      {/* Ribbon */}
      {isNew && (
        <div className="absolute top-0 right-0 w-24 h-24 overflow-hidden rounded-tr-[2rem]">
          <div className="absolute top-4 -right-8 w-32 bg-amber-500 text-white text-[9px] font-black py-1 text-center rotate-45 uppercase tracking-widest shadow-sm">
            New Pool
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
            <Package size={28} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">#{lead.id.split('-')[1] || lead.id.slice(0, 8).toUpperCase()}</h3>
            <p className="text-xs font-bold text-slate-400 mt-0.5">{formatDate(lead.createdAt)}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-slate-900">₦{estimatedValue.toLocaleString()}</p>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Main Value</p>
        </div>
      </div>

      {/* Customer Info */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-black text-lg">
            {lead.customerName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-black text-slate-800 text-lg leading-tight">{lead.customerName}</p>
            <p className="text-blue-600 font-bold text-sm mt-1">{lead.phone}</p>
            {lead.whatsapp && (
              <div className="flex items-center gap-1.5 mt-1 text-emerald-600">
                <MessageCircle size={14} className="fill-emerald-600" />
                <p className="text-xs font-black">{lead.whatsapp}</p>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => window.open(`tel:${lead.phone}`)}
            className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center hover:bg-blue-600 hover:text-white transition-colors"
          >
            <Phone size={18} />
          </button>
          <button 
            onClick={() => onCopy(lead)}
            className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-slate-800 hover:text-white transition-colors"
          >
            <Copy size={18} />
          </button>
          {lead.whatsapp && (
            <button 
              onClick={() => window.open(`https://wa.me/${lead.whatsapp?.replace(/\D/g, '')}`)}
              className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-colors"
            >
              <MessageCircle size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Location */}
      <div className="flex flex-col gap-1 mb-8">
        <div className="flex items-center gap-2 text-slate-400">
          <MapPin size={16} />
          <p className="text-sm font-bold truncate">{lead.address}</p>
        </div>
        {lead.stateName && (
          <div className="flex items-center gap-2 text-slate-400 ml-6">
            <Globe size={12} />
            <p className="text-[10px] font-black uppercase tracking-widest">{lead.stateName}</p>
          </div>
        )}
      </div>

      <div className="h-px bg-slate-50 mb-8" />

      {/* Actions Row */}
      <div className="flex flex-wrap items-center gap-4 mb-8">
        <div className="flex-1 min-w-[150px]">
          <div className="relative">
            <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
            <select 
              value={lead.agentName || ''}
              onChange={(e) => onUpdateStatus(lead.id, lead.status)} // Placeholder for claim logic if needed
              className="w-full bg-slate-50 border-none rounded-2xl pl-11 pr-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="">-- Claim Lead --</option>
              {lead.agentName && <option value={lead.agentName}>{lead.agentName}</option>}
            </select>
          </div>
        </div>
        <div className="flex-1 min-w-[150px]">
          <div className="relative">
            <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
            <div className="w-full bg-slate-50 border-none rounded-2xl pl-11 pr-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
              DD/MM/YYYY
            </div>
          </div>
        </div>
        <div className="bg-blue-50 text-blue-600 px-4 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest">
          Web Inflow
        </div>
      </div>

      {/* Main Action */}
      <div className="flex items-center gap-3">
        {!linkedOrder ? (
          <button 
            onClick={() => onConvert(lead)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-blue-100 transition-all active:scale-95"
          >
            <Zap size={18} className="fill-white" />
            Qualify Order
          </button>
        ) : (
          <div className="flex-1 flex flex-col gap-1">
            <div className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-center text-[10px] ${getDeliveryStatusColor(linkedOrder.deliveryStatus)}`}>
              {linkedOrder.deliveryStatus}
            </div>
            {canManageFulfillment && linkedOrder.deliveryStatus !== DeliveryStatus.DELIVERED && linkedOrder.deliveryStatus !== DeliveryStatus.CANCELLED && (
              <button 
                onClick={() => onMarkDelivered(linkedOrder.id, lead.id)}
                className="text-[10px] font-black text-emerald-600 hover:underline uppercase text-center mt-1"
              >
                Mark Delivered
              </button>
            )}
          </div>
        )}
        <div className="flex gap-2">
          <button 
            onClick={() => onView(lead)}
            className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-slate-800 hover:text-white transition-colors"
          >
            <Eye size={20} />
          </button>
          <button 
            className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-slate-800 hover:text-white transition-colors"
          >
            <Edit2 size={20} />
          </button>
          {canManageFulfillment && (
            <button 
              onClick={() => onDelete(lead.id)}
              className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-red-600 hover:text-white transition-colors"
            >
              <Trash2 size={20} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default LeadCard;
