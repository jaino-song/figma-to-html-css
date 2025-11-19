
import { Injectable } from '@nestjs/common';
import { FigmaNode, Paint, Color, Effect, TypeStyle } from '../domain/figma.types';

/**
 * Application Layer: FigmaConverterService
 * 
 * RESPONSIBILITY:
 * This service contains the CORE BUSINESS LOGIC of the application.
 * It translates the raw Figma Node tree (Domain Entity) into HTML and CSS strings.
 * 
 * CLEAN ARCHITECTURE NOTE:
 * This service depends only on the Domain (FigmaNode types) and standard libraries.
 * It does not know about Controllers (HTTP) or specific external APIs.
 */
@Injectable()
export class FigmaConverterService {

  /**
   * Main entry point for conversion.
   * @param rootNode The root node of the Figma document.
   * @returns An object containing the generated HTML and CSS.
   */
  convert(rootNode: FigmaNode): { html: string; css: string } {
    // 1. Locate the first "meaningful" Frame/Artboard to convert.
    // This avoids rendering the entire infinite canvas.
    // Checking the rootNode
    console.log('rootNode', JSON.stringify(rootNode, null, 2));
    const targetNode = this.findFirstArtboard(rootNode) || rootNode;

    // 2. Create a context to hold CSS rules.
    // We pass this down recursively so we don't rely on shared class state (thread-safe).
    const context = { 
      cssRules: [] as string[], 
      idCounter: 0 
    };
    
    // 3. Begin recursive processing
    const html = this.processNode(targetNode, targetNode, context, true);
    
    // 4. Add global resets and container styles for the preview
    const baseCss = `
      body { 
        font-family: sans-serif; 
        margin: 0; 
        padding: 0; 
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        background-color: #f5f5f5;
      }
      * { box-sizing: border-box; }
    `;

    return {
      html,
      css: baseCss + '\n' + context.cssRules.join('\n'),
    };
  }

  /**
   * Helper to traverse the tree and find the first FRAME that has children.
   */
  private findFirstArtboard(node: FigmaNode): FigmaNode | null {
    if ((node.type === 'FRAME' || node.type === 'COMPONENT') && node.children && node.children.length > 0) {
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

  /**
   * Recursive function to generate HTML for a node and its children.
   * Side Effect: Pushes generated CSS rules to context.cssRules
   */
  private processNode(node: FigmaNode, parentNode: FigmaNode, context: { cssRules: string[]; idCounter: number }, isRoot = false): string {
    if (node.visible === false) return '';

    // Generate a unique class name based on the Figma Node ID
    const className = `node-${node.id.replace(/[^a-zA-Z0-9-_]/g, '-')}`;
    
    // Generate the CSS styles for this specific node
    const styles = this.generateStyles(node, parentNode, isRoot);
    
    context.cssRules.push(`.${className} { ${styles} }`);

    let content = '';
    if (node.type === 'TEXT' && node.characters) {
      // Escape HTML characters for security and basic rendering
      content = node.characters
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br/>');
    } else if (node.children) {
      // Recursively process children
      content = node.children.map((child) => this.processNode(child, node, context)).join('');
    }

    return `<div class="${className}">${content}</div>`;
  }

  /**
   * Generates the CSS string for a single node.
   * Handles Positioning, Size, Colors, Typography, and Effects.
   */
  private generateStyles(node: FigmaNode, parentNode: FigmaNode, isRoot: boolean): string {
    const styles: string[] = [];

    // 1. Dimensions
    if (node.absoluteBoundingBox) {
        styles.push(`width: ${node.absoluteBoundingBox.width}px;`);
        styles.push(`height: ${node.absoluteBoundingBox.height}px;`);
    }

    // 2. Positioning Strategy
    // - Root: Relative (container)
    // - Parent has Auto Layout: Static (let Flexbox handle it)
    // - Default: Absolute (pixel-perfect placement)
    
    const parentHasAutoLayout = parentNode.layoutMode && parentNode.layoutMode !== 'NONE';

    if (isRoot) {
        styles.push('position: relative;');
        styles.push('overflow: hidden;');
        styles.push('background-color: white;');
    } else if (parentHasAutoLayout) {
        styles.push('position: static;'); 
    } else {
        styles.push('position: absolute;');
        
        // Calculate position relative to the parent's top-left corner
        if (node.absoluteBoundingBox && parentNode.absoluteBoundingBox) {
            const x = node.absoluteBoundingBox.x - parentNode.absoluteBoundingBox.x;
            const y = node.absoluteBoundingBox.y - parentNode.absoluteBoundingBox.y;
            styles.push(`left: ${x}px;`);
            styles.push(`top: ${y}px;`);
        }
    }

    // 3. Flexbox Layout (If this node is a container with Auto Layout)
    if (node.layoutMode && node.layoutMode !== 'NONE') {
        styles.push('display: flex;');
        styles.push(`flex-direction: ${node.layoutMode === 'HORIZONTAL' ? 'row' : 'column'};`);
        styles.push(`gap: ${node.itemSpacing || 0}px;`);
        styles.push(`padding: ${node.paddingTop || 0}px ${node.paddingRight || 0}px ${node.paddingBottom || 0}px ${node.paddingLeft || 0}px;`);
        
        // Check if this container has text children with alignment
        let align = 'flex-start';
        let justify = 'flex-start';
        
        if (node.children && node.children.length > 0) {
            const textChild = node.children.find(child => child.type === 'TEXT');
            if (textChild && textChild.style) {
                // Use text child's alignment for the auto-layout container
                const verticalAlignment = textChild.style.textAlignVertical;
                if (verticalAlignment === 'CENTER') {
                    align = 'center';
                } else if (verticalAlignment === 'BOTTOM') {
                    align = 'flex-end';
                } else if (verticalAlignment === 'TOP') {
                    align = 'flex-start';
                }
                
                const horizontalAlignment = textChild.style.textAlignHorizontal;
                if (horizontalAlignment === 'CENTER') {
                    justify = 'center';
                } else if (horizontalAlignment === 'RIGHT') {
                    justify = 'flex-end';
                } else if (horizontalAlignment === 'LEFT') {
                    justify = 'flex-start';
                }
            }
        }
        
        styles.push(`align-items: ${align};`);
        styles.push(`justify-content: ${justify};`);
    }
    
    // 3b. Apply flexbox for text containers (to align text children properly)
    // This handles cases where the parent doesn't have auto-layout but contains text
    if (node.type !== 'TEXT' && node.children && node.children.length > 0) {
        const textChild = node.children.find(child => child.type === 'TEXT');
        // Apply flexbox if text has alignment AND parent doesn't have auto-layout
        if (textChild && textChild.style && !(node.layoutMode && node.layoutMode !== 'NONE')) {
            const hasAlignment = textChild.style.textAlignHorizontal || textChild.style.textAlignVertical;
            if (hasAlignment) {
                styles.push('display: flex;');
                
                // Vertical alignment (align-items)
                const verticalAlignment = textChild.style.textAlignVertical;
                if (verticalAlignment === 'CENTER') {
                    styles.push('align-items: center;');
                } else if (verticalAlignment === 'BOTTOM') {
                    styles.push('align-items: flex-end;');
                } else if (verticalAlignment === 'TOP') {
                    styles.push('align-items: flex-start;');
                } else {
                    styles.push('align-items: center;'); // default to center for better text rendering
                }
                
                // Horizontal alignment (justify-content)
                const horizontalAlignment = textChild.style.textAlignHorizontal;
                if (horizontalAlignment === 'CENTER') {
                    styles.push('justify-content: center;');
                } else if (horizontalAlignment === 'RIGHT') {
                    styles.push('justify-content: flex-end;');
                } else if (horizontalAlignment === 'LEFT') {
                    styles.push('justify-content: flex-start;');
                } else {
                    styles.push('justify-content: center;'); // default
                }
            }
        }
    }

    // 4. Backgrounds & Fills
    // Text nodes handle fills differently (as color), so we skip background generation for them here.
    if (node.fills && node.type !== 'TEXT') {
        const bg = this.parseFills(node.fills);
        if (bg) styles.push(`background: ${bg};`);
    } else if (node.backgroundColor && node.type !== 'TEXT') {
        styles.push(`background-color: ${this.rgba(node.backgroundColor)};`);
    }

    // 5. Borders (Strokes)
    if (node.strokes && node.strokes.length > 0 && node.strokeWeight) {
         const strokePaint = node.strokes.find(p => p.visible !== false);
         if (strokePaint && strokePaint.type === 'SOLID') {
             const color = this.rgba(strokePaint.color!, strokePaint.opacity);
             styles.push(`border: ${node.strokeWeight}px solid ${color};`);
         }
    }

    // 6. Border Radius
    if (node.cornerRadius) {
        styles.push(`border-radius: ${node.cornerRadius}px;`);
    } else if (node.rectangleCornerRadii) {
        styles.push(`border-radius: ${node.rectangleCornerRadii.map(r => r + 'px').join(' ')};`);
    }

    // 7. Effects (Shadows)
    if (node.effects) {
        const shadow = this.parseEffects(node.effects);
        if (shadow) styles.push(`box-shadow: ${shadow};`);
    }

    // 8. Typography
    if (node.type === 'TEXT' && node.style) {
        styles.push(...this.parseTypography(node.style));
        // Apply text color from fills
        if (node.fills) {
            const validFill = node.fills.find(f => f.visible !== false);
            if (validFill?.type === 'SOLID') {
                 styles.push(`color: ${this.rgba(validFill.color!, validFill.opacity)};`);
            }
        }
    }

    return styles.join(' ');
  }

  // --- Helpers ---

  private parseFills(fills: Paint[]): string {
    const validFills = fills.filter(f => f.visible !== false);
    if (validFills.length === 0) return '';
    const fill = validFills[validFills.length - 1]; // Top-most layer
    
    if (fill.type === 'SOLID') {
        return this.rgba(fill.color!, fill.opacity);
    } else if (fill.type === 'GRADIENT_LINEAR') {
        return this.parseGradient(fill);
    } else if (fill.type === 'IMAGE') {
        return `url(${fill.imageRef || ''}) center / cover no-repeat`;
    }
    return '';
  }

  private parseGradient(paint: Paint): string {
    if (!paint.gradientStops || !paint.gradientHandlePositions) return '';
    const handles = paint.gradientHandlePositions;
    const start = handles[0];
    const end = handles[1];
    const dy = end.y - start.y;
    const dx = end.x - start.x;
    let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    // Convert cartesian angle to CSS Linear Gradient angle
    const cssAngle = angle + 90;

    const stops = paint.gradientStops.map(stop => {
        return `${this.rgba(stop.color)} ${Math.round(stop.position * 100)}%`;
    }).join(', ');

    return `linear-gradient(${cssAngle}deg, ${stops})`;
  }

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

  private parseTypography(style: TypeStyle): string[] {
    const css: string[] = [];
    css.push(`font-family: '${style.fontFamily}', sans-serif;`);
    css.push(`font-size: ${style.fontSize}px;`);
    css.push(`font-weight: ${style.fontWeight};`);
    if (style.lineHeightPx) css.push(`line-height: ${style.lineHeightPx}px;`);
    if (style.letterSpacing) css.push(`letter-spacing: ${style.letterSpacing}px;`);
    
    // Text alignment (inline text alignment)
    const alignMap: any = { 'LEFT': 'left', 'RIGHT': 'right', 'CENTER': 'center', 'JUSTIFIED': 'justify' };
    if (style.textAlignHorizontal) {
      css.push(`text-align: ${alignMap[style.textAlignHorizontal]};`);
    }
    
    return css;
  }

  private rgba(color: Color, opacityOverride?: number): string {
    if (!color) return 'transparent';
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    const a = opacityOverride !== undefined ? opacityOverride : (color.a !== undefined ? color.a : 1);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
}
