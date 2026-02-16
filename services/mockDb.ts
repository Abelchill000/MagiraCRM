
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
  users: User[];
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
      email: 'admin@magiracrm.store',
      password: 'password123',
      role: UserRole.ADMIN,
      isApproved: true,
      status: 'approved',
      registeredAt: new Date().toISOString()
    }
  ],
  currentUser: null
};

type Listener = () => void;

class MockDb {
  private data: AppData;
  private listeners: Set<Listener> = new Set();

  constructor() {
    this.data = this.load();
    this.migrate();
    
    // Listen for storage changes in other tabs to keep data in sync
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY) {
        this.data = this.load();
        this.notify();
      }
    });
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  private load(): AppData {
    const saved = localStorage.getItem(STORAGE_KEY);
    const data = saved ? JSON.parse(saved) : INITIAL_DATA;
    if (!data.users) data.users = INITIAL_DATA.users;
    return data;
  }

  private save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    this.notify();
  }

  private migrate() {
    let changed = false;
    if (!this.data.users.find(u => u.email === 'admin@magiracrm.store')) {
       this.data.users.push(INITIAL_DATA.users[0]);
       changed = true;
    }
    this.data.users = this.data.users.map(u => {
      if (!u.status) {
        u.status = u.isApproved ? 'approved' : 'pending';
        changed = true;
      }
      return u;
    });
    if (changed) this.save();
  }

  private sync() {
    this.data = this.load();
  }

  // Auth
  getCurrentUser() { return this.data.currentUser; }
  
  getUsers() { 
    this.sync();
    return this.data.users; 
  }

  register(name: string, email: string, password: string, role: UserRole) {
    this.sync();
    if (this.data.users.find(u => u.email === email)) {
      throw new Error('Email already registered');
    }
    const newUser: User = {
      id: 'u' + Math.random().toString(36).substr(2, 9),
      name,
      email,
      password,
      role,
      isApproved: role === UserRole.ADMIN,
      status: role === UserRole.ADMIN ? 'approved' : 'pending',
      registeredAt: new Date().toISOString()
    };
    this.data.users.push(newUser);
    this.save();
    return newUser;
  }

  login(email: string, password?: string) {
    this.sync();
    const user = this.data.users.find(u => u.email === email);
    if (!user) throw new Error('User not found');
    if (user.password && password !== user.password) {
      throw new Error('Invalid password');
    }
    if (user.status === 'pending') throw new Error('Account pending approval');
    if (user.status === 'rejected') throw new Error('Account access denied');
    
    this.data.currentUser = user;
    this.save();
    return user;
  }

  approveUser(userId: string) {
    this.sync();
    const user = this.data.users.find(u => u.id === userId);
    if (user) {
      user.isApproved = true;
      user.status = 'approved';
      this.save();
    }
  }

  rejectUser(userId: string) {
    this.sync();
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
  getProducts() { this.sync(); return this.data.products; }
  saveProduct(product: Product) {
    this.sync();
    const idx = this.data.products.findIndex(p => p.id === product.id);
    if (idx >= 0) this.data.products[idx] = product;
    else this.data.products.push(product);
    this.save();
  }
  deleteProduct(id: string) {
    this.sync();
    this.data.products = this.data.products.filter(p => p.id !== id);
    this.save();
  }

  // States
  getStates() { this.sync(); return this.data.states; }
  saveState(state: State) {
    this.sync();
    const idx = this.data.states.findIndex(s => s.id === state.id);
    if (idx >= 0) this.data.states[idx] = state;
    else this.data.states.push(state);
    this.save();
  }

  // Logistics
  getLogistics() { this.sync(); return this.data.logistics; }
  saveLogistics(partner: LogisticsPartner) {
    this.sync();
    const idx = this.data.logistics.findIndex(l => l.id === partner.id);
    if (idx >= 0) this.data.logistics[idx] = partner;
    else this.data.logistics.push(partner);
    this.save();
  }

  // Orders
  getOrders() { this.sync(); return this.data.orders; }
  createOrder(order: Order) {
    this.sync();
    this.data.orders.push(order);
    this.save();
  }
  updateOrderStatus(orderId: string, status: DeliveryStatus, extra?: { logisticsCost?: number, rescheduleDate?: string, rescheduleNotes?: string, reminderEnabled?: boolean }) {
    this.sync();
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

  getForms() { this.sync(); return this.data.forms; }
  saveForm(form: OrderForm) {
    this.sync();
    const idx = this.data.forms.findIndex(f => f.id === form.id);
    if (idx >= 0) this.data.forms[idx] = form;
    else this.data.forms.push(form);
    this.save();
  }

  getLeads() { this.sync(); return this.data.leads; }
  createLead(lead: WebLead) {
    this.sync();
    this.data.leads.push(lead);
    this.save();
  }
  updateLeadStatus(leadId: string, status: LeadStatus, notes?: string) {
    this.sync();
    const lead = this.data.leads.find(l => l.id === leadId);
    if (lead) {
      lead.status = status;
      if (notes !== undefined) lead.notes = notes;
      this.save();
    }
  }

  transferStock(productId: string, stateId: string, quantity: number) {
    this.sync();
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
    this.sync();
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
