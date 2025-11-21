import { Injectable } from '@nestjs/common';
import { FigmaNode, Paint, Color, Effect, TypeStyle } from '../domain/figma.types';

// This service contains the core business logic of the application.
// It translates the raw Figma node tree into HTML and CSS strings.
@Injectable()
export class FigmaConverterService {
  convert(rootNode: FigmaNode): { html: string; css: string } {
    // Find all frames/artboards in the document
    const artboards = this.findAllArtboards(rootNode);
    
    // If no artboards found, use root node
    const nodesToProcess = artboards.length > 0 ? artboards : [rootNode];

    // Create a context to hold CSS rules
    const context = { 
      cssRules: [] as string[], 
      idCounter: 0 
    };
    
    // Process each artboard and combine HTML
    // All artboards are treated as root containers since they're all top-level in the flex layout
    const artboardsHtml = nodesToProcess.map((artboard) => {
      return this.processNode(artboard, artboard, context, true);
    }).join('');
    
    // Wrap all artboards in a container
    const html = nodesToProcess.length > 1 
      ? `<div class="artboards-container">${artboardsHtml}</div>`
      : artboardsHtml;
    
    // Add global resets and container styles
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

        .artboards-container {
          display: flex;
          flex-direction: column;
          gap: 32px;
          padding: 32px;
          align-items: center;
        }
      `;

    return {
      html,
      css: baseCss + '\n' + context.cssRules.join('\n'),
    };
  }

  // Helper to find all top-level frames/artboards in the document
  // Figma structure: DOCUMENT → CANVAS → [FRAME/SECTION/COMPONENT, ...]
  // Returns all container nodes (FRAME, SECTION, COMPONENT) at the canvas level
  private findAllArtboards(node: FigmaNode): FigmaNode[] {
    const artboards: FigmaNode[] = [];
    
    // If we're at a CANVAS level, get all direct container children
    if (node.type === 'CANVAS' && node.children) {
      // Include FRAME, SECTION, and COMPONENT types (all are valid artboards/containers)
      return node.children.filter(child => 
        (child.type === 'FRAME' || child.type === 'SECTION' || child.type === 'COMPONENT')
      );
    }
    
    // If we're at a DOCUMENT level, collect artboards from all CANVAS children
    if (node.type === 'DOCUMENT' && node.children) {
      for (const child of node.children) {
        artboards.push(...this.findAllArtboards(child));
      }
      return artboards;
    }
    
    // Otherwise, recursively search for CANVAS nodes
    if (node.children) {
      for (const child of node.children) {
        const found = this.findAllArtboards(child);
        if (found.length > 0) {
          artboards.push(...found);
        }
      }
    }
    
    return artboards;
  }

  // Recursive function to generate HTML for a node and its children.
  // Pushes generated CSS rules to context.cssRules
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

  // Generates the CSS string for a single node.
  // Handles Positioning, Size, Colors, Typography, and Effects.
  private generateStyles(node: FigmaNode, parentNode: FigmaNode, isRoot: boolean): string {
    const styles: string[] = [];

    // Dimensions
    if (node.absoluteBoundingBox) {
        styles.push(`width: ${node.absoluteBoundingBox.width}px;`);
        styles.push(`height: ${node.absoluteBoundingBox.height}px;`);
    }

    // Positioning Strategy
    // - Root: Relative (container)
    // - layoutPositioning=ABSOLUTE: Force absolute positioning (even in auto-layout)
    // - Parent has Auto Layout: Static (let Flexbox handle it)
    // - Has children with absolute positioning: Relative (to contain them)
    // - Default: Absolute (pixel-perfect placement)
    const parentHasAutoLayout = parentNode.layoutMode && parentNode.layoutMode !== 'NONE';
    const hasAutoLayout = node.layoutMode && node.layoutMode !== 'NONE';
    const forceAbsolute = node.layoutPositioning === 'ABSOLUTE';
    
    // Check if this node has children that will need absolute positioning
    const hasAbsoluteChildren = node.children && node.children.length > 0 && 
      node.children.some(child => 
        child.layoutPositioning === 'ABSOLUTE' || 
        (!child.layoutMode || child.layoutMode === 'NONE')
      );

    if (isRoot) {
        styles.push('position: relative;');
        styles.push('overflow: hidden;');
        styles.push('background-color: white;');
    } else if (forceAbsolute) {
        // Figma allows absolute positioning within auto-layout
        styles.push('position: absolute;');
        
        // Calculate position relative to the parent's top-left corner
        if (node.absoluteBoundingBox && parentNode.absoluteBoundingBox) {
            const x = node.absoluteBoundingBox.x - parentNode.absoluteBoundingBox.x;
            const y = node.absoluteBoundingBox.y - parentNode.absoluteBoundingBox.y;
            styles.push(`left: ${x}px;`);
            styles.push(`top: ${y}px;`);
        }
    } else if (parentHasAutoLayout) {
        // Parent has auto-layout, so this element participates in flex flow
        if (hasAbsoluteChildren) {
            // Needs to be a positioning context for absolutely positioned children
            styles.push('position: relative;');
        } else {
            styles.push('position: static;');
        }
    } else if (hasAbsoluteChildren) {
        // Parent doesn't have auto-layout, so this must be absolutely positioned
        // But also needs to be a positioning context for its own children
        styles.push('position: absolute;');
        
        // Calculate position relative to the parent's top-left corner
        if (node.absoluteBoundingBox && parentNode.absoluteBoundingBox) {
            const x = node.absoluteBoundingBox.x - parentNode.absoluteBoundingBox.x;
            const y = node.absoluteBoundingBox.y - parentNode.absoluteBoundingBox.y;
            styles.push(`left: ${x}px;`);
            styles.push(`top: ${y}px;`);
        }
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

    // Flexbox Layout (If this node is a container with Auto Layout)
    if (node.layoutMode && node.layoutMode !== 'NONE') {
        styles.push('display: flex;');
        styles.push(`flex-direction: ${node.layoutMode === 'HORIZONTAL' ? 'row' : 'column'};`);
        styles.push(`gap: ${node.itemSpacing || 0}px;`);
        styles.push(`padding: ${node.paddingTop || 0}px ${node.paddingRight || 0}px ${node.paddingBottom || 0}px ${node.paddingLeft || 0}px;`);
        
        // Map Figma alignment to CSS flexbox
        // counterAxisAlignItems controls cross-axis (align-items)
        // primaryAxisAlignItems controls main-axis (justify-content)
        const alignItems = this.mapFigmaAlignToCSS(node.counterAxisAlignItems) || 'flex-start';
        const justifyContent = this.mapFigmaAlignToCSS(node.primaryAxisAlignItems) || 'flex-start';
        
        styles.push(`align-items: ${alignItems};`);
        styles.push(`justify-content: ${justifyContent};`);
    }
    
    // Apply flexbox for text containers (to align text children properly)
    // This handles cases where the parent doesn't have auto-layout but contains text
    // BUT we skip this if the node has absolutely positioned children (they handle their own layout)
    if (node.type !== 'TEXT' && node.children && node.children.length > 0 && !hasAbsoluteChildren) {
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

    // Backgrounds & Fills
    // Text nodes handle fills differently (as color), so we skip background generation for them here.
    if (node.fills && node.type !== 'TEXT') {
        const bg = this.parseFills(node.fills);
        if (bg) styles.push(`background: ${bg};`);
    } else if (node.backgroundColor && node.type !== 'TEXT') {
        styles.push(`background-color: ${this.rgba(node.backgroundColor)};`);
    }

    // Borders (Strokes)
    if (node.strokes && node.strokes.length > 0 && node.strokeWeight) {
         const strokePaint = node.strokes.find(p => p.visible !== false);
         if (strokePaint && strokePaint.type === 'SOLID') {
             const color = this.rgba(strokePaint.color!, strokePaint.opacity);
             styles.push(`border: ${node.strokeWeight}px solid ${color};`);
         }
    }

    // Border Radius
    if (node.cornerRadius) {
        styles.push(`border-radius: ${node.cornerRadius}px;`);
    } else if (node.rectangleCornerRadii) {
        styles.push(`border-radius: ${node.rectangleCornerRadii.map(r => r + 'px').join(' ')};`);
    }

    // Effects (Shadows)
    if (node.effects) {
        const shadow = this.parseEffects(node.effects);
        if (shadow) styles.push(`box-shadow: ${shadow};`);
    }

    // Typography
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

  // Parses the fills for a node.
  private parseFills(fills: Paint[]): string {
    const validFills = fills.filter(f => f.visible !== false);
    if (validFills.length === 0) return '';
    const fill = validFills[validFills.length - 1]; // Top-most layer

    if (fill.type === 'SOLID') {
        return this.rgba(fill.color!, fill.opacity);
    } else if (fill.type === 'GRADIENT_LINEAR') {
        return this.parseGradient(fill);
    } else if (fill.type === 'IMAGE') {
        // Image fills require proper Figma CDN URLs which aren't available from imageRef hash
        // For now, show a placeholder gradient to indicate an image was present
        return 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)';
    }
    return '';
  }

  // Parses the gradient for a node.
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

  // Parses the effects for a node.
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

  // Parses the typography for a node.
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

  // Converts a Figma color to a CSS rgba color.
  private rgba(color: Color, opacityOverride?: number): string {
    if (!color) return 'transparent';
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    const a = opacityOverride !== undefined ? opacityOverride : (color.a !== undefined ? color.a : 1);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  // Maps a Figma alignment to a CSS alignment.
  // Used for flexbox layout.
  private mapFigmaAlignToCSS(alignment?: string): string | undefined {
    if (!alignment) return undefined;
    
    // Map Figma alignment values to CSS flexbox values
    const alignmentMap: Record<string, string> = {
      'MIN': 'flex-start',
      'MAX': 'flex-end',
      'CENTER': 'center',
      'BASELINE': 'baseline',
      'STRETCH': 'stretch',
      'SPACE_BETWEEN': 'space-between',
    };
    
    return alignmentMap[alignment] || 'flex-start';
  }
}
