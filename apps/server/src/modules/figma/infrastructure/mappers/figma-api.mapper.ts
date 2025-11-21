import { 
  FigmaNode, 
  Paint, 
  Color, 
  Effect, 
  TypeStyle, 
  Vector, 
  ColorStop, 
  LayoutConstraint 
} from '../../domain/figma.types';

// Mapper to convert Figma API responses to Domain entities for type safety
export const figmaApiToDomain = (apiResponse: any): FigmaNode => {
  if (!apiResponse) {
    throw new Error('Invalid Figma API response: response is null or undefined');
  }

  return {
    id: apiResponse.id,
    name: apiResponse.name,
    type: apiResponse.type,
    children: apiResponse.children?.map((child: any) => figmaApiToDomain(child)),
    absoluteBoundingBox: apiResponse.absoluteBoundingBox ? {
      x: apiResponse.absoluteBoundingBox.x,
      y: apiResponse.absoluteBoundingBox.y,
      width: apiResponse.absoluteBoundingBox.width,
      height: apiResponse.absoluteBoundingBox.height,
    } : undefined,
    fills: apiResponse.fills?.map(mapPaintToDomain),
    strokes: apiResponse.strokes?.map(mapPaintToDomain),
    strokeWeight: apiResponse.strokeWeight,
    strokeAlign: apiResponse.strokeAlign,
    effects: apiResponse.effects?.map(mapEffectToDomain),
    characters: apiResponse.characters,
    style: apiResponse.style ? mapTypeStyleToDomain(apiResponse.style) : undefined,
    layoutMode: apiResponse.layoutMode,
    layoutPositioning: apiResponse.layoutPositioning,
    counterAxisSizingMode: apiResponse.counterAxisSizingMode,
    primaryAxisSizingMode: apiResponse.primaryAxisSizingMode,
    counterAxisAlignItems: apiResponse.counterAxisAlignItems,
    primaryAxisAlignItems: apiResponse.primaryAxisAlignItems,
    paddingLeft: apiResponse.paddingLeft,
    paddingRight: apiResponse.paddingRight,
    paddingTop: apiResponse.paddingTop,
    paddingBottom: apiResponse.paddingBottom,
    itemSpacing: apiResponse.itemSpacing,
    backgroundColor: apiResponse.backgroundColor ? mapColorToDomain(apiResponse.backgroundColor) : undefined,
    opacity: apiResponse.opacity,
    visible: apiResponse.visible,
    cornerRadius: apiResponse.cornerRadius,
    rectangleCornerRadii: apiResponse.rectangleCornerRadii,
    constraints: apiResponse.constraints ? mapLayoutConstraintToDomain(apiResponse.constraints) : undefined,
  };
};

// Maps Paint object from API to domain
const mapPaintToDomain = (apiPaint: any): Paint => {
  return {
    type: apiPaint.type,
    color: apiPaint.color ? mapColorToDomain(apiPaint.color) : undefined,
    opacity: apiPaint.opacity,
    visible: apiPaint.visible,
    gradientHandlePositions: apiPaint.gradientHandlePositions?.map(mapVectorToDomain),
    gradientStops: apiPaint.gradientStops?.map(mapColorStopToDomain),
    scaleMode: apiPaint.scaleMode,
    imageRef: apiPaint.imageRef,
  };
};

// Maps Color object from API to domain
const mapColorToDomain = (apiColor: any): Color => {
  // handles null/undefined color objects from API
  if (!apiColor) {
    return { r: 0, g: 0, b: 0, a: 1 };
  }
  
  return {
    r: apiColor.r ?? 0,
    g: apiColor.g ?? 0,
    b: apiColor.b ?? 0,
    a: apiColor.a ?? 1,
  };
};

// Maps Effect object from API to domain
const mapEffectToDomain = (apiEffect: any): Effect => {
  return {
    type: apiEffect.type,
    visible: apiEffect.visible ?? true,
    radius: apiEffect.radius ?? 0,
    color: apiEffect.color ? mapColorToDomain(apiEffect.color) : undefined,
    offset: apiEffect.offset ? mapVectorToDomain(apiEffect.offset) : undefined,
    spread: apiEffect.spread,
  };
};

// Maps TypeStyle object from API to domain
const mapTypeStyleToDomain = (apiStyle: any): TypeStyle => {
  return {
    fontFamily: apiStyle.fontFamily,
    fontPostScriptName: apiStyle.fontPostScriptName,
    fontWeight: apiStyle.fontWeight,
    fontSize: apiStyle.fontSize,
    textAlignHorizontal: apiStyle.textAlignHorizontal,
    textAlignVertical: apiStyle.textAlignVertical,
    letterSpacing: apiStyle.letterSpacing,
    lineHeightPx: apiStyle.lineHeightPx,
    lineHeightPercent: apiStyle.lineHeightPercent,
  };
};

// Maps Vector object from API to domain
const mapVectorToDomain = (apiVector: any): Vector => {
  // handles null/undefined vector objects from API
  if (!apiVector) {
    return { x: 0, y: 0 };
  }
  
  return {
    x: apiVector.x ?? 0,
    y: apiVector.y ?? 0,
  };
};

// Maps ColorStop object from API to domain
const mapColorStopToDomain = (apiColorStop: any): ColorStop => {
  // handles null/undefined color stop objects from API
  if (!apiColorStop) {
    return { position: 0, color: { r: 0, g: 0, b: 0, a: 1 } };
  }
  
  return {
    position: apiColorStop.position ?? 0,
    color: mapColorToDomain(apiColorStop.color),
  };
};

// Maps LayoutConstraint object from API to domain
const mapLayoutConstraintToDomain = (apiConstraint: any): LayoutConstraint => {
  return {
    vertical: apiConstraint.vertical,
    horizontal: apiConstraint.horizontal,
  };
};

// Maps domain FigmaNode back to Figma API format
export const domainToFigmaApi = (node: FigmaNode): any => {
  return {
    id: node.id,
    name: node.name,
    type: node.type,
    children: node.children?.map(domainToFigmaApi),
    absoluteBoundingBox: node.absoluteBoundingBox,
    fills: node.fills?.map(mapPaintToApi),
    strokes: node.strokes?.map(mapPaintToApi),
    strokeWeight: node.strokeWeight,
    strokeAlign: node.strokeAlign,
    effects: node.effects?.map(mapEffectToApi),
    characters: node.characters,
    style: node.style ? mapTypeStyleToApi(node.style) : undefined,
    layoutMode: node.layoutMode,
    layoutPositioning: node.layoutPositioning,
    counterAxisSizingMode: node.counterAxisSizingMode,
    primaryAxisSizingMode: node.primaryAxisSizingMode,
    counterAxisAlignItems: node.counterAxisAlignItems,
    primaryAxisAlignItems: node.primaryAxisAlignItems,
    paddingLeft: node.paddingLeft,
    paddingRight: node.paddingRight,
    paddingTop: node.paddingTop,
    paddingBottom: node.paddingBottom,
    itemSpacing: node.itemSpacing,
    backgroundColor: node.backgroundColor,
    opacity: node.opacity,
    visible: node.visible,
    cornerRadius: node.cornerRadius,
    rectangleCornerRadii: node.rectangleCornerRadii,
    constraints: node.constraints,
  };
};

// Maps domain Paint back to API format
const mapPaintToApi = (paint: Paint): any => {
  return {
    type: paint.type,
    color: paint.color,
    opacity: paint.opacity,
    visible: paint.visible,
    gradientHandlePositions: paint.gradientHandlePositions,
    gradientStops: paint.gradientStops,
    scaleMode: paint.scaleMode,
    imageRef: paint.imageRef,
  };
};

// Maps domain Effect back to API format
const mapEffectToApi = (effect: Effect): any => {
  return {
    type: effect.type,
    visible: effect.visible,
    radius: effect.radius,
    color: effect.color,
    offset: effect.offset,
    spread: effect.spread,
  };
};

// Maps domain TypeStyle back to API format
const mapTypeStyleToApi = (style: TypeStyle): any => {
  return {
    fontFamily: style.fontFamily,
    fontPostScriptName: style.fontPostScriptName,
    fontWeight: style.fontWeight,
    fontSize: style.fontSize,
    textAlignHorizontal: style.textAlignHorizontal,
    textAlignVertical: style.textAlignVertical,
    letterSpacing: style.letterSpacing,
    lineHeightPx: style.lineHeightPx,
    lineHeightPercent: style.lineHeightPercent,
  };
};

// backward compatibility alias for existing code
export const figmaApiMapper = figmaApiToDomain;