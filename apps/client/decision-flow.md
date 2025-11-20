# Frontend Architecture: Decision Flow

## Overview

The frontend is a **Next.js 16** application using the **App Router** with minimal dependencies and complexity. It follows the principle of **using the simplest solution that works**.

---

## Why This Structure?

### Project Structure

```
client/
├── app/                    # Next.js App Router (Pages & Layouts)
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Home page (single component)
│   ├── providers.tsx      # React Query provider setup
│   └── globals.css        # Global styles (Tailwind)
│
├── lib/                    # Utilities & Services
│   └── api.ts             # API client (Axios + endpoints)
│
└── public/                 # Static assets
```

---

## Architectural Decisions

### 1. Why Next.js (Not Create React App / Vite)?

**Chosen:** Next.js 16

**Decision Factors:**

**Production-Ready Out of the Box:**
- Built-in routing (file-based)
- Automatic code splitting
- Image optimization
- API routes (if needed later)
- SEO optimization
- Zero config

**Developer Experience:**
- Fast Refresh (HMR)
- TypeScript support
- Built-in CSS support
- Great error messages

**Performance:**
- Automatic bundle optimization
- Route prefetching
- Lazy loading

**Alternatives Considered:**

**Create React App:**
- ❌ Deprecated/not maintained
- ❌ Requires manual setup (routing, build optimization)
- ❌ Slower builds

**Vite:**
- ✅ Extremely fast dev server
- ❌ Requires manual routing setup (React Router)
- ❌ No file-based routing
- ❌ Less production-ready features

**Conclusion:** Next.js provides the best balance of DX and production features.

---

### 2. Why App Router (Not Pages Router)?

**Chosen:** App Router (`app/` directory)

**Reasons:**

**Modern Pattern:**
- Latest Next.js architecture
- Future of Next.js
- Server Components by default
- Better data fetching patterns

**File-Based Routing:**
```
app/page.tsx       → /
app/convert/page.tsx  → /convert (if we add it)
app/settings/page.tsx → /settings (if we add it)
```

**Layouts:**
- Shared layouts across routes
- Nested layouts support
- Providers isolation

**vs Pages Router:**
- Pages Router is legacy (still supported)
- App Router is where Next.js is investing
- Easier migration path for future features

**Current Usage:**
- We only have one route (`/`)
- But App Router provides better structure if we expand

---

### 3. Why Single Component (Not Split)?

**Decision:** All UI in `app/page.tsx` (174 lines)

**Reasons:**

**Simple Application:**
```typescript
// Current app has:
- 1 form (file key + token inputs)
- 1 conversion button
- 1 tab switcher (preview/code)
- 1 preview pane
- 1 code display
```

**No Reusability Needed:**
- Form is used once
- Preview is used once
- No component is reused elsewhere

**Tight Coupling:**
- Form and preview share state
- Tab switcher affects preview
- All features are interdependent

**Premature Abstraction:**
```typescript
// ❌ Over-engineered (what we avoided):
<ConversionPage>
  <ConversionForm />
  <ResultsPanel>
    <TabSwitcher />
    <PreviewPane />
    <CodeDisplay />
  </ResultsPanel>
</ConversionPage>

// ✅ Simple (what we have):
<Home>
  {/* Everything in one component */}
</Home>
```

**When to Split:**
- Component exceeds ~300 lines
- Reusable pieces emerge
- Multiple pages need same components
- Testing becomes difficult

**Current:** 174 lines = easy to understand in one file

---

### 4. Why Tailwind CSS (Not CSS Modules / Styled Components)?

**Chosen:** Tailwind CSS v4

**Reasons:**

**Fast Development:**
```tsx
// No CSS files needed
<button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
  Convert
</button>
```

**Consistent Design System:**
- Predefined spacing (px-4, py-2, gap-4)
- Color palette (blue-600, gray-900)
- Responsive utilities (md:flex-row)
- No "magic numbers"

**Small Production Bundle:**
- Unused styles are purged
- Final CSS is minimal

**No Naming Fatigue:**
- No need to name classes
- No BEM conventions
- No file switching

**Alternatives:**

**CSS Modules:**
```tsx
// More boilerplate
import styles from './Button.module.css';
<button className={styles.button}>
```
- ❌ Separate files
- ❌ Naming required
- ✅ Scoped styles

**Styled Components:**
```tsx
// Runtime overhead
const Button = styled.button`
  padding: 24px;
  background: blue;
`;
```
- ❌ Runtime CSS-in-JS cost
- ❌ SSR complexity
- ✅ Dynamic styles

**Plain CSS:**
- ❌ Global namespace
- ❌ Specificity issues
- ❌ No design system

**Conclusion:** Tailwind is fastest for prototyping with consistent results.

---

### 5. Why TanStack Query (For Server State)?

**Chosen:** TanStack Query (React Query)

**Purpose:** Handle API requests and server state

**What It Provides:**

```typescript
const mutation = useMutation({
  mutationFn: (data) => convertFigma(data.fileKey, data.token),
  onSuccess: (data) => {
    setHtml(data.html);
    setCss(data.css);
  },
});

// Automatic states:
mutation.isPending  // Loading state
mutation.isError    // Error state
mutation.error      // Error object
```

**Why Not Plain `fetch`/`axios`?**

**Without TanStack Query:**
```typescript
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState(null);

const handleSubmit = async () => {
  setIsLoading(true);
  setError(null);
  try {
    const data = await convertFigma(fileKey, token);
    setHtml(data.html);
    setCss(data.css);
  } catch (err) {
    setError(err);
  } finally {
    setIsLoading(false);
  }
};
```

**With TanStack Query:**
```typescript
const mutation = useMutation({
  mutationFn: (data) => convertFigma(data.fileKey, data.token),
  onSuccess: (data) => {
    setHtml(data.html);
    setCss(data.css);
  },
});

// Done. States handled automatically.
```

**Benefits:**
- ✅ Less boilerplate
- ✅ Automatic loading/error states
- ✅ Request deduplication
- ✅ Automatic retries (configurable)
- ✅ Stale-while-revalidate patterns
- ✅ DevTools for debugging

**Is It Overkill?**
- For a single API call? Slightly.
- But the DX improvement is worth 13KB
- Industry standard for React server state

---

### 6. Why Axios (Not Fetch)?

**Chosen:** Axios for HTTP client

**File:** `lib/api.ts`

```typescript
const api = axios.create({
  baseURL: 'http://localhost:3000',
});

export const convertFigma = async (fileKey: string, token: string) => {
  const response = await api.post('/figma/convert', { fileKey, token });
  return response.data;
};
```

**Axios vs Fetch:**

| Feature | Axios | Fetch |
|---------|-------|-------|
| **JSON parsing** | Automatic | Manual `.json()` |
| **Error handling** | Rejects on 4xx/5xx | Only rejects on network error |
| **Request/Response interceptors** | ✅ Built-in | ❌ Manual |
| **Timeout support** | ✅ Built-in | ❌ Manual AbortController |
| **Base URL** | ✅ `axios.create()` | ❌ Manual |
| **TypeScript** | ✅ Great | ✅ Good |

**Example Difference:**

**Fetch:**
```typescript
const response = await fetch('http://localhost:3000/figma/convert', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ fileKey, token }),
});

if (!response.ok) {
  throw new Error('Request failed');
}

const data = await response.json();
return data;
```

**Axios:**
```typescript
const response = await api.post('/figma/convert', { fileKey, token });
return response.data;
```

**Conclusion:** Axios saves boilerplate and provides better DX.

---

### 7. Why `lib/` Directory (Separation of Concerns)?

**Structure:**
```
lib/
└── api.ts    # API client and endpoints
```

**Purpose:** Isolate API logic from UI components

**Benefits:**

**1. Single Source of Truth:**
```typescript
// All API endpoints in one place
export const convertFigma = async (...) => { ... };
export const uploadFile = async (...) => { ... };  // Future
export const getHistory = async (...) => { ... };  // Future
```

**2. Easy to Mock:**
```typescript
// In tests
jest.mock('../lib/api', () => ({
  convertFigma: jest.fn().mockResolvedValue({ html: '...', css: '...' })
}));
```

**3. Easy to Change:**
- Switch from Axios to Fetch? Change one file.
- Change backend URL? Change one line.
- Add authentication? Add interceptor in one place.

**4. Type Safety:**
```typescript
// Centralized types
export const convertFigma = async (
  fileKey: string, 
  token: string
): Promise<{ html: string; css: string }> => { ... };
```

**Alternative (Inline API calls):**
```tsx
// ❌ Scattered throughout component
const handleSubmit = async () => {
  const response = await axios.post('http://localhost:3000/figma/convert', {
    fileKey,
    token
  });
  // Hard to test, hard to change, duplicated logic
};
```

---

### 8. Why `providers.tsx` (Not Inline in Layout)?

**File:** `app/providers.tsx`

```typescript
export default function Providers({ children }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

**Reasons:**

**1. Client Component Isolation:**
- `layout.tsx` can be Server Component (default)
- Only `providers.tsx` is Client Component (`'use client'`)
- Better performance (less client-side JS)

**2. Separation of Concerns:**
- Layout handles structure
- Providers handle state management setup

**3. Easier to Extend:**
```typescript
// Future: Add more providers
<QueryClientProvider>
  <ThemeProvider>
    <AuthProvider>
      {children}
    </AuthProvider>
  </ThemeProvider>
</QueryClientProvider>
```

**4. Follows Next.js Best Practices:**
- Recommended in Next.js docs
- Standard pattern in App Router

---

## File Structure Philosophy

### Flat Structure (Not Deeply Nested)

**Current:**
```
app/
  page.tsx
  layout.tsx
  providers.tsx
lib/
  api.ts
```

**Why Not:**
```
app/
  components/
    forms/
      ConversionForm/
        index.tsx
        styles.module.css
        ConversionForm.test.tsx
    preview/
      PreviewPane/
        index.tsx
        ...
```

**Reasons:**

**1. Simple App = Simple Structure**
- One page = one component
- No need for deep nesting

**2. Easy Navigation**
- Everything is 1-2 levels deep
- No "where is this file?" questions

**3. Scales When Needed**
- When we add more pages/components
- We'll create structure then (not prematurely)

**4. YAGNI Principle**
- Don't create folders until you need them
- Don't abstract until you have 3+ similar things

---

## Technology Stack Justification

| Technology | Size | Purpose | Justified? |
|-----------|------|---------|------------|
| **Next.js** | Framework | React framework + routing | ✅ Essential |
| **React** | Framework | UI library | ✅ Essential |
| **TypeScript** | 0KB (compile-time) | Type safety | ✅ Essential |
| **Tailwind CSS** | ~5KB (purged) | Styling | ✅ High value |
| **TanStack Query** | 13KB | Server state | ✅ Good DX |
| **Axios** | 13KB | HTTP client | ✅ Saves boilerplate |
| **~~Zustand~~** | ~~3KB~~ | ~~State management~~ | ❌ Removed (unnecessary) |

**Total Bundle:** ~30KB of dependencies (reasonable)

---

## Key Architectural Principles

### 1. **Simplicity First**
- Use built-in solutions when possible
- Don't add libraries "just in case"
- One component until you need more

### 2. **Separation of Concerns**
- UI (`app/page.tsx`)
- API logic (`lib/api.ts`)
- State providers (`app/providers.tsx`)

### 3. **Type Safety**
- TypeScript everywhere
- API responses typed
- Component props typed

### 4. **Modern Patterns**
- App Router (not Pages Router)
- Server Components where possible
- File-based routing

### 5. **Developer Experience**
- Fast refresh
- Type checking
- Tailwind for rapid UI
- TanStack Query for easy async

---

## When to Refactor

### Signals to Split Components:
- File exceeds 300 lines
- Component is reused 2+ times
- Testing becomes difficult
- Multiple developers need to edit same file

### Signals to Add State Management:
- 3+ levels of prop drilling
- Multiple pages share state
- Need state persistence

### Signals to Add Routing:
- Need multiple pages (e.g., /convert, /history, /settings)

**Current Status:** None of these signals present → keep it simple.

---

**Philosophy:** The best architecture is the one you don't notice. Start simple, add complexity when you feel the pain.

---

## Key Architectural Decision: State Management

### Decision: Use React `useState` (Not Zustand/Redux)

**Date:** Current architecture
**Context:** Single-page application with form inputs and conversion results

---

## The Decision

**Chosen:** React built-in `useState` hooks

**Rejected:** 
- Zustand
- Redux/Redux Toolkit
- MobX
- Jotai/Recoil

---

## Reasoning

### Why `useState` Is Sufficient

#### 1. **Single Component Architecture**
```typescript
// All state is used in page.tsx only
export default function Home() {
  const [fileKey, setFileKey] = useState('');
  const [token, setToken] = useState('');
  const [html, setHtml] = useState('');
  const [css, setCss] = useState('');
  // No prop drilling, no component tree
}
```

**Facts:**
- Only one page component (`app/page.tsx`)
- No state sharing between components
- No component hierarchy requiring prop drilling
- Local state is perfectly adequate

---

#### 2. **Simple State Updates**
```typescript
// Straightforward state mutations
setFileKey(e.target.value);      // String assignment
setHtml(data.html);               // API response
setCss(data.css);                 // API response
```

**Characteristics:**
- All state is primitives (strings)
- No complex state derivation
- No computed values
- No state interdependencies
- No state normalization needed

---

#### 3. **No Cross-Component Communication**
```
Current Structure:
  app/page.tsx (all UI in one component)

NOT:
  <Header fileKey={fileKey} />
  <Form onSubmit={...} />
  <Preview html={html} css={css} />
  <Sidebar history={...} />
```

**Reality:**
- No component tree to manage
- No need for "lifting state up"
- No context provider needed
- No global state access

---

#### 4. **Easy to Refactor Later**

**If we need to split components:**

**Step 1:** Components still in same file
```typescript
// Still use local state, pass as props
function ConversionForm({ fileKey, setFileKey, onSubmit }) { ... }
function PreviewPanel({ html, css }) { ... }
```

**Step 2:** If prop drilling becomes painful (5+ levels deep)
```typescript
// Add Zustand in ~5 minutes
export const useFigmaStore = create((set) => ({
  fileKey: '',
  setFileKey: (key) => set({ fileKey: key })
}));
```

**Cost:** 5 minutes of refactoring, zero risk

---

## What We Avoided

### Zustand (Previously Used, Now Removed)

**Why We Removed It:**

```typescript
// Before (with Zustand):
// store/useFigmaStore.ts (20 lines)
export const useFigmaStore = create<FigmaState>((set) => ({
  fileKey: '',
  token: '',
  html: '',
  css: '',
  setFileKey: (key) => set({ fileKey: key }),
  setToken: (token) => set({ token }),
  setResult: (html, css) => set({ html, css }),
}));

// Usage in page.tsx
const { fileKey, token, html, css, setFileKey, setToken, setResult } = useFigmaStore();

// After (with useState):
const [fileKey, setFileKey] = useState('');
const [token, setToken] = useState('');
const [html, setHtml] = useState('');
const [css, setCss] = useState('');
```


## When We WOULD Use State Management Libraries

### Zustand Would Be Valuable If:

**Scenario 1: Multiple Pages**
```typescript
// If we had:
/convert      → needs fileKey, token
/history      → needs conversions[]
/settings     → needs userPreferences
/dashboard    → needs all of the above
```

**Scenario 2: State Persistence**
```typescript
// If we wanted localStorage
import { persist } from 'zustand/middleware';

export const useFigmaStore = create(
  persist(
    (set) => ({ fileKey: '', setFileKey: ... }),
    { name: 'figma-storage' }
  )
);
```

**Scenario 3: Component Splitting**
```typescript
// If we split into 10+ components
<ConversionForm />
  <FileKeyInput />
  <TokenInput />
  <SubmitButton />
<ResultsPanel />
  <TabSwitcher />
  <PreviewPane />
  <CodeView />
    <HTMLEditor />
    <CSSEditor />
```

**Scenario 4: Complex Features**
- Conversion history with undo/redo
- Real-time collaboration
- Multiple file conversions
- Workspace management

---

## Asymmetry with Backend Architecture

### Key Insight: Frontend vs Backend Refactoring Cost

**Backend (NestJS):**
```typescript
// Moving from monolithic controller to Clean Architecture
// Cost: 2-3 days, high risk, touches every file
// Decision: Use Clean Architecture from Day 1 ✅
```

**Frontend (React):**
```typescript
// Moving from useState to Zustand
// Cost: 5 minutes, zero risk, change one file
// Decision: Use simplest solution now, refactor if needed ✅
```

**Why Different?**

| Aspect | Backend | Frontend |
|--------|---------|----------|
| **Coupling** | Tight (DB, APIs, DI) | Loose (components) |
| **Refactor cost** | Very high | Very low |
| **Runtime errors** | Production only | Compile-time (TS) |
| **Testing impact** | Breaks all tests | Minimal impact |
| **Decision point** | Design upfront | Add when needed |

**Philosophy:**
- Backend: Hard to change → design carefully upfront
- Frontend: Easy to change → use simplest solution, iterate

---

## Current State Management Strategy

### React `useState` for Component State

```typescript
// Form inputs
const [fileKey, setFileKey] = useState('');
const [token, setToken] = useState('');

// Conversion results
const [html, setHtml] = useState('');
const [css, setCss] = useState('');

// UI state
const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
```

**Scope:** Single component (`page.tsx`)

---

### TanStack Query for Server State

```typescript
const mutation = useMutation({
  mutationFn: (data) => convertFigma(data.fileKey, data.token),
  onSuccess: (data) => {
    setHtml(data.html);
    setCss(data.css);
  },
});
```

**Handles:**
- Loading states (`mutation.isPending`)
- Error handling (`mutation.isError`, `mutation.error`)
- Request lifecycle
- Automatic retries

**Why TanStack Query?**
- Server state is different from client state
- Async operations need special handling
- Built-in loading/error states
- Industry standard for server state

---

## Migration Path (If Needed)

### From `useState` to Zustand

**When to migrate:**
- Component splits into 5+ child components
- Prop drilling becomes painful (3+ levels)
- Need state persistence
- Add multiple routes

**How to migrate:**

**Step 1: Install Zustand**
```bash
npm install zustand
```

**Step 2: Create store**
```typescript
// store/useFigmaStore.ts
import { create } from 'zustand';

export const useFigmaStore = create((set) => ({
  fileKey: '',
  token: '',
  html: '',
  css: '',
  setFileKey: (key: string) => set({ fileKey: key }),
  setToken: (token: string) => set({ token }),
  setResult: (html: string, css: string) => set({ html, css }),
}));
```

**Step 3: Replace in component**
```typescript
// Before
const [fileKey, setFileKey] = useState('');

// After
const { fileKey, setFileKey } = useFigmaStore();
```

**Time:** ~10 minutes
**Risk:** Zero (TypeScript catches everything)

---

## Comparison with Backend Decision

### Backend: Clean Architecture (Day 1)

**Why:** Refactoring later is expensive
- Deep coupling with DB, APIs, business logic
- Complex dependency injection
- Integration tests need rewriting
- High risk of breaking production

**Cost of doing later:** 2-3 days + high risk
**Cost of doing now:** Same time, zero legacy issues

**Decision:** ✅ Do it upfront

---

### Frontend: State Management (When Needed)

**Why:** Refactoring later is cheap
- Components are loosely coupled
- No complex DI
- Tests mostly unaffected
- Zero risk (compile-time errors)

**Cost of doing later:** 10 minutes
**Cost of doing now:** Same time + unnecessary complexity now

**Decision:** ✅ Wait until needed

---

## Key Takeaways

1. **Use the simplest solution** - `useState` is perfect for single-component apps
2. **Don't over-engineer** - State management libraries are for multi-component apps
3. **Easy to refactor** - Frontend state can be migrated in minutes
4. **Asymmetric with backend** - Backend requires upfront architecture, frontend doesn't
5. **TanStack Query handles server state** - Don't confuse server state with client state

**Golden Rule:** Add abstractions when you feel the pain, not in anticipation of it.

---

## Current Architecture Summary

```
Client State:    useState (4 strings)
Server State:    TanStack Query (async operations)
UI State:        useState (tab selection)
Persistence:     None (stateless)
Complexity:      Minimal (appropriate for scale)
```

**Philosophy:** Simple now, scale when needed. React makes frontend refactoring cheap.

