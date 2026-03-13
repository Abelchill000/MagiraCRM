
export enum UserRole {
  ADMIN = 'Admin',
  SALES_AGENT = 'Sales Agent',
  INVENTORY_MANAGER = 'Inventory Manager',
  LOGISTICS_MANAGER = 'Logistics Manager'
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
  lowStockThreshold: number;
}

export interface LogisticsPartner {
  id: string;
  name: string;
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
  stateName?: string;
  deliveryInstructions?: string;
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

export type SectionType = 'HEADER' | 'CONTACT' | 'PRODUCTS' | 'ADDRESS' | 'LOCATION' | 'DELIVERY_INSTRUCTIONS' | 'CUSTOM_TEXT' | 'BENEFITS' | 'TESTIMONIALS' | 'FAQ' | 'IMAGE';

export interface FormOption {
  label: string;
  value: string;
  price?: number;
  qty?: number;
}

export interface FormSection {
  id: string;
  type: SectionType;
  label?: string;
  content?: string;
  options?: FormOption[];
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
  assignedToNames?: string[]; // Optional: Assign form to specific agents
}

export interface WebLead {
  id: string;
  formId: string;
  customerName: string;
  phone: string;
  whatsapp?: string;
  address: string;
  stateName?: string;
  deliveryInstructions?: string;
  items: Array<{ productId: string; quantity: number; priceAtCapture?: number; packageLabel?: string }>;
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
  stateName?: string;
  deliveryInstructions?: string;
  items?: Array<{ productId: string; quantity: number; priceAtCapture?: number; packageLabel?: string }>;
  createdAt: string;
  lastUpdatedAt: string;
  agentName: string;
  status: 'abandoned' | 'converted';
  pageUrl?: string;
}

export enum WidgetType {
  TESTIMONIAL = 'Testimonial',
  CONTACT_FORM = 'Contact Form',
  RECENT_SALES = 'Recent Sales',
  PRODUCT_SHOWCASE = 'Product Showcase'
}

export interface Widget {
  id: string;
  name: string;
  type: WidgetType;
  config: any;
  createdAt: string;
  createdBy: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  password?: string;
  role: UserRole;
  isApproved: boolean;
  status: 'pending' | 'approved' | 'rejected';
  registeredAt: string;
}

export interface AdsBudget {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  date: string; // YYYY-MM-DD
  createdAt: string;
}
