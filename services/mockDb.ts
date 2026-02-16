
import { 
  Product, State, LogisticsPartner, Order, User, UserRole, 
  PaymentStatus, DeliveryStatus, OrderForm, WebLead, LeadStatus 
} from '../types';

const STORAGE_KEY = 'magira_crm_data';

interface AppData {
  products: Product[];
  states: State[];
  logistics: LogisticsPartner[];
  orders: Order[];
  forms: OrderForm[];
  leads: WebLead[];
  currentUser: User | null;
}

const INITIAL_DATA: AppData = {
  products: [
    {
      id: 'p1',
      name: 'Ginger Shot (100ml)',
      sku: '',
      costPrice: 500,
      sellingPrice: 1200,
      batchNumber: '',
      expiryDate: '2025-12-31',
      totalStock: 500,
      stockPerState: { 's1': 50, 's2': 30 },
      lowStockThreshold: 10
    },
    {
      id: 'p2',
      name: 'Beet Root Shot (100ml)',
      sku: '',
      costPrice: 600,
      sellingPrice: 1500,
      batchNumber: '',
      expiryDate: '2025-10-15',
      totalStock: 300,
      stockPerState: { 's1': 20, 's2': 40 },
      lowStockThreshold: 10
    }
  ],
  states: [
    { id: 's1', name: 'Lagos', whatsappGroupLink: 'https://chat.whatsapp.com/example-lagos' },
    { id: 's2', name: 'Abuja', whatsappGroupLink: 'https://chat.whatsapp.com/example-abuja' },
    { id: 's3', name: 'Kano', whatsappGroupLink: 'https://chat.whatsapp.com/example-kano' },
    { id: 's4', name: 'Rivers', whatsappGroupLink: 'https://chat.whatsapp.com/example-rivers' }
  ],
  logistics: [
    { id: 'l1', name: 'GIG Logistics', stateId: 's1', contactPerson: 'John Doe', phone: '08012345678' },
    { id: 'l2', name: 'Speedaf', stateId: 's2', contactPerson: 'Jane Smith', phone: '08087654321' }
  ],
  orders: [],
  forms: [],
  leads: [],
  currentUser: {
    id: 'u1',
    name: 'Admin Magira',
    email: 'admin@magira.com',
    role: UserRole.ADMIN
  }
};

class MockDb {
  private data: AppData;

  constructor() {
    const saved = localStorage.getItem(STORAGE_KEY);
    this.data = saved ? JSON.parse(saved) : INITIAL_DATA;
    // Ensure new fields exist for legacy data
    if (!this.data.forms) this.data.forms = [];
    if (!this.data.leads) this.data.leads = [];
  }

  private save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
  }

  // Auth
  getCurrentUser() { return this.data.currentUser; }
  login(role: UserRole) {
    this.data.currentUser = {
      id: 'u' + Math.random().toString(36).substr(2, 9),
      name: `${role} User`,
      email: `${role.toLowerCase().replace(' ', '')}@magira.com`,
      role
    };
    this.save();
    return this.data.currentUser;
  }
  switchUserRole(role: UserRole) {
    if (this.data.currentUser) {
      this.data.currentUser.role = role;
      this.save();
      return this.data.currentUser;
    }
    return null;
  }
  logout() {
    this.data.currentUser = null;
    this.save();
  }

  // Products
  getProducts() { return this.data.products; }
  saveProduct(product: Product) {
    const idx = this.data.products.findIndex(p => p.id === product.id);
    if (idx >= 0) this.data.products[idx] = product;
    else this.data.products.push(product);
    this.save();
  }
  deleteProduct(id: string) {
    this.data.products = this.data.products.filter(p => p.id !== id);
    this.save();
  }

  // States
  getStates() { return this.data.states; }
  saveState(state: State) {
    const idx = this.data.states.findIndex(s => s.id === state.id);
    if (idx >= 0) this.data.states[idx] = state;
    else this.data.states.push(state);
    this.save();
  }

  // Logistics
  getLogistics() { return this.data.logistics; }
  saveLogistics(partner: LogisticsPartner) {
    const idx = this.data.logistics.findIndex(l => l.id === partner.id);
    if (idx >= 0) this.data.logistics[idx] = partner;
    else this.data.logistics.push(partner);
    this.save();
  }

  // Orders
  getOrders() { return this.data.orders; }
  createOrder(order: Order) {
    this.data.orders.push(order);
    this.save();
  }
  updateOrderStatus(orderId: string, status: DeliveryStatus, extra?: { logisticsCost?: number, rescheduleDate?: string, rescheduleNotes?: string, reminderEnabled?: boolean }) {
    const order = this.data.orders.find(o => o.id === orderId);
    if (!order) return;

    const oldStatus = order.deliveryStatus;
    order.deliveryStatus = status;
    
    if (extra?.logisticsCost !== undefined) {
      order.logisticsCost = extra.logisticsCost;
    }

    if (extra?.rescheduleDate !== undefined) {
      order.rescheduleDate = extra.rescheduleDate;
    }

    if (extra?.rescheduleNotes !== undefined) {
      order.rescheduleNotes = extra.rescheduleNotes;
    }

    if (extra?.reminderEnabled !== undefined) {
      order.reminderEnabled = extra.reminderEnabled;
    }

    // Stock Logic
    if (status === DeliveryStatus.DELIVERED && oldStatus !== DeliveryStatus.DELIVERED) {
      // Deduct stock when marked as delivered
      order.items.forEach(item => {
        const product = this.data.products.find(p => p.id === item.productId);
        if (product && product.stockPerState[order.stateId] !== undefined) {
          product.stockPerState[order.stateId] -= item.quantity;
        }
      });
    } else if ((status === DeliveryStatus.RETURNED || status === DeliveryStatus.CANCELLED) && oldStatus === DeliveryStatus.DELIVERED) {
       // Return stock if it was previously delivered but now cancelled or returned
       order.items.forEach(item => {
        const product = this.data.products.find(p => p.id === item.productId);
        if (product) {
          product.stockPerState[order.stateId] = (product.stockPerState[order.stateId] || 0) + item.quantity;
        }
      });
    }

    this.save();
  }

  // Form Builder
  getForms() { return this.data.forms; }
  saveForm(form: OrderForm) {
    const idx = this.data.forms.findIndex(f => f.id === form.id);
    if (idx >= 0) this.data.forms[idx] = form;
    else this.data.forms.push(form);
    this.save();
  }
  deleteForm(id: string) {
    this.data.forms = this.data.forms.filter(f => f.id !== id);
    this.save();
  }

  // Web Leads
  getLeads() { return this.data.leads; }
  createLead(lead: WebLead) {
    this.data.leads.push(lead);
    this.save();
  }
  updateLeadStatus(leadId: string, status: LeadStatus, notes?: string) {
    const lead = this.data.leads.find(l => l.id === leadId);
    if (lead) {
      lead.status = status;
      if (notes !== undefined) lead.notes = notes;
      this.save();
    }
  }

  // Stock Transfer Logic
  transferStock(productId: string, stateId: string, quantity: number) {
    const product = this.data.products.find(p => p.id === productId);
    if (product && product.totalStock >= quantity) {
      product.totalStock -= quantity;
      product.stockPerState[stateId] = (product.stockPerState[stateId] || 0) + quantity;
      this.save();
      return true;
    }
    return false;
  }

  restockStateHub(productId: string, stateId: string, quantity: number) {
    const product = this.data.products.find(p => p.id === productId);
    if (product) {
      product.stockPerState[stateId] = (product.stockPerState[stateId] || 0) + quantity;
      this.save();
      return true;
    }
    return false;
  }
}

export const db = new MockDb();
