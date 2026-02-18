
export enum UserRole {
  ADMIN = 'Admin',
  STATE_MANAGER = 'State Manager',
  SALES_AGENT = 'Sales Agent'
}

export enum PaymentStatus {
  PAID = 'Paid',
  POD = 'Pay on Delivery',
  PART_PAYMENT = 'Part Payment'
}

export enum DeliveryStatus {
  PENDING = 'Pending',
  IN_TRANSIT = 'In Transit',
  DELIVERED = 'Delivered',
  RETURNED = 'Returned',
  FAILED = 'Failed',
  CANCELLED = 'Cancelled',
  RESCHEDULED = 'Rescheduled'
}

export enum LeadStatus {
  NEW = 'New Lead',
  VERIFIED = 'Verified',
  REJECTED = 'Rejected',
  FAKE = 'Fake'
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  costPrice: number;
  sellingPrice: number;
  batchNumber: string;
  expiryDate: string;
  totalStock: number;
  stockPerState: Record<string, number>; // stateId -> quantity
  lowStockThreshold: number;
}

export interface State {
  id: string;
  name: string;
  whatsappGroupLink: string;
}

export interface LogisticsPartner {
  id: string;
  name: string;
  stateId: string;
  contactPerson: string;
  phone: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  priceAtOrder: number;
  costAtOrder: number;
}

export interface Order {
  id: string;
  trackingId: string;
  customerName: string;
  phone: string;
  whatsapp?: string;
  address: string;
  deliveryInstructions?: string;
  stateId: string;
  items: OrderItem[];
  totalAmount: number;
  logisticsCost: number;
  paymentStatus: PaymentStatus;
  deliveryStatus: DeliveryStatus;
  createdAt: string;
  createdBy: string;
  leadId?: string; // Reference to source lead if converted
  rescheduleDate?: string;
  rescheduleNotes?: string;
  reminderEnabled?: boolean;
}

export type SectionType = 'HEADER' | 'CONTACT' | 'PRODUCTS' | 'LOCATION' | 'ADDRESS' | 'DELIVERY_INSTRUCTIONS' | 'CUSTOM_TEXT' | 'BENEFITS' | 'TESTIMONIALS' | 'FAQ' | 'IMAGE';

export interface FormSection {
  id: string;
  type: SectionType;
  label?: string;
  content?: string;
}

export interface OrderForm {
  id: string;
  title: string;
  description: string;
  productIds: string[];
  themeColor: string;
  createdAt: string;
  isActive: boolean;
  sections: FormSection[];
  submitButtonText: string;
  successMessage: string;
  thankYouUrl?: string;
  createdBy: string; // User name or ID
}

export interface WebLead {
  id: string;
  formId: string;
  customerName: string;
  phone: string;
  whatsapp?: string;
  address: string;
  deliveryInstructions?: string;
  stateId?: string;
  items: Array<{ productId: string; quantity: number }>;
  status: LeadStatus;
  notes: string;
  createdAt: string;
  agentName?: string; // Who the lead belongs to
}

export interface AbandonedCart {
  id: string; // Session ID
  formId: string;
  customerName?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  deliveryInstructions?: string;
  items?: Array<{ productId: string; quantity: number }>;
  createdAt: string;
  lastUpdatedAt: string;
  agentName: string;
  status: 'abandoned' | 'converted';
  pageUrl?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  password?: string;
  role: UserRole;
  stateId?: string;
  isApproved: boolean;
  status: 'pending' | 'approved' | 'rejected';
  registeredAt: string;
}
