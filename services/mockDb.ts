import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, doc, setDoc, getDoc, getDocs, 
  updateDoc, onSnapshot, Unsubscribe, query, limit 
} from 'firebase/firestore';
import { 
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, 
  signOut, onAuthStateChanged 
} from 'firebase/auth';
import { 
  Product, State, LogisticsPartner, Order, User, UserRole, 
  DeliveryStatus, OrderForm, WebLead, LeadStatus 
} from '../types';

// Real Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDjIST5wP--TJhSxmbDqvgTSHUUFeMJVwE",
  authDomain: "magiracrm.firebaseapp.com",
  projectId: "magiracrm",
  storageBucket: "magiracrm.firebasestorage.app",
  messagingSenderId: "960782141874",
  appId: "1:960782141874:web:c8ba969930b2b5dd0b7cab",
  measurementId: "G-CC1R1BDWTJ"
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
  private unsubscribers: Unsubscribe[] = [];

  constructor() {
    this.initAuth();
  }

  private initAuth() {
    onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const userDoc = await getDoc(doc(firestore, 'users', fbUser.uid));
          if (userDoc.exists()) {
            this.currentUser = { id: fbUser.uid, ...userDoc.data() } as User;
            this.initRealtimeSync();
          } else {
            this.currentUser = null;
            this.stopRealtimeSync();
          }
        } catch (err) {
          console.error("Auth doc fetch error:", err);
          this.currentUser = null;
          this.stopRealtimeSync();
        }
      } else {
        this.currentUser = null;
        this.stopRealtimeSync();
      }
      this.notify();
    });
  }

  private initRealtimeSync() {
    this.stopRealtimeSync();
    if (!this.currentUser) return;

    const isAdmin = this.currentUser.role === UserRole.ADMIN;
    const collectionsToSync = ['products', 'states', 'logistics', 'orders', 'forms', 'leads'];
    
    if (isAdmin) {
      collectionsToSync.push('users');
    } else {
      const unsubOwnProfile = onSnapshot(doc(firestore, 'users', this.currentUser.id), (snapshot) => {
        if (snapshot.exists()) {
          this.currentUser = { id: snapshot.id, ...snapshot.data() } as User;
          this.notify();
        }
      });
      this.unsubscribers.push(unsubOwnProfile);
    }

    collectionsToSync.forEach(colName => {
      const unsub = onSnapshot(
        collection(firestore, colName), 
        (snapshot) => {
          this.data[colName as keyof typeof this.data] = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data()
          })) as any;
          this.notify();
        },
        (error) => {
          if (!error.message.includes('permission-denied')) {
            console.warn(`Firestore sync error on ${colName}:`, error.message);
          }
        }
      );
      this.unsubscribers.push(unsub);
    });
  }

  private stopRealtimeSync() {
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
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

  async register(name: string, email: string, password: string, requestedRole: UserRole) {
    // Check if any users exist in the system
    const userQuery = query(collection(firestore, 'users'), limit(1));
    const userSnapshot = await getDocs(userQuery);
    const isFirstUser = userSnapshot.empty;

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;
    
    // If it's the first user, force them to be an Admin
    const finalRole = isFirstUser ? UserRole.ADMIN : requestedRole;
    const finalStatus = isFirstUser ? 'approved' : 'pending';

    const userData: Partial<User> = {
      name,
      email,
      role: finalRole,
      status: finalStatus as any,
      isApproved: finalStatus === 'approved',
      registeredAt: new Date().toISOString()
    };

    await setDoc(doc(firestore, 'users', uid), userData);
    
    const newUser = { id: uid, ...userData } as User;
    if (isFirstUser) {
        this.currentUser = newUser;
        this.notify();
    }
    return newUser;
  }

  async login(email: string, password?: string) {
    if (!password) throw new Error("Password required");
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getDoc(doc(firestore, 'users', userCredential.user.uid));
    
    if (!userDoc.exists()) throw new Error("Profile missing from database");
    const profile = userDoc.data() as User;
    
    if (profile.status === 'pending') throw new Error("Account pending approval");
    if (profile.status === 'rejected') throw new Error("Account access denied");
    
    return { id: userCredential.user.uid, ...profile } as User;
  }

  async logout() {
    this.stopRealtimeSync();
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
    if (extra?.reminderEnabled !== undefined) updates.reminderEnabled = extra.reminderEnabled;
    
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
    console.warn("Manual data purge requested.");
  }
}

export const db = new FirebaseDb();