# Domain Layer: Decision Flow & Architecture

## Layer Purpose

The **Domain Layer** is the core of our application. It defines the **business entities** and **domain concepts** without any dependencies on frameworks, libraries, or external systems.

**Core Responsibility:** Define the shape of our business data and domain rules in pure TypeScript.

---

## Files in This Layer

### `figma.types.ts`

**Purpose:** TypeScript interfaces that model the Figma design structure

---

## File Analysis: `figma.types.ts`

### Fundamental Design Decision: Interfaces vs Classes

```typescript
export interface FigmaNode { ... }
export interface Paint { ... }
export interface Effect { ... }
// etc.
```

**Why Interfaces Instead of Classes?**

### Reason 1: **Data Comes from JSON**
```typescript
// External API returns JSON
const response = await axios.get('https://api.figma.com/...');
const document = response.data.document; // Plain JavaScript object

// With interfaces: Zero conversion needed
const node: FigmaNode = document; ✅

// With classes: Would need to instantiate
const node = new FigmaNodeClass(document); ❌ Overhead
```

**Benefits:**
- No runtime overhead (interfaces are compile-time only)
- No need for serialization/deserialization
- JSON directly type-checks against interface

### Reason 2: **No Behavior Needed**
```typescript
// We don't need methods on these entities
interface FigmaNode {
  id: string;
  name: string;
  // Just data, no behavior
}

// If we needed behavior, we'd use classes:
class FigmaNode {
  render() { ... }  // Methods would go here
  validate() { ... }
}
```

**Our Case:**
- Nodes are **data structures**, not **active objects**
- Behavior lives in **Services** (Application layer)
- Pure data separation

### Reason 3: **Zero Runtime Overhead**
```typescript
// Interface: Compiled away (0 bytes in JavaScript)
interface FigmaNode { id: string; }

// Class: Exists at runtime (generates JavaScript code)
class FigmaNode { 
  constructor(public id: string) {} 
}
```

**Size Impact:**
- Interfaces: 0 KB in production bundle
- Classes: Adds KB for every class definition

### Reason 4: **Easier to Extend**
```typescript
// Easy to extend interfaces
interface ExtendedNode extends FigmaNode {
  customProperty: string;
}

// Multiple inheritance (interfaces only)
interface MixedNode extends FigmaNode, OtherType {}
```

---

## Entity Analysis

### Core Entity: `FigmaNode`

```typescript
export interface FigmaNode {
  // Identity
  id: string;
  name: string;
  type: 'DOCUMENT' | 'CANVAS' | 'FRAME' | 'TEXT' | ...;
  
  // Hierarchy
  children?: FigmaNode[];
  
  // Layout
  absoluteBoundingBox?: { x: number; y: number; width: number; height: number };
  
  // Appearance
  fills?: Paint[];
  strokes?: Paint[];
  effects?: Effect[];
  
  // Typography
  characters?: string;
  style?: TypeStyle;
  
  // Auto Layout
  layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
  itemSpacing?: number;
  paddingLeft?: number;
  // ... more padding properties
  
  // Styling
  opacity?: number;
  visible?: boolean;
  cornerRadius?: number;
  rectangleCornerRadii?: number[];
}
```

### Design Decisions for FigmaNode

#### 1. **Union Type for Node Types**
```typescript
type: 'DOCUMENT' | 'CANVAS' | 'FRAME' | 'GROUP' | 'VECTOR' | ... | 'TEXT' | 'COMPONENT'
```

**Why Union of Strings (Not Enum)?**

**Option A: String Union (Current)**
```typescript
type: 'FRAME' | 'TEXT'
```

**Option B: Enum**
```typescript
enum NodeType {
  FRAME = 'FRAME',
  TEXT = 'TEXT'
}
type: NodeType
```

**Why String Union Wins:**
- ✅ Direct mapping to Figma API (API returns strings)
- ✅ No import needed (can use inline)
- ✅ No enum namespace pollution
- ✅ Better for JSON serialization
- ❌ No reverse lookup (not needed here)

**Trade-off:** If we needed to iterate over all types, enum would be better. But we just check individual values.

---

#### 2. **Optional Properties with `?`**
```typescript
children?: FigmaNode[];
absoluteBoundingBox?: { x: number; y: number; width: number; height: number };
```

**Why Optional?**
- Not all nodes have children (TEXT nodes are leaves)
- Not all nodes have bounding boxes (DOCUMENT, CANVAS are abstract)
- Mirrors Figma API response (properties are conditionally present)

**Alternative Considered: Required + Null**
```typescript
children: FigmaNode[] | null;
```

**Why Optional (`?`) Is Better:**
```typescript
// With optional
if (node.children) { ... } ✅ Clean

// With null
if (node.children !== null && node.children !== undefined) { ... } ❌ Verbose
```

TypeScript's optional chaining works naturally:
```typescript
node.children?.forEach(...)
```

---

#### 3. **Recursive Type Definition**
```typescript
export interface FigmaNode {
  children?: FigmaNode[]; // References itself
}
```

**Why Recursive?**
- Figma node tree is naturally recursive (tree structure)
- Each node can contain nodes of the same type
- Enables infinite nesting

**Example Structure:**
```typescript
{
  type: 'FRAME',
  children: [
    {
      type: 'FRAME',
      children: [
        { type: 'TEXT', characters: 'Hello' }
      ]
    }
  ]
}
```

**TypeScript handles this natively** (no special syntax needed)

---

#### 4. **Inline Object Types vs Named Types**

**Inline (Current for BoundingBox):**
```typescript
absoluteBoundingBox?: { x: number; y: number; width: number; height: number };
```

**Named (Used for Paint, Effect):**
```typescript
fills?: Paint[];
```

**Decision Criteria:**

**Use Inline When:**
- Simple structure (few properties)
- Used in only one place
- Not referenced by other types

**Use Named Interface When:**
- Complex structure (many properties)
- Reused in multiple places
- Needs to be referenced/exported

**BoundingBox could be extracted:**
```typescript
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

absoluteBoundingBox?: BoundingBox;
```

**Trade-off:**
- Current: Simpler (one less type to remember)
- Named: Better for reuse (if we need Rectangle type elsewhere)

---

### Entity: `Paint` (Fills & Strokes)

```typescript
export interface Paint {
  type: 'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'IMAGE';
  color?: Color;
  opacity?: number;
  visible?: boolean;
  
  // Gradient properties
  gradientHandlePositions?: Vector[];
  gradientStops?: ColorStop[];
  
  // Image properties
  scaleMode?: string;
  imageRef?: string;
}
```

### Design Decisions for Paint

#### 1. **Polymorphic Structure**
```typescript
// Paint can be one of multiple types
type: 'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'IMAGE'
```

**Problem:** Different paint types have different properties
- SOLID needs `color`
- GRADIENT needs `gradientHandlePositions`, `gradientStops`
- IMAGE needs `imageRef`

**Current Solution: Single interface with optional properties**
```typescript
interface Paint {
  type: string;
  color?: Color;          // Only for SOLID
  gradientStops?: ...;    // Only for GRADIENT
  imageRef?: string;      // Only for IMAGE
}
```

**Alternative: Discriminated Union**
```typescript
type Paint = 
  | { type: 'SOLID'; color: Color; opacity?: number }
  | { type: 'GRADIENT_LINEAR'; gradientStops: ColorStop[]; ... }
  | { type: 'IMAGE'; imageRef: string; ... };
```

**Trade-offs:**

| Aspect | Current (Optional Props) | Discriminated Union |
|--------|-------------------------|---------------------|
| Simplicity | ✅ One interface | ❌ Multiple types |
| Type Safety | ❌ Can't enforce "SOLID must have color" | ✅ Enforces property requirements |
| JSON Mapping | ✅ Direct from API | ✅ Same |
| Usage | `if (paint.type === 'SOLID')` | Same, but with type narrowing |

**Why Current Approach:**
- Simpler to work with JSON
- Figma API returns this structure
- We validate at runtime anyway (checking type before accessing properties)

**When to Switch:**
- If we need stronger compile-time guarantees
- If we're generating these objects (not just consuming)
- If bugs arise from accessing wrong properties

---

#### 2. **Visibility Flag**
```typescript
visible?: boolean;
```

**Purpose:** Layer can be hidden in Figma
- `visible: false` → Don't render
- `visible: true` or `undefined` → Render

**Default Value Consideration:**
```typescript
// In application code
if (paint.visible === false) {
  // Skip this paint
}
```

**Why Not:**
```typescript
if (!paint.visible) // ❌ Would skip when undefined
```

**Boolean vs Optional Boolean:**
- `visible: boolean` → Always present (true/false)
- `visible?: boolean` → May be absent (undefined = default to true)

**Current Choice:** Optional boolean matches Figma API (absent = visible)

---

### Entity: `Color`

```typescript
export interface Color {
  r: number;  // 0.0 to 1.0
  g: number;  // 0.0 to 1.0
  b: number;  // 0.0 to 1.0
  a: number;  // 0.0 to 1.0
}
```

### Design Decisions for Color

#### **Normalized Range (0.0 - 1.0)**

**Figma Format:**
```typescript
{ r: 0.5, g: 0.25, b: 1.0, a: 0.8 }
```

**CSS Format:**
```css
rgba(128, 64, 255, 0.8)  /* 0-255 for RGB, 0-1 for alpha */
```

**Why Keep Figma Format in Domain?**
- Domain should represent business concepts, not presentation
- Conversion to CSS is Application layer's job
- If we add PDF export, it might need 0-1 range anyway

**Alternative: Store as CSS Values**
```typescript
interface Color {
  r: number;  // 0-255
  g: number;  // 0-255
  b: number;  // 0-255
  a: number;  // 0-1
}
```

**Why Not:**
- Ties Domain to presentation format (violates separation)
- Figma API returns 0-1, would need conversion at boundary
- 0-1 is more "universal" (OpenGL, PDF also use it)

**Conclusion:** Domain should mirror the source of truth (Figma API)

---

### Entity: `Effect` (Shadows, Blurs)

```typescript
export interface Effect {
  type: 'INNER_SHADOW' | 'DROP_SHADOW' | 'LAYER_BLUR' | 'BACKGROUND_BLUR';
  visible: boolean;
  radius: number;
  color?: Color;
  offset?: Vector;
  spread?: number;
}
```

### Design Decisions for Effect

#### **Different Properties for Different Effect Types**

| Effect Type | Uses | Doesn't Use |
|-------------|------|-------------|
| DROP_SHADOW | offset, radius, spread, color | - |
| INNER_SHADOW | offset, radius, spread, color | - |
| LAYER_BLUR | radius | offset, spread, color |
| BACKGROUND_BLUR | radius | offset, spread, color |

**Current Solution:** All properties optional (like Paint)

**Same Trade-off as Paint:**
- Could use discriminated union for type safety
- Current approach is simpler
- Matches API structure

---

### Entity: `TypeStyle` (Typography)

```typescript
export interface TypeStyle {
  fontFamily: string;
  fontPostScriptName: string;
  fontWeight: number;
  fontSize: number;
  textAlignHorizontal: 'LEFT' | 'RIGHT' | 'CENTER' | 'JUSTIFIED';
  textAlignVertical: 'TOP' | 'CENTER' | 'BOTTOM';
  letterSpacing: number;
  lineHeightPx: number;
  lineHeightPercent: number;
}
```

### Design Decisions for TypeStyle

#### 1. **Dual Line Height Properties**
```typescript
lineHeightPx: number;       // Absolute (e.g., 24px)
lineHeightPercent: number;  // Relative (e.g., 150% = 1.5)
```

**Why Both?**
- Figma can specify line height in two ways
- CSS needs absolute for pixel-perfect
- CSS needs relative for responsive designs

**Application Layer Choice:**
```typescript
// We use absolute (Px) for precision
if (style.lineHeightPx) {
  css.push(`line-height: ${style.lineHeightPx}px;`);
}
```

**Could Use Percent:**
```typescript
if (style.lineHeightPercent) {
  const unitless = style.lineHeightPercent / 100;
  css.push(`line-height: ${unitless};`);
}
```

**Domain Just Provides Both** → Application decides

---

#### 2. **Font PostScript Name**
```typescript
fontPostScriptName: string;
```

**Purpose:** Technical font identifier (e.g., "Inter-Bold")
- `fontFamily`: "Inter" (human-readable)
- `fontPostScriptName`: "Inter-Bold" (system identifier)

**Currently Unused** in our application, but:
- Kept in Domain (represents reality of Figma data)
- Might be useful for font loading in future

---

#### 3. **Text Alignment Unions**
```typescript
textAlignHorizontal: 'LEFT' | 'RIGHT' | 'CENTER' | 'JUSTIFIED';
textAlignVertical: 'TOP' | 'CENTER' | 'BOTTOM';
```

**Maps to CSS:**
```css
text-align: left | right | center | justify;
/* Vertical alignment uses flexbox: align-items */
```

**Why Two Separate Properties?**
- Figma separates horizontal and vertical alignment
- CSS also separates them (`text-align` vs `vertical-align`/flexbox)
- Natural modeling of independent axes

---

### Helper Types

#### `Vector`
```typescript
export interface Vector {
  x: number;
  y: number;
}
```

**Usage:**
- Gradient handle positions
- Effect offsets
- Any 2D point/coordinate

**Why Named Type?**
- Reused in multiple places
- Common concept (deserves a name)
- Easier to refactor (change Vector definition once)

---

#### `ColorStop`
```typescript
export interface ColorStop {
  position: number;  // 0.0 to 1.0
  color: Color;
}
```

**Purpose:** Gradient color stops
```
position: 0.0  → Start (0%)
position: 0.5  → Middle (50%)
position: 1.0  → End (100%)
```

**Why Separate Type?**
- Used in arrays: `Paint.gradientStops: ColorStop[]`
- Pairs position with color (cohesive unit)

---

#### `LayoutConstraint`
```typescript
export interface LayoutConstraint {
  vertical: 'TOP' | 'BOTTOM' | 'CENTER' | 'TOP_BOTTOM' | 'SCALE';
  horizontal: 'LEFT' | 'RIGHT' | 'CENTER' | 'LEFT_RIGHT' | 'SCALE';
}
```

**Purpose:** Figma's constraints system (like Sketch's pinning)

**Currently Unused** in our application
- Figma uses this for responsive behavior
- We don't yet generate responsive CSS
- Kept in Domain for future enhancement

**Future Use Case:**
```typescript
// Generate responsive constraints
if (node.constraints.horizontal === 'LEFT_RIGHT') {
  css.push('left: 0; right: 0;'); // Stretch horizontally
}
```

---

### Result Type: `ConversionResult`

```typescript
export interface ConversionResult {
  html: string;
  css: string;
  name: string;
}
```

**Question:** Does this belong in Domain?

**Arguments For:**
- Represents business concept (conversion output)
- Could be used by multiple Application services

**Arguments Against:**
- Specific to our application (not from Figma)
- More of a "DTO" than a "Domain Entity"
- Could live in Application layer

**Current Decision:** Domain layer
- It's an output Entity of our system
- If we add more export formats (React, Vue), they'd all be "ConversionResult" types

**Alternative Home:** Application layer
```typescript
// application/types/conversion-result.ts
export interface ConversionResult { ... }
```

---

## Dependency Rules

### Domain Layer Dependencies

```
Domain Layer
    ├── depends on → NOTHING ✅
    └── used by → Application
                → Infrastructure
                → Presentation
```

**Critical Rule:** Domain has ZERO dependencies
- No NestJS imports
- No Axios imports
- No class-validator imports
- Only pure TypeScript

**Verification:**
```typescript
// ✅ Good
export interface FigmaNode { ... }

// ❌ BAD - Framework dependency
import { Injectable } from '@nestjs/common';
export interface FigmaNode { ... }
```

---

## Why This Matters: Dependency Inversion

### The Problem Without Domain Layer

```typescript
// Infrastructure returns raw API response
class FigmaApiService {
  getFile(): Promise<any> { ... }  // ❌ any type
}

// Application has to know API structure
class FigmaConverterService {
  convert(data: any) {  // ❌ No type safety
    const node = data.document.children[0];  // Could break
  }
}
```

**Issues:**
- No type safety
- API changes break everything
- Implicit coupling

### The Solution With Domain Layer

```typescript
// Domain defines contract
interface FigmaNode { ... }

// Infrastructure implements contract
class FigmaApiService {
  getFile(): Promise<FigmaNode> { ... }  // ✅ Returns Domain type
}

// Application depends on contract
class FigmaConverterService {
  convert(node: FigmaNode) { ... }  // ✅ Type-safe
}
```

**Benefits:**
- ✅ Type safety
- ✅ Clear contracts
- ✅ API changes isolated to Infrastructure

---

## Evolution Strategy

### Adding New Properties

**Scenario:** Figma adds new property `rotation: number`

**Steps:**
```typescript
// 1. Add to Domain
export interface FigmaNode {
  rotation?: number;  // New property
}

// 2. Infrastructure automatically includes it (JSON mapping)

// 3. Application can use it
private generateStyles(node: FigmaNode) {
  if (node.rotation) {
    styles.push(`transform: rotate(${node.rotation}deg);`);
  }
}
```

**Impact:** Minimal (localized changes)

---

### Removing Properties

**Scenario:** Figma deprecates `strokeAlign`

**Steps:**
```typescript
// 1. Mark as deprecated in Domain
export interface FigmaNode {
  /** @deprecated Use strokeWeight instead */
  strokeAlign?: 'INSIDE' | 'OUTSIDE' | 'CENTER';
}

// 2. Update Application to not use it

// 3. Eventually remove from Domain
```

**TypeScript helps:** Compile errors show where it's used

---

## Testing Strategy

### Domain Layer Testing

**Question:** Do we test interfaces?

**Answer:** No, but yes...

**No Unit Tests for Interfaces:**
```typescript
// Can't test this directly
export interface FigmaNode { ... }
```
- Interfaces have no runtime behavior
- Nothing to execute

**But Test Type Compatibility:**
```typescript
describe('FigmaNode Type', () => {
  it('should accept valid node', () => {
    const node: FigmaNode = {
      id: '1:1',
      name: 'Test',
      type: 'FRAME'
    };
    expect(node.id).toBe('1:1');  // Compiles = type is valid
  });

  it('should require id and name', () => {
    // @ts-expect-error - Missing required properties
    const node: FigmaNode = {
      type: 'FRAME'
    };
  });
});
```

**Integration Tests:**
- Test that API responses match Domain types
- Test that Application accepts Domain types

---

## Documentation Value

### Self-Documenting Code

```typescript
export interface FigmaNode {
  /** Unique identifier for the node */
  id: string;
  
  /** Human-readable name (displayed in Figma layers panel) */
  name: string;
  
  /** 
   * Visual bounds in absolute coordinates
   * Origin: Top-left corner of the canvas
   */
  absoluteBoundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}
```

**Benefits:**
- Developers understand structure at a glance
- IDE shows tooltips
- Reduces need for external documentation

---

## Key Takeaways

1. **Pure TypeScript** - No framework dependencies whatsoever
2. **Interfaces over Classes** - Data structures without behavior
3. **Matches Source of Truth** - Models Figma API structure faithfully
4. **Optional Properties** - Reflects conditional presence in API
5. **Type Safety** - Compiler catches breaking changes
6. **Domain-Driven Design** - Business concepts, not technical concerns
7. **Zero Dependencies** - Innermost layer of Clean Architecture

**Golden Rule:** If it describes "what the data looks like" (not "what we do with it"), it belongs in Domain.

---

## Comparison with Other Approaches

### Our Approach: Interfaces
```typescript
export interface FigmaNode {
  id: string;
  children?: FigmaNode[];
}
```

### Alternative 1: Classes
```typescript
export class FigmaNode {
  constructor(
    public id: string,
    public children?: FigmaNode[]
  ) {}
}
```
❌ More boilerplate, runtime overhead

### Alternative 2: Type Aliases
```typescript
export type FigmaNode = {
  id: string;
  children?: FigmaNode[];
}
```
✅ Could work, but `interface` is more conventional for objects

### Alternative 3: Zod/io-ts Schemas
```typescript
const FigmaNodeSchema = z.object({
  id: z.string(),
  children: z.array(z.lazy(() => FigmaNodeSchema)).optional()
});
```
✅ Runtime validation, but adds dependency (could be added later)

**Our Choice:** Interfaces strike the best balance for now. Runtime validation can be added if needed.

