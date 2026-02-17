
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, doc, setDoc, getDoc, getDocs, 
  updateDoc, onSnapshot, query, where, addDoc, deleteDoc 
} from 'firebase/firestore';
import { 
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, 
  signOut, onAuthStateChanged 
} from 'firebase/auth';
import { 
  Product, State, LogisticsPartner, Order, User, UserRole, 
  PaymentStatus, DeliveryStatus, OrderForm, WebLead, LeadStatus 
} from '../types';

// Replace with your actual Firebase config from the Firebase Console
const firebaseConfig = {
  apiKey: "REPLACE_WITH_YOUR_API_KEY",
  authDomain: "magira-distribution.firebaseapp.com",
  projectId: "magira-distribution",
  storageBucket: "magira-distribution.appspot.com",
  messagingSenderId: "REPLACE_WITH_YOUR_ID",
  appId: "REPLACE_WITH_YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
const auth = getAuth(app);

type Listener = () => void;

class FirebaseDb {
  private data: {
    products: Product[];
    states: State[];
    logistics: LogisticsPartner[];
    orders: Order[];
    forms: OrderForm[];
    leads: WebLead[];
    users: User[];
  } = {
    products: [],
    states: [],
    logistics: [],
    orders: [],
    forms: [],
    leads: [],
    users: []
  };

  private currentUser: User | null = null;
  private listeners: Set<Listener> = new Set();
  private unsubscribers: (() => void)[] = [];

  constructor() {
    this.initAuth();
    this.initRealtimeSync();
  }

  private initAuth() {
    onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const userDoc = await getDoc(doc(firestore, 'users', fbUser.uid));
        if (userDoc.exists()) {
          this.currentUser = { id: fbUser.uid, ...userDoc.data() } as User;
        }
      } else {
        this.currentUser = null;
      }
      this.notify();
    });
  }

  private initRealtimeSync() {
    const collections = ['products', 'states', 'logistics', 'orders', 'forms', 'leads', 'users'];
    
    collections.forEach(colName => {
      const unsub = onSnapshot(collection(firestore, colName), (snapshot) => {
        this.data[colName as keyof typeof this.data] = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        })) as any;
        this.notify();
      });
      this.unsubscribers.push(unsub);
    });
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  // --- AUTH ---
  getCurrentUser() { return this.currentUser; }
  getUsers() { return [...this.data.users]; }

  async register(name: string, email: string, password: string, role: UserRole) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;
    
    const userData: Partial<User> = {
      name,
      email,
      role,
      status: role === UserRole.ADMIN ? 'approved' : 'pending',
      isApproved: role === UserRole.ADMIN,
      registeredAt: new Date().toISOString()
    };

    await setDoc(doc(firestore, 'users', uid), userData);
    return { id: uid, ...userData } as User;
  }

  async login(email: string, password?: string) {
    if (!password) throw new Error("Password required");
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getDoc(doc(firestore, 'users', userCredential.user.uid));
    
    if (!userDoc.exists()) throw new Error("Profile missing");
    const profile = userDoc.data() as User;
    
    if (profile.status === 'pending') throw new Error("Account pending approval");
    if (profile.status === 'rejected') throw new Error("Account access denied");
    
    return { id: userCredential.user.uid, ...profile } as User;
  }

  async logout() {
    await signOut(auth);
  }

  async approveUser(userId: string) {
    await updateDoc(doc(firestore, 'users', userId), { status: 'approved', isApproved: true });
  }

  async rejectUser(userId: string) {
    await updateDoc(doc(firestore, 'users', userId), { status: 'rejected', isApproved: false });
  }

  async switchUserRole(newRole: UserRole) {
    if (this.currentUser) {
      await updateDoc(doc(firestore, 'users', this.currentUser.id), { role: newRole });
      this.currentUser.role = newRole;
      this.notify();
      return this.currentUser;
    }
    return null;
  }

  // --- DATA OPERATIONS ---
  getProducts() { return [...this.data.products]; }
  async saveProduct(product: Product) {
    const { id, ...rest } = product;
    await setDoc(doc(firestore, 'products', id), rest);
  }

  getOrders() { return [...this.data.orders]; }
  async createOrder(order: Order) {
    const { id, ...rest } = order;
    await setDoc(doc(firestore, 'orders', id), rest);
  }

  async updateOrderStatus(orderId: string, status: DeliveryStatus, extra?: any) {
    const updates: any = { deliveryStatus: status };
    if (extra?.logisticsCost !== undefined) updates.logisticsCost = extra.logisticsCost;
    if (extra?.rescheduleDate) updates.rescheduleDate = extra.rescheduleDate;
    if (extra?.rescheduleNotes) updates.rescheduleNotes = extra.rescheduleNotes;
    
    await updateDoc(doc(firestore, 'orders', orderId), updates);
  }

  getStates() { return [...this.data.states]; }
  async saveState(state: State) {
    const { id, ...rest } = state;
    await setDoc(doc(firestore, 'states', id), rest);
  }

  getLogistics() { return [...this.data.logistics]; }
  async saveLogistics(partner: LogisticsPartner) {
    const { id, ...rest } = partner;
    await setDoc(doc(firestore, 'logistics', id), rest);
  }

  getForms() { return [...this.data.forms]; }
  async saveForm(form: OrderForm) {
    const { id, ...rest } = form;
    await setDoc(doc(firestore, 'forms', id), rest);
  }

  getLeads() { return [...this.data.leads]; }
  async createLead(lead: WebLead) {
    const { id, ...rest } = lead;
    await setDoc(doc(firestore, 'leads', id), rest);
  }

  async updateLeadStatus(leadId: string, status: LeadStatus, notes?: string) {
    const updates: any = { status };
    if (notes) updates.notes = notes;
    await updateDoc(doc(firestore, 'leads', leadId), updates);
  }

  async transferStock(productId: string, stateId: string, quantity: number) {
    const product = this.data.products.find(p => p.id === productId);
    if (product && product.totalStock >= quantity) {
      const newTotal = product.totalStock - quantity;
      const newStateQty = (product.stockPerState[stateId] || 0) + quantity;
      
      await updateDoc(doc(firestore, 'products', productId), {
        totalStock: newTotal,
        [`stockPerState.${stateId}`]: newStateQty
      });
      return true;
    }
    return false;
  }

  async restockStateHub(productId: string, stateId: string, quantity: number) {
    const product = this.data.products.find(p => p.id === productId);
    if (product) {
      const newQty = (product.stockPerState[stateId] || 0) + quantity;
      await updateDoc(doc(firestore, 'products', productId), {
        [`stockPerState.${stateId}`]: newQty
      });
    }
  }

  async clearAllData() {
    // Danger: This only works if you have permission to delete everything
    // Use the Firebase Console for bulk deletions in production
    console.warn("Bulk clear requested. Please use Firebase Console for safety.");
  }
}

export const db = new FirebaseDb();
