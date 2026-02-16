
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
  users: User[]; // Persistent user list
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
    }
  ],
  states: [
    { id: 's1', name: 'Lagos', whatsappGroupLink: 'https://chat.whatsapp.com/example-lagos' },
    { id: 's2', name: 'Abuja', whatsappGroupLink: 'https://chat.whatsapp.com/example-abuja' }
  ],
  logistics: [],
  orders: [],
  forms: [],
  leads: [],
  users: [
    {
      id: 'u1',
      name: 'Admin Magira',
      email: 'admin@magira.com',
      role: UserRole.ADMIN,
      isApproved: true,
      status: 'approved',
      registeredAt: new Date().toISOString()
    }
  ],
  currentUser: null
};

class MockDb {
  private data: AppData;

  constructor() {
    const saved = localStorage.getItem(STORAGE_KEY);
    this.data = saved ? JSON.parse(saved) : INITIAL_DATA;
    if (!this.data.users) this.data.users = INITIAL_DATA.users;
  }

  private save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
  }

  // Auth
  getCurrentUser() { return this.data.currentUser; }
  
  getUsers() { return this.data.users; }

  register(name: string, email: string, role: UserRole) {
    if (this.data.users.find(u => u.email === email)) {
      throw new Error('Email already registered');
    }
    const newUser: User = {
      id: 'u' + Math.random().toString(36).substr(2, 9),
      name,
      email,
      role,
      isApproved: role === UserRole.ADMIN, // Admin auto-approved for demo purposes
      status: role === UserRole.ADMIN ? 'approved' : 'pending',
      registeredAt: new Date().toISOString()
    };
    this.data.users.push(newUser);
    this.save();
    return newUser;
  }

  login(email: string) {
    const user = this.data.users.find(u => u.email === email);
    if (!user) throw new Error('User not found');
    if (user.status === 'pending') throw new Error('Account pending approval');
    if (user.status === 'rejected') throw new Error('Account access denied');
    
    this.data.currentUser = user;
    this.save();
    return user;
  }

  approveUser(userId: string) {
    const user = this.data.users.find(u => u.id === userId);
    if (user) {
      user.isApproved = true;
      user.status = 'approved';
      this.save();
    }
  }

  rejectUser(userId: string) {
    const user = this.data.users.find(u => u.id === userId);
    if (user) {
      user.isApproved = false;
      user.status = 'rejected';
      this.save();
    }
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
    
    if (extra?.logisticsCost !== undefined) order.logisticsCost = extra.logisticsCost;
    if (extra?.rescheduleDate !== undefined) order.rescheduleDate = extra.rescheduleDate;
    if (extra?.rescheduleNotes !== undefined) order.rescheduleNotes = extra.rescheduleNotes;
    if (extra?.reminderEnabled !== undefined) order.reminderEnabled = extra.reminderEnabled;

    if (status === DeliveryStatus.DELIVERED && oldStatus !== DeliveryStatus.DELIVERED) {
      order.items.forEach(item => {
        const product = this.data.products.find(p => p.id === item.productId);
        if (product && product.stockPerState[order.stateId] !== undefined) {
          product.stockPerState[order.stateId] -= item.quantity;
        }
      });
    } else if ((status === DeliveryStatus.RETURNED || status === DeliveryStatus.CANCELLED) && oldStatus === DeliveryStatus.DELIVERED) {
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
