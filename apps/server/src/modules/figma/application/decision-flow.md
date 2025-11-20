# Application Layer: Decision Flow & Architecture

## Layer Purpose

The **Application Layer** contains the **core business logic** of our application. It's the heart of the system where all the domain rules and conversion algorithms live.

**Core Responsibility:** Transform Figma design data into HTML and CSS using business rules and algorithms.

---

## Files in This Layer

### 1. `figma-converter.service.ts`
**Purpose:** Core conversion engine that transforms Figma nodes to HTML/CSS

### 2. `dto/convert-figma.dto.ts`
**Purpose:** Data Transfer Object for input validation

---

## File Analysis: `figma-converter.service.ts`

### Structure Overview

```typescript
@Injectable()
export class FigmaConverterService {
  convert(rootNode: FigmaNode): { html: string; css: string }
  
  // Private helper methods
  private findFirstArtboard(node: FigmaNode): FigmaNode | null
  private processNode(node: FigmaNode, ...): string
  private generateStyles(node: FigmaNode, ...): string
  private parseFills(fills: Paint[]): string
  private parseGradient(paint: Paint): string
  private parseEffects(effects: Effect[]): string
  private parseTypography(style: TypeStyle): string[]
  private rgba(color: Color, opacityOverride?: number): string
}
```

### Key Design Decisions

---

## 1. **Public API Design: Single Entry Point**

```typescript
convert(rootNode: FigmaNode): { html: string; css: string }
```

**Why Single Public Method?**
- **Simple Interface:** Clear purpose (input: FigmaNode, output: HTML + CSS)
- **Encapsulation:** Internal complexity hidden behind clean API
- **Easy to Test:** Single method to mock/test
- **Immutable:** Doesn't maintain state between calls (stateless)

**Parameters:**
- `rootNode: FigmaNode` - Domain type (not HTTP, not raw JSON)
- No framework dependencies (not NestJS-specific)

**Return Type:**
```typescript
{ html: string; css: string }
```
- Plain objects (serializable, testable)
- No framework-specific response types
- Easy to transform for different output formats

**Why NOT:**
```typescript
// ❌ Multiple entry points
convertToHTML(node: FigmaNode): string
convertToCSS(node: FigmaNode): string
// Problem: HTML and CSS are interdependent (class names must match)

// ❌ Side effects
convert(node: FigmaNode): void // Writes to file system
// Problem: Hard to test, violates Single Responsibility
```

---

## 2. **Processing Context Pattern**

```typescript
const context = { 
  cssRules: [] as string[], 
  idCounter: 0 
};

const html = this.processNode(targetNode, targetNode, context, true);
const css = baseCss + '\n' + context.cssRules.join('\n');
```

**Why Context Object?**
- **Thread-Safe:** No shared class state
- **Recursive State:** Passes data down the tree
- **Accumulator Pattern:** Collects CSS rules during traversal
- **No Side Effects on Class:** Each conversion is isolated

**Alternative Considered: Class Properties**
```typescript
// ❌ Avoid this
private cssRules: string[] = [];

convert(node) {
  this.cssRules = []; // Must reset
  this.processNode(node);
  return { css: this.cssRules.join('\n') };
}
```

**Problems:**
- Not thread-safe (if multiple calls run concurrently)
- Requires manual state reset
- Harder to test (must check class state)

**Current Approach Benefits:**
- ✅ Each call gets fresh context
- ✅ No state leakage between calls
- ✅ Easy to add more context data
- ✅ Functional programming style

---

## 3. **Artboard Discovery Strategy**

```typescript
private findFirstArtboard(node: FigmaNode): FigmaNode | null {
  if ((node.type === 'FRAME' || node.type === 'COMPONENT') 
      && node.children && node.children.length > 0) {
    return node;
  }
  if (node.children) {
    for (const child of node.children) {
      const found = this.findFirstArtboard(child);
      if (found) return found;
    }
  }
  return null;
}
```

**Why Find First Artboard?**

**Problem:**
- Figma files have a DOCUMENT → CANVAS → FRAME hierarchy
- DOCUMENT and CANVAS are not renderable (they're containers)
- We need the first "meaningful" Frame to convert

**Search Criteria:**
- Type is FRAME or COMPONENT
- Has children (not empty)

**Algorithm:** Depth-First Search (DFS)
- Traverses tree from top to bottom
- Returns immediately when found (short-circuits)
- Returns null if no artboard exists

**Fallback Strategy:**
```typescript
const targetNode = this.findFirstArtboard(rootNode) || rootNode;
```
- If no artboard found, use root node
- Handles edge cases (empty files, non-standard structures)

**Alternative Considered: Convert Entire Canvas**
- Would include Figma's infinite canvas (not useful)
- Performance issues (thousands of nodes)
- Not user's intent (they want the design, not the workspace)

---

## 4. **Recursive Tree Traversal**

```typescript
private processNode(
  node: FigmaNode, 
  parentNode: FigmaNode, 
  context: { cssRules: string[]; idCounter: number }, 
  isRoot = false
): string
```

**Why Recursion?**
- Figma node tree is naturally recursive
- Each node has children that are also nodes
- Clean, readable code for tree processing

**Parameters Explained:**

**`node`** - Current node being processed
**`parentNode`** - Needed for relative positioning calculations
**`context`** - Accumulates CSS rules (see #2)
**`isRoot`** - Special handling for root container

**Algorithm Flow:**
```typescript
1. Skip if invisible: if (node.visible === false) return '';
2. Generate unique class name: `node-${node.id}`
3. Generate CSS styles for this node
4. Add CSS rule to context
5. Process content:
   - If TEXT: Escape and render characters
   - If has children: Recursively process each child
6. Return HTML wrapped in div
```

**HTML Structure Generated:**
```html
<div class="node-123">
  <div class="node-456">Text content</div>
  <div class="node-789">More content</div>
</div>
```

**Why DIVs for Everything?**
- Simplicity: One element type
- Flexibility: DIVs support all CSS properties
- Consistency: Predictable structure
- Positioning: Easy to position absolutely/relatively

**Alternative Considered: Semantic HTML**
```html
<button class="node-123">Click me</button>
<img src="..." class="node-456" />
```

**Why Not:**
- Requires AI/heuristics to guess semantic meaning
- Figma doesn't have semantic types (just visual nodes)
- More complexity, little benefit
- Can be added as future enhancement

---

## 5. **Class Naming Strategy**

```typescript
const className = `node-${node.id.replace(/[^a-zA-Z0-9-_]/g, '-')}`;
```

**Why Use Figma Node IDs?**
- **Unique:** Every Figma node has unique ID
- **Stable:** ID doesn't change when design updates
- **Traceable:** Easy to map HTML → Figma node
- **Collision-Free:** No need for counter

**Sanitization:**
```typescript
.replace(/[^a-zA-Z0-9-_]/g, '-')
```
- Figma IDs contain colons: `123:456`
- CSS class names can't have colons
- Replace invalid chars with hyphens

**Example:**
```
Figma ID: "123:456"
CSS Class: "node-123-456"
```

**Alternative Considered: Sequential Numbers**
```typescript
const className = `node-${context.idCounter++}`;
```

**Why Not:**
- IDs change on every conversion (not stable)
- Can't correlate HTML back to Figma
- Less debuggable

---

## 6. **Style Generation Strategy**

```typescript
private generateStyles(
  node: FigmaNode, 
  parentNode: FigmaNode, 
  isRoot: boolean
): string
```

**Returns:** Single CSS string with all properties

**Order of Operations:**
```typescript
1. Dimensions (width, height)
2. Positioning (absolute/relative/static)
3. Layout (flexbox if auto-layout)
4. Background & Fills
5. Borders (strokes)
6. Border Radius
7. Effects (shadows)
8. Typography (text nodes only)
```

**Why This Order?**
- Follows CSS rendering order (layout → paint → composite)
- Overrides work correctly (later rules override earlier ones)
- Easier to debug (consistent structure)

---

### 6.1 **Positioning Decision Tree**

```typescript
const parentHasAutoLayout = parentNode.layoutMode && parentNode.layoutMode !== 'NONE';

if (isRoot) {
  styles.push('position: relative;');
} else if (parentHasAutoLayout) {
  styles.push('position: static;');
} else {
  styles.push('position: absolute;');
  // Calculate top/left relative to parent
}
```

**Three Positioning Strategies:**

**1. Root Node → Relative**
```css
position: relative;
```
- Acts as containing block
- Children positioned relative to this
- Has overflow: hidden (clips children)

**2. Parent Has Auto Layout → Static**
```css
position: static;
```
- Let Flexbox handle positioning
- No absolute positioning needed
- Respects flex properties (align, justify)

**3. Default → Absolute**
```css
position: absolute;
left: 50px;
top: 100px;
```
- Pixel-perfect positioning
- Calculate position relative to parent
- Formula: `childX - parentX`, `childY - parentY`

**Why This Matters:**
- Figma has two layout modes:
  1. **Fixed Positioning:** Absolute coordinates
  2. **Auto Layout:** Flexbox-like behavior
- We must detect and respect both modes

**Edge Cases Handled:**
```typescript
if (node.absoluteBoundingBox && parentNode.absoluteBoundingBox) {
  // Only calculate if both have bounding boxes
}
```
- Some nodes don't have bounding boxes (e.g., DOCUMENT)
- Avoids null reference errors

---

### 6.2 **Flexbox Auto Layout Conversion**

```typescript
if (node.layoutMode && node.layoutMode !== 'NONE') {
  styles.push('display: flex;');
  styles.push(`flex-direction: ${node.layoutMode === 'HORIZONTAL' ? 'row' : 'column'};`);
  styles.push(`gap: ${node.itemSpacing || 0}px;`);
  styles.push(`padding: ${node.paddingTop}px ${node.paddingRight}px ...`);
}
```

**Figma Auto Layout → CSS Flexbox Mapping:**

| Figma Property | CSS Property |
|----------------|--------------|
| `layoutMode: 'HORIZONTAL'` | `flex-direction: row` |
| `layoutMode: 'VERTICAL'` | `flex-direction: column` |
| `itemSpacing: 16` | `gap: 16px` |
| `paddingTop/Right/Bottom/Left` | `padding: ...` |

**Text Alignment Detection:**
```typescript
const textChild = node.children.find(child => child.type === 'TEXT');
if (textChild && textChild.style) {
  // Use text alignment to set container alignment
  if (textChild.style.textAlignVertical === 'CENTER') {
    styles.push('align-items: center;');
  }
}
```

**Why Check Text Children?**
- Figma doesn't store container alignment directly
- Text nodes have alignment properties
- We infer container alignment from content

**Trade-off:**
- ✅ Works for common cases (text in buttons, labels)
- ❌ Might not work for complex multi-child layouts
- Future: Use Figma's `counterAxisAlignItems` property

---

### 6.3 **Fill/Background Parsing**

```typescript
private parseFills(fills: Paint[]): string {
  const validFills = fills.filter(f => f.visible !== false);
  const fill = validFills[validFills.length - 1]; // Top-most layer
  
  if (fill.type === 'SOLID') return this.rgba(fill.color!, fill.opacity);
  if (fill.type === 'GRADIENT_LINEAR') return this.parseGradient(fill);
  if (fill.type === 'IMAGE') return `url(${fill.imageRef}) center / cover no-repeat`;
}
```

**Layer Order:**
- Figma fills are bottom-to-top array
- CSS backgrounds are rendered top-to-bottom
- We take the last visible fill (top-most layer)

**Supported Fill Types:**

**1. Solid Color:**
```css
background: rgba(255, 0, 0, 1);
```

**2. Linear Gradient:**
```css
background: linear-gradient(135deg, #ff0000 0%, #0000ff 100%);
```

**3. Image:**
```css
background: url(...) center / cover no-repeat;
```

**Unsupported (Future):**
- Radial gradients
- Multiple backgrounds (layer blending)
- Background blend modes

---

### 6.4 **Gradient Conversion Algorithm**

```typescript
private parseGradient(paint: Paint): string {
  const handles = paint.gradientHandlePositions;
  const start = handles[0];
  const end = handles[1];
  
  // Calculate angle
  const dy = end.y - start.y;
  const dx = end.x - start.x;
  let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const cssAngle = angle + 90; // Convert to CSS coordinate system
  
  // Build color stops
  const stops = paint.gradientStops.map(stop => 
    `${this.rgba(stop.color)} ${Math.round(stop.position * 100)}%`
  ).join(', ');
  
  return `linear-gradient(${cssAngle}deg, ${stops})`;
}
```

**Coordinate System Conversion:**

**Figma Gradients:**
- Defined by 3 handle points (start, end, third for width)
- Angle calculated from vector (start → end)
- 0° points right (positive X-axis)

**CSS Gradients:**
- Angle in degrees
- 0° points up (positive Y-axis)
- Rotates clockwise

**Conversion:**
```
CSS Angle = Figma Angle + 90°
```

**Example:**
```
Figma: 45° (diagonal down-right)
CSS: 135deg (diagonal down-right in CSS coords)
```

**Color Stops:**
```typescript
position: 0.0 → 0%
position: 0.5 → 50%
position: 1.0 → 100%
```

---

### 6.5 **Typography Conversion**

```typescript
private parseTypography(style: TypeStyle): string[] {
  const css: string[] = [];
  css.push(`font-family: '${style.fontFamily}', sans-serif;`);
  css.push(`font-size: ${style.fontSize}px;`);
  css.push(`font-weight: ${style.fontWeight};`);
  if (style.lineHeightPx) css.push(`line-height: ${style.lineHeightPx}px;`);
  if (style.letterSpacing) css.push(`letter-spacing: ${style.letterSpacing}px;`);
  
  // Text alignment
  const alignMap = { 
    'LEFT': 'left', 
    'RIGHT': 'right', 
    'CENTER': 'center', 
    'JUSTIFIED': 'justify' 
  };
  if (style.textAlignHorizontal) {
    css.push(`text-align: ${alignMap[style.textAlignHorizontal]};`);
  }
  
  return css;
}
```

**Font Family Handling:**
```css
font-family: 'Inter', sans-serif;
```
- Wraps font name in quotes (handles spaces)
- Adds fallback: `sans-serif`
- Doesn't load custom fonts (future enhancement)

**Font Weight Mapping:**
```
Figma: 400 → CSS: 400 (Regular)
Figma: 700 → CSS: 700 (Bold)
```
- Direct mapping (same numeric system)

**Line Height:**
- Figma provides `lineHeightPx` (absolute) and `lineHeightPercent` (relative)
- We use absolute for pixel-perfect rendering
- Alternative: Convert to unitless (`lineHeight / fontSize`)

**Letter Spacing:**
- Figma uses pixels
- CSS also accepts pixels
- Direct mapping (no conversion needed)

---

### 6.6 **Effect (Shadow) Parsing**

```typescript
private parseEffects(effects: Effect[]): string {
  return effects
    .filter(e => e.visible && (e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW'))
    .map(e => {
      const inset = e.type === 'INNER_SHADOW' ? 'inset' : '';
      const x = e.offset?.x || 0;
      const y = e.offset?.y || 0;
      const blur = e.radius || 0;
      const spread = e.spread || 0;
      const color = this.rgba(e.color!);
      return `${inset} ${x}px ${y}px ${blur}px ${spread}px ${color}`;
    })
    .join(', ');
}
```

**Figma → CSS Shadow Mapping:**

| Figma | CSS |
|-------|-----|
| DROP_SHADOW | `box-shadow: ...` |
| INNER_SHADOW | `box-shadow: inset ...` |
| offset.x | X offset |
| offset.y | Y offset |
| radius | Blur radius |
| spread | Spread radius |
| color | Shadow color |

**Multiple Shadows:**
```css
box-shadow: 
  2px 2px 4px rgba(0,0,0,0.2),
  inset 0 0 10px rgba(255,255,255,0.1);
```
- Figma supports multiple effects
- CSS supports comma-separated shadows
- Direct mapping with `.join(', ')`

**Unsupported Effects:**
- LAYER_BLUR → CSS `filter: blur()` (different property)
- BACKGROUND_BLUR → CSS `backdrop-filter` (different property)

---

## 7. **Color Utility Function**

```typescript
private rgba(color: Color, opacityOverride?: number): string {
  if (!color) return 'transparent';
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  const a = opacityOverride !== undefined 
    ? opacityOverride 
    : (color.a !== undefined ? color.a : 1);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
```

**Figma Color Format:**
```typescript
{ r: 0.5, g: 0.25, b: 1.0, a: 0.8 }
// Values are 0.0 to 1.0 (normalized)
```

**CSS Color Format:**
```css
rgba(128, 64, 255, 0.8)
/* RGB: 0-255, Alpha: 0.0-1.0 */
```

**Conversion:**
```typescript
CSS_Value = Math.round(Figma_Value * 255)
```

**Opacity Handling:**
- Figma has two opacity sources:
  1. `color.a` (color's alpha channel)
  2. `paint.opacity` (layer opacity)
- `opacityOverride` allows layer opacity to override color alpha
- Fallback chain: `opacityOverride ?? color.a ?? 1.0`

**Edge Case:**
```typescript
if (!color) return 'transparent';
```
- Some nodes have null/undefined colors
- Return CSS `transparent` keyword

---

## 8. **Text Content Handling**

```typescript
if (node.type === 'TEXT' && node.characters) {
  content = node.characters
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>');
}
```

**Security: HTML Escaping**
- **`&` → `&amp;`** (must be first to avoid double-escaping)
- **`<` → `&lt;`** (prevents HTML injection)
- **`>` → `&gt;`** (closes tags safely)

**Why This Matters:**
```
Input: "Hello <script>alert('XSS')</script>"
Output: "Hello &lt;script&gt;alert('XSS')&lt;/script&gt;"
Rendered: "Hello <script>alert('XSS')</script>" (as text, not code)
```

**Line Break Handling:**
```typescript
.replace(/\n/g, '<br/>')
```
- Figma text can have newlines
- HTML collapses whitespace by default
- Convert newlines to `<br/>` tags

**Alternative Considered: `white-space: pre-wrap`**
```css
.text { white-space: pre-wrap; }
```
- Would preserve newlines without `<br/>`
- Requires adding CSS property to all text
- Current approach is simpler

---

## File Analysis: `dto/convert-figma.dto.ts`

```typescript
export class ConvertFigmaDto {
  @IsString()
  @IsNotEmpty()
  fileKey: string;

  @IsString()
  @IsNotEmpty()
  token: string;
}
```

### Why DTO (Data Transfer Object)?

**Purpose:**
- Define expected input shape
- Validate incoming data
- Type safety for API contracts

**Why Class (Not Interface)?**
```typescript
// ❌ Interface doesn't work with decorators
interface ConvertFigmaDto {
  fileKey: string;
  token: string;
}
```
- Interfaces are compile-time only (erased at runtime)
- Decorators need runtime class metadata
- `class-validator` requires classes

**Validation Decorators:**

**`@IsString()`**
- Ensures value is a string type
- Rejects: numbers, objects, arrays, null, undefined

**`@IsNotEmpty()`**
- Ensures string is not empty (`""`)
- Rejects: `""`, but allows `" "` (whitespace)

**Validation Flow:**
```
1. Request body arrives as JSON
2. NestJS deserializes to class instance
3. class-validator checks decorators
4. If valid: passes to controller
5. If invalid: returns 400 Bad Request
```

**Example Error Response:**
```json
{
  "statusCode": 400,
  "message": ["fileKey should not be empty"],
  "error": "Bad Request"
}
```

---

## Dependency Graph

```
FigmaConverterService
    ├── depends on → FigmaNode (Domain)
    ├── depends on → Paint (Domain)
    ├── depends on → Effect (Domain)
    ├── depends on → TypeStyle (Domain)
    ├── depends on → Color (Domain)
    └── uses → @Injectable (NestJS decorator only)

ConvertFigmaDto
    ├── depends on → class-validator decorators
    └── used by → FigmaController (Presentation)
```

**Key Property:** Only depends on Domain types (no Infrastructure, no HTTP)

---

## Testing Strategy

### Unit Test Structure

```typescript
describe('FigmaConverterService', () => {
  let service: FigmaConverterService;

  beforeEach(() => {
    service = new FigmaConverterService();
  });

  describe('convert', () => {
    it('should generate HTML and CSS', () => {
      const mockNode: FigmaNode = {
        id: '1:1',
        type: 'FRAME',
        name: 'Test',
        children: [
          {
            id: '1:2',
            type: 'TEXT',
            characters: 'Hello',
            style: { fontSize: 16, ... }
          }
        ],
        absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 50 }
      };

      const result = service.convert(mockNode);

      expect(result.html).toContain('Hello');
      expect(result.css).toContain('font-size: 16px');
    });

    it('should escape HTML in text', () => {
      const mockNode = createTextNode('<script>alert("xss")</script>');
      const result = service.convert(mockNode);
      expect(result.html).toContain('&lt;script&gt;');
    });
  });

  describe('rgba', () => {
    it('should convert Figma color to CSS rgba', () => {
      const color = { r: 0.5, g: 0.25, b: 1.0, a: 0.8 };
      expect(service['rgba'](color)).toBe('rgba(128, 64, 255, 0.8)');
    });
  });
});
```

**Test Categories:**

1. **Integration Tests** (whole conversion)
2. **Unit Tests** (individual helper methods)
3. **Edge Cases** (empty nodes, null values)
4. **Security Tests** (HTML escaping, XSS prevention)

---

## Performance Considerations

### Current Performance Profile

**Time Complexity:**
- Tree traversal: O(n) where n = number of nodes
- Style generation: O(1) per node
- Overall: O(n) - linear with design complexity

**Space Complexity:**
- HTML string: O(n)
- CSS rules array: O(n)
- Overall: O(n)

**Typical Design:**
- 100-500 nodes
- Conversion time: 50-200ms
- Memory: < 1MB

### Optimization Opportunities

**1. CSS Deduplication**
```typescript
// Current: Every node gets unique class
.node-1-1 { width: 100px; height: 50px; }
.node-1-2 { width: 100px; height: 50px; } // Duplicate!

// Future: Shared classes for identical styles
.size-100-50 { width: 100px; height: 50px; }
```

**2. Lazy Style Generation**
```typescript
// Only generate styles for visible nodes
if (node.visible === false) return '';
```
- Already implemented ✅

**3. Memoization**
```typescript
private styleCache = new Map<string, string>();

generateStyles(node) {
  const cacheKey = JSON.stringify(node);
  if (this.styleCache.has(cacheKey)) {
    return this.styleCache.get(cacheKey);
  }
  // ... generate
}
```
- Useful if same nodes appear multiple times (instances/components)

---

## Future Enhancements

### 1. Component Detection
```typescript
// Detect Figma components and generate reusable CSS classes
if (node.type === 'COMPONENT') {
  // Generate component-specific class
}
```

### 2. Responsive Design
```typescript
// Generate media queries based on Figma variants
@media (max-width: 768px) {
  .node-123 { width: 100%; }
}
```

### 3. Semantic HTML
```typescript
// Detect button-like nodes
if (isButton(node)) {
  return `<button class="${className}">${content}</button>`;
}
```

### 4. CSS Variables
```typescript
// Extract design tokens
:root {
  --color-primary: #FF0000;
  --font-size-base: 16px;
}
```

### 5. Animation Support
```typescript
// Convert Figma Smart Animate to CSS transitions
if (node.transitionDuration) {
  styles.push(`transition: all ${node.transitionDuration}ms;`);
}
```

---

## Key Takeaways

1. **Pure Business Logic** - No HTTP, no database, no framework dependencies
2. **Stateless Design** - Each conversion is independent
3. **Recursive Algorithm** - Natural fit for tree structure
4. **Defensive Programming** - Handles edge cases (null, undefined, missing properties)
5. **Security-First** - HTML escaping prevents XSS
6. **Testable** - Easy to unit test with mock data
7. **Extensible** - Easy to add new CSS properties or HTML elements

**Golden Rule:** If it's about "how to convert Figma to HTML/CSS", it belongs here. If it's about "where to get Figma data" or "how to send HTTP responses", it belongs elsewhere.
