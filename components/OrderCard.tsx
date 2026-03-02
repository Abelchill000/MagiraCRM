
import React from 'react';
import { Order, DeliveryStatus, UserRole, State } from '../types';
import { Phone, Copy, MessageCircle, MapPin, User, Calendar, Eye, FileText, Trash2, Package, Truck, CreditCard, Globe } from 'lucide-react';
import { motion } from 'framer-motion';

interface OrderCardProps {
  order: Order;
  onView: (order: Order) => void;
  onCopyReceipt: (order: Order) => void;
  onWhatsApp: (order: Order) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: DeliveryStatus) => void;
  canManageAllOrders: boolean;
  states: State[];
}

const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onView,
  onCopyReceipt,
  onWhatsApp,
  onDelete,
  onStatusChange,
  canManageAllOrders,
  states
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  };

  const getStatusColor = (status: DeliveryStatus) => {
    switch (status) {
      case DeliveryStatus.DELIVERED: return 'bg-emerald-100 text-emerald-700';
      case DeliveryStatus.FAILED: return 'bg-red-100 text-red-700';
      case DeliveryStatus.CANCELLED: return 'bg-slate-200 text-slate-600';
      case DeliveryStatus.RESCHEDULED: return 'bg-amber-100 text-amber-700';
      case DeliveryStatus.PENDING: return 'bg-blue-100 text-blue-700';
      default: return 'bg-slate-100 text-slate-500';
    }
  };

  const stateName = states.find(s => s.id === order.stateId || s.name === order.stateId)?.name || order.stateId || 'General Network';

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 ${order.deliveryStatus === DeliveryStatus.CANCELLED ? 'opacity-60' : ''}`}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
            <Package size={28} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">{order.id}</h3>
            <p className="text-xs font-bold text-slate-400 mt-0.5">{formatDate(order.createdAt)}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-slate-900">₦{order.totalAmount.toLocaleString()}</p>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Order Total</p>
        </div>
      </div>

      {/* Customer Info */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-black text-lg">
            {order.customerName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-black text-slate-800 text-lg leading-tight">{order.customerName}</p>
            <p className="text-blue-600 font-bold text-sm mt-1">{order.phone}</p>
            {order.whatsapp && (
              <div className="flex items-center gap-1.5 mt-1 text-emerald-600">
                <MessageCircle size={14} className="fill-emerald-600" />
                <p className="text-xs font-black">{order.whatsapp}</p>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => window.open(`tel:${order.phone}`)}
            className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center hover:bg-blue-600 hover:text-white transition-colors"
          >
            <Phone size={18} />
          </button>
          <button 
            onClick={() => onWhatsApp(order)}
            className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-colors"
          >
            <MessageCircle size={18} />
          </button>
        </div>
      </div>

      {/* Location */}
      <div className="flex flex-col gap-2 mb-8">
        <div className="flex items-center gap-2 text-slate-400">
          <MapPin size={16} />
          <p className="text-sm font-bold truncate">{order.address}</p>
        </div>
        <div className="flex items-center gap-2">
          <Globe size={14} className="text-blue-500" />
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
            Selected State: {stateName}
          </p>
        </div>
      </div>

      <div className="h-px bg-slate-50 mb-8" />

      {/* Tracking & Status Row */}
      <div className="flex flex-wrap items-center gap-4 mb-8">
        <div className="flex-1 min-w-[150px]">
          <div className="relative">
            <Truck size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
            <div className="w-full bg-slate-50 border-none rounded-2xl pl-11 pr-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 truncate">
              TRK: {order.trackingId}
            </div>
          </div>
        </div>
        <div className="flex-1 min-w-[150px]">
          <div className="relative">
            <CreditCard size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
            <div className="w-full bg-slate-50 border-none rounded-2xl pl-11 pr-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
              {order.paymentStatus}
            </div>
          </div>
        </div>
        <div className={`px-4 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest ${getStatusColor(order.deliveryStatus)}`}>
          {order.deliveryStatus}
        </div>
      </div>

      {/* Main Action & Status Update */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <select 
            value={order.deliveryStatus} 
            onChange={(e) => onStatusChange(order.id, e.target.value as DeliveryStatus)}
            className={`w-full text-[10px] font-black uppercase px-6 py-5 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm appearance-none text-center ${getStatusColor(order.deliveryStatus)}`}
          >
            {Object.values(DeliveryStatus).map(s => {
              if (!canManageAllOrders && s !== DeliveryStatus.RESCHEDULED && s !== order.deliveryStatus) return null;
              return <option key={s} value={s}>{s}</option>;
            })}
          </select>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => onView(order)}
            className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-slate-800 hover:text-white transition-colors"
          >
            <Eye size={20} />
          </button>
          <button 
            onClick={() => onCopyReceipt(order)}
            className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-slate-800 hover:text-white transition-colors"
          >
            <FileText size={20} />
          </button>
          {canManageAllOrders && (
            <button 
              onClick={() => onDelete(order.id)}
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

export default OrderCard;
