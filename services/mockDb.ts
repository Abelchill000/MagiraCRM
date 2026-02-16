import { 
  Product, State, LogisticsPartner, Order, User, UserRole, 
  PaymentStatus, DeliveryStatus, OrderForm, WebLead, LeadStatus 
} from '../types';

const STORAGE_KEY = 'magira_crm_data_v3'; // Version bump for data integrity fix

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
      sku: 'GSHOT-01',
      costPrice: 500,
      sellingPrice: 1200,
      batchNumber: 'B-001',
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
      id: 'u-admin',
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
    
    // Listen for storage changes in other tabs
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
    let parsed: any;
    
    if (saved) {
      try {
        parsed = JSON.parse(saved);
      } catch (e) {
        parsed = JSON.parse(JSON.stringify(INITIAL_DATA));
      }
    } else {
      parsed = JSON.parse(JSON.stringify(INITIAL_DATA));
    }

    // Integrity checks
    if (!parsed.users || !Array.isArray(parsed.users)) {
      parsed.users = JSON.parse(JSON.stringify(INITIAL_DATA.users));
    }
    
    let changed = false;
    
    // Ensure admin is always present and approved
    const adminIdx = parsed.users.findIndex((u: User) => u.email === 'admin@magiracrm.store');
    if (adminIdx === -1) {
      parsed.users.push(INITIAL_DATA.users[0]);
      changed = true;
    } else {
      if (parsed.users[adminIdx].status !== 'approved') {
        parsed.users[adminIdx].status = 'approved';
        parsed.users[adminIdx].isApproved = true;
        changed = true;
      }
    }

    // Fix status mapping for all users
    parsed.users = parsed.users.map((u: any) => {
      if (!u.status) {
        u.status = u.isApproved ? 'approved' : 'pending';
        changed = true;
      }
      return u;
    });

    if (changed) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    }

    return parsed;
  }

  private save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    this.notify();
  }

  private sync() {
    this.data = this.load();
  }

  // --- AUTH ---
  getCurrentUser() { return this.data.currentUser; }
  
  getUsers() { 
    this.sync();
    return this.data.users; 
  }

  register(name: string, email: string, password: string, role: UserRole) {
    this.sync();
    const cleanEmail = email.toLowerCase().trim();
    if (this.data.users.some(u => u.email.toLowerCase() === cleanEmail)) {
      throw new Error('This email is already registered.');
    }

    const newUser: User = {
      id: 'u-' + Math.random().toString(36).substr(2, 9),
      name: name.trim(),
      email: cleanEmail,
      password,
      role,
      isApproved: role === UserRole.ADMIN,
      status: role === UserRole.ADMIN ? 'approved' : 'pending',
      registeredAt: new Date().toISOString()
    };

    this.data.users.push(newUser);
    this.save();
    console.log('User registered in DB:', newUser.email, newUser.status);
    return newUser;
  }

  login(email: string, password?: string) {
    this.sync();
    const cleanEmail = email.toLowerCase().trim();
    const user = this.data.users.find(u => u.email.toLowerCase() === cleanEmail);
    
    if (!user) throw new Error('Account not found.');
    if (user.password && password !== user.password) throw new Error('Incorrect password.');
    
    if (user.status === 'pending') throw new Error('Account pending approval');
    if (user.status === 'rejected') throw new Error('Account access denied');
    
    this.data.currentUser = user;
    this.save();
    return user;
  }

  switchUserRole(newRole: UserRole) {
    this.sync();
    if (this.data.currentUser) {
      this.data.currentUser.role = newRole;
      const userIdx = this.data.users.findIndex(u => u.id === this.data.currentUser?.id);
      if (userIdx !== -1) {
        this.data.users[userIdx].role = newRole;
      }
      this.save();
      return this.data.currentUser;
    }
    return null;
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

  logout() {
    this.data.currentUser = null;
    this.save();
  }

  // --- DATA OPERATIONS ---
  getProducts() { this.sync(); return this.data.products; }
  saveProduct(product: Product) {
    this.sync();
    const idx = this.data.products.findIndex(p => p.id === product.id);
    if (idx >= 0) this.data.products[idx] = product;
    else this.data.products.push(product);
    this.save();
  }
  
  getOrders() { this.sync(); return this.data.orders; }
  createOrder(order: Order) {
    this.sync();
    this.data.orders.push(order);
    this.save();
  }
  
  updateOrderStatus(orderId: string, status: DeliveryStatus, extra?: any) {
    this.sync();
    const order = this.data.orders.find(o => o.id === orderId);
    if (!order) return;
    
    const oldStatus = order.deliveryStatus;
    order.deliveryStatus = status;
    if (extra?.logisticsCost !== undefined) order.logisticsCost = extra.logisticsCost;
    
    if (status === DeliveryStatus.DELIVERED && oldStatus !== DeliveryStatus.DELIVERED) {
      order.items.forEach(item => {
        const product = this.data.products.find(p => p.id === item.productId);
        if (product && product.stockPerState[order.stateId] !== undefined) {
          product.stockPerState[order.stateId] -= item.quantity;
        }
      });
    }
    this.save();
  }

  getStates() { this.sync(); return this.data.states; }
  saveState(state: State) {
    this.sync();
    const idx = this.data.states.findIndex(s => s.id === state.id);
    if (idx >= 0) this.data.states[idx] = state;
    else this.data.states.push(state);
    this.save();
  }

  getLogistics() { this.sync(); return this.data.logistics; }
  saveLogistics(partner: LogisticsPartner) {
    this.sync();
    const idx = this.data.logistics.findIndex(l => l.id === partner.id);
    if (idx >= 0) this.data.logistics[idx] = partner;
    else this.data.logistics.push(partner);
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
      if (notes) lead.notes = notes;
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
    }
  }
  
  clearAllData() {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  }
}

export const db = new MockDb();