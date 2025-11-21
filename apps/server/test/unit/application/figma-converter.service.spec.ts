import { FigmaConverterService } from '../../../src/modules/figma/application/figma-converter.service';
import { FigmaNode, Color } from '../../../src/modules/figma/domain/figma.types';

// unit tests for the FigmaConverterService
describe('FigmaConverterService', () => {
    let service: FigmaConverterService;

    // setup before each test to reset the service and mock console.log
    beforeEach(() => {
        service = new FigmaConverterService();
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    // cleanup after each test to restore console.log
    afterEach(() => {
        jest.restoreAllMocks();
    });

    // describe the convert method
    describe('convert', () => {
        // verifies that the convert method exists on the service
        it('should be defined', () => {
            expect(service.convert).toBeDefined();
        });

        // tests basic conversion of a frame node to HTML div and CSS with width/height
        it('should convert simple FRAME to HTML and CSS', () => {
            const mockNode: FigmaNode = {
                id: '1:1',
                name: 'Test Frame',
                type: 'FRAME',
                absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 50 },
            };

            const result = service.convert(mockNode);

            expect(result).toHaveProperty('html');
            expect(result).toHaveProperty('css');
            expect(result.html).toContain('<div class="node-1-1"></div>');
            expect(result.css).toContain('.node-1-1 { width: 100px; height: 50px; }');
        });

        // checks that global CSS resets and body styles are included in output
        it('should include base CSS styles', () => {
            const mockNode: FigmaNode = {
                id: '1:1',
                name: 'Test Frame',
                type: 'FRAME',
            };

            const result = service.convert(mockNode);

            expect(result.css).toContain('body {');
            expect(result.css).toContain('font-family: sans-serif;');
            expect(result.css).toContain('* { box-sizing: border-box; }');
        });

        // tests the artboard discovery algorithm that finds FRAME nodes in nested structure
        it('should find and convert artboard from nested structure', () => {
            const mockNode: FigmaNode = {
                id: '0:0',
                name: 'Document',
                type: 'DOCUMENT',
                children: [
                    {
                        id: '1:0',
                        name: 'Canvas',
                        type: 'CANVAS',
                        children: [
                            {
                                id: '1:1',
                                name: 'Frame',
                                type: 'FRAME',
                                absoluteBoundingBox: { x: 0, y: 0, width: 200, height: 200 },
                                children: [],
                            },
                        ],
                    },
                ],
            };

            const result = service.convert(mockNode);

            expect(result.html).toContain('<div class="node-1-1"></div>');
            expect(result.css).toContain('.node-1-1 { width: 200px; height: 200px; }');
        });

        // ensures fallback to root node when no artboard (FRAME with children) exists
        it('should use root node if no artboard found', () => {
            const mockNode: FigmaNode = {
                id: '1:1',
                name: 'Lonely Node',
                type: 'RECTANGLE',
            };

            const result = service.convert(mockNode);

            expect(result.html).toContain('node-1-1');
        });

        // tests that multiple frames are all converted
        it('should convert multiple frames', () => {
            const mockNode: FigmaNode = {
                id: '0:0',
                name: 'Document',
                type: 'DOCUMENT',
                children: [
                    {
                        id: '1:0',
                        name: 'Canvas',
                        type: 'CANVAS',
                        children: [
                            {
                                id: '1:1',
                                name: 'Frame 1',
                                type: 'FRAME',
                                absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 100 },
                                children: [],
                            },
                            {
                                id: '1:2',
                                name: 'Frame 2',
                                type: 'FRAME',
                                absoluteBoundingBox: { x: 150, y: 0, width: 100, height: 100 },
                                children: [],
                            },
                            {
                                id: '1:3',
                                name: 'Frame 3',
                                type: 'FRAME',
                                absoluteBoundingBox: { x: 300, y: 0, width: 100, height: 100 },
                                children: [],
                            },
                        ],
                    },
                ],
            };

            const result = service.convert(mockNode);

            expect(result.html).toContain('node-1-1');
            expect(result.html).toContain('node-1-2');
            expect(result.html).toContain('node-1-3');
            expect(result.html).toContain('artboards-container');
        });

        // tests that single frame does not wrap in container
        it('should not wrap single frame in container', () => {
            const mockNode: FigmaNode = {
                id: '0:0',
                name: 'Document',
                type: 'DOCUMENT',
                children: [
                    {
                        id: '1:0',
                        name: 'Canvas',
                        type: 'CANVAS',
                        children: [
                            {
                                id: '1:1',
                                name: 'Frame',
                                type: 'FRAME',
                                absoluteBoundingBox: { x: 0, y: 0, width: 200, height: 200 },
                                children: [],
                            },
                        ],
                    },
                ],
            };

            const result = service.convert(mockNode);

            expect(result.html).toContain('node-1-1');
            expect(result.html).not.toContain('artboards-container');
        });

        // tests that artboard container CSS is included for multiple frames
        it('should include artboards container styles for multiple frames', () => {
            const mockNode: FigmaNode = {
                id: '0:0',
                name: 'Document',
                type: 'DOCUMENT',
                children: [
                    {
                        id: '1:0',
                        name: 'Canvas',
                        type: 'CANVAS',
                        children: [
                            {
                                id: '1:1',
                                name: 'Frame 1',
                                type: 'FRAME',
                                children: [],
                            },
                            {
                                id: '1:2',
                                name: 'Frame 2',
                                type: 'FRAME',
                                children: [],
                            },
                        ],
                    },
                ],
            };

            const result = service.convert(mockNode);

            expect(result.css).toContain('.artboards-container');
            expect(result.css).toContain('display: flex');
            expect(result.css).toContain('gap: 32px');
        });

        // tests that all artboards use position relative (not absolute) for proper flex layout
        it('should treat all artboards as root containers with position relative', () => {
            const mockNode: FigmaNode = {
                id: '0:0',
                name: 'Document',
                type: 'DOCUMENT',
                children: [
                    {
                        id: '1:0',
                        name: 'Canvas',
                        type: 'CANVAS',
                        children: [
                            {
                                id: '1:1',
                                name: 'Frame 1',
                                type: 'FRAME',
                                absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 100 },
                                children: [],
                            },
                            {
                                id: '1:2',
                                name: 'Frame 2',
                                type: 'FRAME',
                                absoluteBoundingBox: { x: 150, y: 0, width: 100, height: 100 },
                                children: [],
                            },
                            {
                                id: '1:3',
                                name: 'Frame 3',
                                type: 'FRAME',
                                absoluteBoundingBox: { x: 300, y: 0, width: 100, height: 100 },
                                children: [],
                            },
                        ],
                    },
                ],
            };

            const result = service.convert(mockNode);

            // All artboards should have position: relative (from isRoot=true)
            const frame1Styles = result.css.match(/\.node-1-1 \{[^}]+\}/)?.[0] || '';
            const frame2Styles = result.css.match(/\.node-1-2 \{[^}]+\}/)?.[0] || '';
            const frame3Styles = result.css.match(/\.node-1-3 \{[^}]+\}/)?.[0] || '';

            expect(frame1Styles).toContain('position: relative');
            expect(frame2Styles).toContain('position: relative');
            expect(frame3Styles).toContain('position: relative');

            // None should have position: absolute
            expect(frame1Styles).not.toContain('position: absolute');
            expect(frame2Styles).not.toContain('position: absolute');
            expect(frame3Styles).not.toContain('position: absolute');
        });
    });

    describe('HTML generation', () => {
        // verifies recursive processing creates nested divs for parent-child relationships
        it('should generate nested HTML structure', () => {
            const mockNode: FigmaNode = {
                id: '1:1',
                name: 'Parent',
                type: 'FRAME',
                children: [
                    {
                        id: '1:2',
                        name: 'Child1',
                        type: 'FRAME',
                    },
                    {
                        id: '1:3',
                        name: 'Child2',
                        type: 'FRAME',
                    },
                ],
            };

            const result = service.convert(mockNode);

            expect(result.html).toContain('node-1-1');
            expect(result.html).toContain('node-1-2');
            expect(result.html).toContain('node-1-3');
        });

        // tests XSS prevention by escaping < > characters in text content
        it('should escape HTML characters in text', () => {
            const mockNode: FigmaNode = {
                id: '1:1',
                name: 'Frame',
                type: 'FRAME',
                children: [
                    {
                        id: '1:2',
                        name: 'Text',
                        type: 'TEXT',
                        characters: '<script>alert("XSS")</script>',
                    },
                ],
            };

            const result = service.convert(mockNode);

            expect(result.html).toContain('&lt;script&gt;');
            expect(result.html).not.toContain('<script>');
        });

        // ensures ampersands are properly encoded to &amp; entity
        it('should escape ampersands in text', () => {
            const mockNode: FigmaNode = {
                id: '1:1',
                name: 'Frame',
                type: 'FRAME',
                children: [
                    {
                        id: '1:2',
                        name: 'Text',
                        type: 'TEXT',
                        characters: 'Ben & Jerry',
                    },
                ],
            };

            const result = service.convert(mockNode);

            expect(result.html).toContain('Ben &amp; Jerry');
        });

        // tests that \n newline characters are converted to HTML <br/> tags
        it('should convert newlines to <br/> tags', () => {
            const mockNode: FigmaNode = {
                id: '1:1',
                name: 'Frame',
                type: 'FRAME',
                children: [
                    {
                        id: '1:2',
                        name: 'Text',
                        type: 'TEXT',
                        characters: 'Line 1\nLine 2\nLine 3',
                    },
                ],
            };

            const result = service.convert(mockNode);

            expect(result.html).toContain('Line 1<br/>Line 2<br/>Line 3');
        });

        // verifies nodes with visible: false are not rendered in HTML output
        it('should skip invisible nodes', () => {
            const mockNode: FigmaNode = {
                id: '1:1',
                name: 'Frame',
                type: 'FRAME',
                children: [
                    {
                        id: '1:2',
                        name: 'Visible',
                        type: 'TEXT',
                        characters: 'Visible',
                        visible: true,
                    },
                    {
                        id: '1:3',
                        name: 'Hidden',
                        type: 'TEXT',
                        characters: 'Hidden',
                        visible: false,
                    },
                ],
            };

            const result = service.convert(mockNode);

            expect(result.html).toContain('Visible');
            expect(result.html).not.toContain('Hidden');
        });

        // tests that colons in Figma node IDs are replaced with hyphens for valid CSS
        it('should sanitize node IDs for CSS class names', () => {
            const mockNode: FigmaNode = {
                id: '1:2:3',
                name: 'Frame',
                type: 'FRAME',
            };

            const result = service.convert(mockNode);

            expect(result.html).toContain('node-1-2-3');
            expect(result.css).toContain('.node-1-2-3');
        });
    });

    describe('CSS positioning', () => {
        // tests absolute positioning with calculated left/top values relative to parent
        it('should generate absolute positioning for child nodes', () => {
            const mockNode: FigmaNode = {
                id: '1:1',
                name: 'Parent',
                type: 'FRAME',
                absoluteBoundingBox: { x: 0, y: 0, width: 200, height: 200 },
                children: [
                    {
                        id: '1:2',
                        name: 'Child',
                        type: 'FRAME',
                        absoluteBoundingBox: { x: 50, y: 75, width: 100, height: 50 },
                    },
                ],
            };

            const result = service.convert(mockNode);

            expect(result.css).toContain('position: absolute');
            expect(result.css).toContain('left: 50px');
            expect(result.css).toContain('top: 75px');
        });

        // ensures children of auto-layout containers use static positioning (flexbox handles position)
        it('should generate static positioning for auto-layout children', () => {
            const mockNode: FigmaNode = {
                id: '1:1',
                name: 'Parent',
                type: 'FRAME',
                layoutMode: 'HORIZONTAL',
                absoluteBoundingBox: { x: 0, y: 0, width: 200, height: 100 },
                children: [
                    {
                        id: '1:2',
                        name: 'Child',
                        type: 'FRAME',
                        absoluteBoundingBox: { x: 10, y: 10, width: 50, height: 50 },
                    },
                ],
            };

            const result = service.convert(mockNode);

            expect(result.css).toContain('position: static');
        });

        // tests conversion of Figma's horizontal auto-layout to CSS flexbox with row direction
        it('should generate flexbox for horizontal auto-layout', () => {
            const mockNode: FigmaNode = {
                id: '1:1',
                name: 'Container',
                type: 'FRAME',
                layoutMode: 'HORIZONTAL',
                itemSpacing: 16,
                paddingTop: 10,
                paddingRight: 20,
                paddingBottom: 10,
                paddingLeft: 20,
            };

            const result = service.convert(mockNode);

            expect(result.css).toContain('display: flex');
            expect(result.css).toContain('flex-direction: row');
            expect(result.css).toContain('gap: 16px');
            expect(result.css).toContain('padding: 10px 20px 10px 20px');
        });

        // verifies vertical auto-layout maps to flex-direction: column
        it('should generate vertical flexbox', () => {
            const mockNode: FigmaNode = {
                id: '1:1',
                name: 'Container',
                type: 'FRAME',
                layoutMode: 'VERTICAL',
            };

            const result = service.convert(mockNode);

            expect(result.css).toContain('flex-direction: column');
        });
    });

    describe('CSS backgrounds and fills', () => {
        // tests solid fill conversion to CSS rgba background color
        it('should generate solid color background', () => {
            const mockNode: FigmaNode = {
                id: '1:1',
                name: 'Frame',
                type: 'FRAME',
                fills: [
                    {
                        type: 'SOLID',
                        color: { r: 1, g: 0, b: 0, a: 1 },
                        visible: true,
                    },
                ],
            };

            const result = service.convert(mockNode);

            expect(result.css).toContain('background: rgba(255, 0, 0, 1)');
        });

        // ensures layer opacity overrides color alpha in rgba output
        it('should handle fill opacity', () => {
            const mockNode: FigmaNode = {
                id: '1:1',
                name: 'Frame',
                type: 'FRAME',
                fills: [
                    {
                        type: 'SOLID',
                        color: { r: 0, g: 0, b: 1, a: 1 },
                        opacity: 0.5,
                        visible: true,
                    },
                ],
            };

            const result = service.convert(mockNode);

            expect(result.css).toContain('rgba(0, 0, 255, 0.5)');
        });

        // verifies only visible fills are rendered (filters out visible: false)
        it('should skip invisible fills', () => {
            const mockNode: FigmaNode = {
                id: '1:1',
                name: 'Frame',
                type: 'FRAME',
                fills: [
                    {
                        type: 'SOLID',
                        color: { r: 1, g: 0, b: 0, a: 1 },
                        visible: false,
                    },
                    {
                        type: 'SOLID',
                        color: { r: 0, g: 1, b: 0, a: 1 },
                        visible: true,
                    },
                ],
            };

            const result = service.convert(mockNode);

            expect(result.css).toContain('rgba(0, 255, 0, 1)');
            expect(result.css).not.toContain('rgba(255, 0, 0, 1)');
        });

        // tests gradient conversion including angle calculation and color stops
        it('should generate linear gradient', () => {
            const mockNode: FigmaNode = {
                id: '1:1',
                name: 'Frame',
                type: 'FRAME',
                fills: [
                    {
                        type: 'GRADIENT_LINEAR',
                        gradientHandlePositions: [
                            { x: 0, y: 0 },
                            { x: 1, y: 0 },
                        ],
                        gradientStops: [
                            { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
                            { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } },
                        ],
                        visible: true,
                    },
                ],
            };

            const result = service.convert(mockNode);

            expect(result.css).toContain('linear-gradient');
            expect(result.css).toContain('rgba(255, 0, 0, 1) 0%');
            expect(result.css).toContain('rgba(0, 0, 255, 1) 100%');
        });

        // verifies image fills are converted to CSS background url with cover sizing
        it('should generate image background', () => {
            const mockNode: FigmaNode = {
                id: '1:1',
                name: 'Frame',
                type: 'FRAME',
                fills: [
                    {
                        type: 'IMAGE',
                        imageRef: 'https://example.com/image.png',
                        visible: true,
                    },
                ],
            };

            const result = service.convert(mockNode);

            expect(result.css).toContain('url(https://example.com/image.png)');
            expect(result.css).toContain('center / cover no-repeat');
        });
    });

    describe('CSS borders and effects', () => {
        // tests stroke conversion to CSS border with weight, style, and color
        it('should generate border from strokes', () => {
            const mockNode: FigmaNode = {
                id: '1:1',
                name: 'Frame',
                type: 'FRAME',
                strokes: [
                    {
                        type: 'SOLID',
                        color: { r: 0, g: 0, b: 0, a: 1 },
                        visible: true,
                    },
                ],
                strokeWeight: 2,
            };

            const result = service.convert(mockNode);

            expect(result.css).toContain('border: 2px solid rgba(0, 0, 0, 1)');
        });

        // verifies single cornerRadius value is converted to CSS border-radius
        it('should generate border-radius', () => {
            const mockNode: FigmaNode = {
                id: '1:1',
                name: 'Frame',
                type: 'FRAME',
                cornerRadius: 8,
            };

            const result = service.convert(mockNode);

            expect(result.css).toContain('border-radius: 8px');
        });

        // tests that rectangleCornerRadii array maps to four-value border-radius
        it('should generate individual corner radii', () => {
            const mockNode: FigmaNode = {
                id: '1:1',
                name: 'Frame',
                type: 'FRAME',
                rectangleCornerRadii: [8, 16, 24, 32],
            };

            const result = service.convert(mockNode);

            expect(result.css).toContain('border-radius: 8px 16px 24px 32px');
        });

        // tests DROP_SHADOW effect conversion to CSS box-shadow with offset, blur, and color
        it('should generate drop shadow', () => {
            const mockNode: FigmaNode = {
                id: '1:1',
                name: 'Frame',
                type: 'FRAME',
                effects: [
                    {
                        type: 'DROP_SHADOW',
                        visible: true,
                        radius: 4,
                        offset: { x: 2, y: 2 },
                        spread: 0,
                        color: { r: 0, g: 0, b: 0, a: 0.25 },
                    },
                ],
            };

            const result = service.convert(mockNode);

            expect(result.css).toContain('box-shadow');
            expect(result.css).toContain('2px 2px 4px 0px');
            expect(result.css).toContain('rgba(0, 0, 0, 0.25)');
        });

        // verifies INNER_SHADOW adds 'inset' keyword to box-shadow
        it('should generate inner shadow', () => {
            const mockNode: FigmaNode = {
                id: '1:1',
                name: 'Frame',
                type: 'FRAME',
                effects: [
                    {
                        type: 'INNER_SHADOW',
                        visible: true,
                        radius: 4,
                        offset: { x: 0, y: 2 },
                        spread: 0,
                        color: { r: 0, g: 0, b: 0, a: 0.1 },
                    },
                ],
            };

            const result = service.convert(mockNode);

            expect(result.css).toContain('inset 0px 2px 4px');
        });

        // ensures effects with visible: false are not rendered in CSS
        it('should skip invisible effects', () => {
            const mockNode: FigmaNode = {
                id: '1:1',
                name: 'Frame',
                type: 'FRAME',
                effects: [
                    {
                        type: 'DROP_SHADOW',
                        visible: false,
                        radius: 4,
                        color: { r: 0, g: 0, b: 0, a: 0.25 },
                    },
                ],
            };

            const result = service.convert(mockNode);

            expect(result.css).not.toContain('box-shadow');
        });
    });

    describe('CSS typography', () => {
        // tests complete typography conversion: font-family, size, weight, line-height, text-align
        it('should generate typography styles for text nodes', () => {
            const mockNode: FigmaNode = {
                id: '1:1',
                name: 'Frame',
                type: 'FRAME',
                children: [
                    {
                        id: '1:2',
                        name: 'Text',
                        type: 'TEXT',
                        characters: 'Hello World',
                        style: {
                            fontFamily: 'Inter',
                            fontPostScriptName: 'Inter-Regular',
                            fontWeight: 400,
                            fontSize: 16,
                            textAlignHorizontal: 'CENTER',
                            textAlignVertical: 'CENTER',
                            letterSpacing: 0,
                            lineHeightPx: 24,
                            lineHeightPercent: 150,
                        },
                    },
                ],
            };

            const result = service.convert(mockNode);

            expect(result.css).toContain("font-family: 'Inter', sans-serif");
            expect(result.css).toContain('font-size: 16px');
            expect(result.css).toContain('font-weight: 400');
            expect(result.css).toContain('line-height: 24px');
            expect(result.css).toContain('text-align: center');
        });

        // verifies text node fills are converted to CSS color property instead of background
        it('should apply text color from fills', () => {
            const mockNode: FigmaNode = {
                id: '1:1',
                name: 'Frame',
                type: 'FRAME',
                children: [
                    {
                        id: '1:2',
                        name: 'Text',
                        type: 'TEXT',
                        characters: 'Colored Text',
                        style: {
                            fontFamily: 'Inter',
                            fontPostScriptName: 'Inter-Regular',
                            fontWeight: 400,
                            fontSize: 16,
                            textAlignHorizontal: 'LEFT',
                            textAlignVertical: 'TOP',
                            letterSpacing: 0,
                            lineHeightPx: 24,
                            lineHeightPercent: 150,
                        },
                        fills: [
                            {
                                type: 'SOLID',
                                color: { r: 1, g: 0, b: 0, a: 1 },
                                visible: true,
                            },
                        ],
                    },
                ],
            };

            const result = service.convert(mockNode);

            expect(result.css).toContain('color: rgba(255, 0, 0, 1)');
        });
    });

    describe('rgba helper', () => {
        // tests color conversion from Figma's 0-1 range to CSS 0-255 rgba format
        it('should convert normalized color to CSS rgba', () => {
            const color: Color = { r: 0.5, g: 0.25, b: 1.0, a: 0.8 };
            const rgba = (service as any).rgba(color);

            expect(rgba).toBe('rgba(128, 64, 255, 0.8)');
        });

        // ensures opacityOverride parameter replaces color's alpha channel
        it('should handle opacity override', () => {
            const color: Color = { r: 1, g: 0, b: 0, a: 1 };
            const rgba = (service as any).rgba(color, 0.5);

            expect(rgba).toBe('rgba(255, 0, 0, 0.5)');
        });

        // tests fallback to alpha=1 when color object is missing 'a' property
        it('should default to alpha 1 if not provided', () => {
            const color: any = { r: 0, g: 1, b: 0 };
            const rgba = (service as any).rgba(color);

            expect(rgba).toBe('rgba(0, 255, 0, 1)');
        });

        // verifies null/undefined colors are handled gracefully with 'transparent' keyword
        it('should return transparent for null color', () => {
            const rgba = (service as any).rgba(null);

            expect(rgba).toBe('transparent');
        });
    });

    describe('edge cases', () => {
        // tests that nodes with empty children array don't cause errors
        it('should handle empty children array', () => {
            const mockNode: FigmaNode = {
                id: '1:1',
                name: 'Frame',
                type: 'FRAME',
                children: [],
            };

            const result = service.convert(mockNode);

            expect(result.html).toBeTruthy();
            expect(result.css).toBeTruthy();
        });

        // ensures nodes missing absoluteBoundingBox property don't cause crashes
        it('should handle node without absoluteBoundingBox', () => {
            const mockNode: FigmaNode = {
                id: '1:1',
                name: 'Frame',
                type: 'FRAME',
            };

            const result = service.convert(mockNode);

            expect(result.html).toContain('node-1-1');
        });

        // tests that TEXT nodes missing characters property render empty div
        it('should handle text node without characters', () => {
            const mockNode: FigmaNode = {
                id: '1:1',
                name: 'Frame',
                type: 'FRAME',
                children: [
                    {
                        id: '1:2',
                        name: 'Text',
                        type: 'TEXT',
                    },
                ],
            };

            const result = service.convert(mockNode);

            expect(result.html).toContain('node-1-2');
        });

        // verifies gradients missing gradientStops don't crash the converter
        it('should handle gradient without stops', () => {
            const mockNode: FigmaNode = {
                id: '1:1',
                name: 'Frame',
                type: 'FRAME',
                fills: [
                    {
                        type: 'GRADIENT_LINEAR',
                        visible: true,
                    },
                ],
            };

            const result = service.convert(mockNode);

            expect(result.html).toBeTruthy();
        });
    });
});