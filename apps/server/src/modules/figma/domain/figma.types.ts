// Using interface instead of class because we don't need to attach behavior to these nodes and it has zero runtime overhead in TypeScript
export interface FigmaNode {
  id: string;
  name: string;
  type: 'DOCUMENT' | 'CANVAS' | 'FRAME' | 'GROUP' | 'VECTOR' | 'BOOLEAN_OPERATION' | 'STAR' | 'LINE' | 'ELLIPSE' | 'REGULAR_POLYGON' | 'RECTANGLE' | 'TEXT' | 'SLICE' | 'COMPONENT' | 'INSTANCE' | 'COMPONENT_SET';
  children?: FigmaNode[];
  absoluteBoundingBox?: { x: number; y: number; width: number; height: number };
  fills?: Paint[];
  strokes?: Paint[];
  strokeWeight?: number;
  strokeAlign?: 'INSIDE' | 'OUTSIDE' | 'CENTER';
  effects?: Effect[];
  characters?: string;
  style?: TypeStyle;
  layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
  counterAxisSizingMode?: 'FIXED' | 'AUTO';
  primaryAxisSizingMode?: 'FIXED' | 'AUTO';
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  itemSpacing?: number;
  backgroundColor?: Color;
  opacity?: number;
  visible?: boolean;
  cornerRadius?: number;
  rectangleCornerRadii?: number[];
  constraints?: LayoutConstraint;
}

export interface Paint {
  type: 'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'IMAGE';
  color?: Color;
  opacity?: number;
  visible?: boolean;
  gradientHandlePositions?: Vector[];
  gradientStops?: ColorStop[];
  scaleMode?: string;
  imageRef?: string;
}

export interface Vector {
  x: number;
  y: number;
}

export interface ColorStop {
  position: number;
  color: Color;
}

export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
  // Color from Figma sometimes has 'a' (alpha) but sometimes it is separate 'opacity'
}

export interface Effect {
  type: 'INNER_SHADOW' | 'DROP_SHADOW' | 'LAYER_BLUR' | 'BACKGROUND_BLUR';
  visible: boolean;
  radius: number;
  color?: Color;
  offset?: Vector;
  spread?: number;
}

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

export interface LayoutConstraint {
  vertical: 'TOP' | 'BOTTOM' | 'CENTER' | 'TOP_BOTTOM' | 'SCALE';
  horizontal: 'LEFT' | 'RIGHT' | 'CENTER' | 'LEFT_RIGHT' | 'SCALE';
}

export interface ConversionResult {
  html: string;
  css: string;
  name: string;
}
