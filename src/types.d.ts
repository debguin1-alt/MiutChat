/**
 * MIUT — TypeScript ambient declarations (src/types.d.ts)
 * Used with tsconfig.json checkJs mode — provides type safety
 * for the plain JS source without requiring a compile step.
 */

// ── Core state types ──────────────────────────────────────────────────────────

export interface UserState {
  id: string;
  name: string;
  color: string;
  joinedAt: number;
  role?: 'admin' | 'member';
  approved?: boolean;
}

export interface AppPrefs {
  sound: boolean;
  animations: boolean;
  approvalRequired: boolean;
}

export interface AppState {
  me: UserState | null;
  roomCode: string | null;
  prefs: AppPrefs;
}

// ── Message types ─────────────────────────────────────────────────────────────

export type MsgType = 'text' | 'image' | 'video' | 'file' | 'chunk' | 'system';

export interface ReplyRef {
  senderName: string;
  enc: string;
  docId: string;
  mediaType?: 'image' | 'video' | 'file' | null;
  fileName?: string | null;
}

export interface MsgData {
  type: MsgType;
  enc?: string;
  senderId?: string;
  senderName?: string;
  senderColor?: string;
  ts?: number;
  createdAt?: unknown;          // Firestore Timestamp
  sig?: string;
  edited?: boolean;
  editedAt?: unknown;
  reactions?: Record<string, Record<string, string>>;
  readBy?: Record<string, number>;
  replyTo?: ReplyRef;
  encData?: string;
  mime?: string;
  fileName?: string;
  fileSize?: number;
  groupId?: string;
  chunkIdx?: number;
  chunkOf?: number;
}

// ── Security types ────────────────────────────────────────────────────────────

export interface SubstTable {
  fwd: Uint8Array;
  rev: Uint8Array;
}

export interface WrongCodeState {
  wrongCount: number;
  lockedUntil: number;
}

export interface RateLimitState {
  tokens: number;
  lastRefill: number;
}

export interface ErrorInfo {
  title: string;
  detail: string;
  icon: string;
  type: 'network' | 'auth' | 'quota' | 'permission' | 'notfound' | 'unknown';
}

// ── LRU map type ──────────────────────────────────────────────────────────────

export interface LruMap<K, V> {
  has(key: K): boolean;
  get(key: K): V | undefined;
  set(key: K, value: V): void;
}

// ── Firebase ambient (compat SDK — loaded via script tag) ─────────────────────

declare const firebase: {
  app(name?: string): FirebaseApp;
  auth(app?: FirebaseApp): FirebaseAuth;
  firestore(app?: FirebaseApp): Firestore;
  firestore: {
    FieldValue: { serverTimestamp(): unknown };
    Timestamp: { fromMillis(ms: number): unknown };
  };
};

interface FirebaseApp { name: string; }
interface FirebaseAuth {
  onAuthStateChanged(cb: (u: { uid: string } | null) => void, err?: (e: Error) => void): () => void;
  signInAnonymously(): Promise<{ user: { uid: string } }>;
}
interface Firestore {
  collection(path: string): CollectionRef;
  batch(): WriteBatch;
  runTransaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T>;
}
interface CollectionRef {
  doc(id: string): DocumentRef;
  where(field: string, op: string, value: unknown): Query;
  orderBy(field: string, dir?: string): Query;
  add(data: object): Promise<DocumentRef>;
  get(): Promise<QuerySnapshot>;
}
interface DocumentRef {
  collection(path: string): CollectionRef;
  get(): Promise<DocumentSnapshot>;
  set(data: object, opts?: object): Promise<void>;
  update(data: object): Promise<void>;
  delete(): Promise<void>;
  onSnapshot(cb: (snap: DocumentSnapshot) => void, err?: () => void): () => void;
}
interface Query {
  where(field: string, op: string, value: unknown): Query;
  orderBy(field: string, dir?: string): Query;
  limit(n: number): Query;
  startAfter(doc: DocumentSnapshot): Query;
  get(): Promise<QuerySnapshot>;
  onSnapshot(cb: (snap: QuerySnapshot) => void, err?: () => void): () => void;
}
interface DocumentSnapshot {
  id: string;
  exists: boolean;
  ref: DocumentRef;
  data(): Record<string, unknown> | undefined;
}
interface QuerySnapshot {
  empty: boolean;
  size: number;
  docs: DocumentSnapshot[];
  forEach(cb: (doc: DocumentSnapshot) => void): void;
  docChanges(): Array<{ type: 'added'|'modified'|'removed'; doc: DocumentSnapshot }>;
}
interface WriteBatch {
  update(ref: DocumentRef, data: object): WriteBatch;
  delete(ref: DocumentRef): WriteBatch;
  commit(): Promise<void>;
}
interface Transaction {
  get(ref: DocumentRef): Promise<DocumentSnapshot>;
  update(ref: DocumentRef, data: object): void;
  set(ref: DocumentRef, data: object): void;
  delete(ref: DocumentRef): void;
  }
