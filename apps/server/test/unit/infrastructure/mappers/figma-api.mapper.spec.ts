import { figmaApiToDomain, domainToFigmaApi } from '../../../../src/modules/figma/infrastructure/mappers/figma-api.mapper';
import { FigmaNode } from '../../../../src/modules/figma/domain/figma.types';

// unit tests for the Figma API mapper functions
describe('FigmaApiMapper', () => {
    describe('figmaApiToDomain', () => {
        // tests basic mapping of required fields
        it('should map basic node properties', () => {
            const apiNode = {
                id: '1:1',
                name: 'Frame',
                type: 'FRAME',
            };

            const result = figmaApiToDomain(apiNode);

            expect(result.id).toBe('1:1');
            expect(result.name).toBe('Frame');
            expect(result.type).toBe('FRAME');
        });

        // tests that null/undefined input throws error
        it('should throw error for null input', () => {
            expect(() => figmaApiToDomain(null)).toThrow('Invalid Figma API response');
        });

        // tests that undefined input throws error
        it('should throw error for undefined input', () => {
            expect(() => figmaApiToDomain(undefined)).toThrow('Invalid Figma API response');
        });

        // tests mapping of absoluteBoundingBox
        it('should map absoluteBoundingBox', () => {
            const apiNode = {
                id: '1:1',
                name: 'Frame',
                type: 'FRAME',
                absoluteBoundingBox: { x: 10, y: 20, width: 100, height: 50 },
            };

            const result = figmaApiToDomain(apiNode);

            expect(result.absoluteBoundingBox).toEqual({ x: 10, y: 20, width: 100, height: 50 });
        });

        // tests recursive mapping of children nodes
        it('should recursively map children', () => {
            const apiNode = {
                id: '1:1',
                name: 'Parent',
                type: 'FRAME',
                children: [
                    { id: '1:2', name: 'Child1', type: 'RECTANGLE' },
                    { id: '1:3', name: 'Child2', type: 'TEXT' },
                ],
            };

            const result = figmaApiToDomain(apiNode);

            expect(result.children).toBeDefined();
            expect(result.children?.length).toBe(2);
            expect(result.children?.[0].id).toBe('1:2');
            expect(result.children?.[1].id).toBe('1:3');
        });

        // tests mapping of fill Paint objects
        it('should map fills array', () => {
            const apiNode = {
                id: '1:1',
                name: 'Frame',
                type: 'FRAME',
                fills: [
                    {
                        type: 'SOLID',
                        color: { r: 1, g: 0, b: 0, a: 1 },
                        opacity: 1,
                        visible: true,
                    },
                ],
            };

            const result = figmaApiToDomain(apiNode);

            expect(result.fills).toBeDefined();
            expect(result.fills?.length).toBe(1);
            expect(result.fills?.[0].type).toBe('SOLID');
            expect(result.fills?.[0].color).toEqual({ r: 1, g: 0, b: 0, a: 1 });
        });

        // tests mapping of stroke Paint objects
        it('should map strokes array', () => {
            const apiNode = {
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

            const result = figmaApiToDomain(apiNode);

            expect(result.strokes).toBeDefined();
            expect(result.strokes?.length).toBe(1);
            expect(result.strokeWeight).toBe(2);
        });

        // tests mapping of effects (shadows)
        it('should map effects array', () => {
            const apiNode = {
                id: '1:1',
                name: 'Frame',
                type: 'FRAME',
                effects: [
                    {
                        type: 'DROP_SHADOW',
                        visible: true,
                        radius: 4,
                        offset: { x: 2, y: 2 },
                        color: { r: 0, g: 0, b: 0, a: 0.25 },
                    },
                ],
            };

            const result = figmaApiToDomain(apiNode);

            expect(result.effects).toBeDefined();
            expect(result.effects?.length).toBe(1);
            expect(result.effects?.[0].type).toBe('DROP_SHADOW');
            expect(result.effects?.[0].radius).toBe(4);
        });

        // tests mapping of TypeStyle for text nodes
        it('should map text style', () => {
            const apiNode = {
                id: '1:1',
                name: 'Text',
                type: 'TEXT',
                characters: 'Hello',
                style: {
                    fontFamily: 'Inter',
                    fontWeight: 400,
                    fontSize: 16,
                    textAlignHorizontal: 'CENTER',
                },
            };

            const result = figmaApiToDomain(apiNode);

            expect(result.style).toBeDefined();
            expect(result.style?.fontFamily).toBe('Inter');
            expect(result.style?.fontSize).toBe(16);
            expect(result.characters).toBe('Hello');
        });

        // tests default values for missing color channels
        it('should provide default values for missing color channels', () => {
            const apiNode = {
                id: '1:1',
                name: 'Frame',
                type: 'FRAME',
                fills: [
                    {
                        type: 'SOLID',
                        color: { r: 1 }, // missing g, b, a
                    },
                ],
            };

            const result = figmaApiToDomain(apiNode);

            expect(result.fills?.[0].color).toEqual({ r: 1, g: 0, b: 0, a: 1 });
        });

        // tests mapping of layout properties (auto-layout)
        it('should map layout properties', () => {
            const apiNode = {
                id: '1:1',
                name: 'Frame',
                type: 'FRAME',
                layoutMode: 'HORIZONTAL',
                itemSpacing: 16,
                paddingTop: 10,
                paddingRight: 20,
                paddingBottom: 10,
                paddingLeft: 20,
            };

            const result = figmaApiToDomain(apiNode);

            expect(result.layoutMode).toBe('HORIZONTAL');
            expect(result.itemSpacing).toBe(16);
            expect(result.paddingTop).toBe(10);
            expect(result.paddingRight).toBe(20);
        });

        // tests mapping of corner radius properties
        it('should map corner radius', () => {
            const apiNode = {
                id: '1:1',
                name: 'Frame',
                type: 'FRAME',
                cornerRadius: 8,
            };

            const result = figmaApiToDomain(apiNode);

            expect(result.cornerRadius).toBe(8);
        });

        // tests mapping of individual corner radii
        it('should map rectangleCornerRadii', () => {
            const apiNode = {
                id: '1:1',
                name: 'Frame',
                type: 'FRAME',
                rectangleCornerRadii: [8, 16, 24, 32],
            };

            const result = figmaApiToDomain(apiNode);

            expect(result.rectangleCornerRadii).toEqual([8, 16, 24, 32]);
        });

        // tests mapping of gradient fills
        it('should map gradient fills', () => {
            const apiNode = {
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
                    },
                ],
            };

            const result = figmaApiToDomain(apiNode);

            expect(result.fills?.[0].type).toBe('GRADIENT_LINEAR');
            expect(result.fills?.[0].gradientHandlePositions?.length).toBe(2);
            expect(result.fills?.[0].gradientStops?.length).toBe(2);
        });

        // tests mapping of opacity and visibility
        it('should map opacity and visibility', () => {
            const apiNode = {
                id: '1:1',
                name: 'Frame',
                type: 'FRAME',
                opacity: 0.5,
                visible: false,
            };

            const result = figmaApiToDomain(apiNode);

            expect(result.opacity).toBe(0.5);
            expect(result.visible).toBe(false);
        });

        // tests mapping of background color
        it('should map backgroundColor', () => {
            const apiNode = {
                id: '1:1',
                name: 'Frame',
                type: 'FRAME',
                backgroundColor: { r: 1, g: 1, b: 1, a: 1 },
            };

            const result = figmaApiToDomain(apiNode);

            expect(result.backgroundColor).toEqual({ r: 1, g: 1, b: 1, a: 1 });
        });

        // tests that undefined optional properties are not mapped
        it('should not map undefined optional properties', () => {
            const apiNode = {
                id: '1:1',
                name: 'Frame',
                type: 'FRAME',
            };

            const result = figmaApiToDomain(apiNode);

            expect(result.children).toBeUndefined();
            expect(result.fills).toBeUndefined();
            expect(result.absoluteBoundingBox).toBeUndefined();
        });

        // tests that null color objects are handled gracefully
        it('should handle null color in fills', () => {
            const apiNode = {
                id: '1:1',
                name: 'Frame',
                type: 'FRAME',
                fills: [
                    {
                        type: 'SOLID',
                        color: null,
                    },
                ],
            };

            const result = figmaApiToDomain(apiNode);

            expect(result.fills?.[0].color).toEqual({ r: 0, g: 0, b: 0, a: 1 });
        });

        // tests that null vector objects are handled gracefully
        it('should handle null offset in effects', () => {
            const apiNode = {
                id: '1:1',
                name: 'Frame',
                type: 'FRAME',
                effects: [
                    {
                        type: 'DROP_SHADOW',
                        offset: null,
                    },
                ],
            };

            const result = figmaApiToDomain(apiNode);

            expect(result.effects?.[0].offset).toEqual({ x: 0, y: 0 });
        });

        // tests that null gradient stops are handled gracefully
        it('should handle null color in gradient stops', () => {
            const apiNode = {
                id: '1:1',
                name: 'Frame',
                type: 'FRAME',
                fills: [
                    {
                        type: 'GRADIENT_LINEAR',
                        gradientStops: [
                            { position: 0, color: null },
                            { position: 1, color: { r: 1, g: 0, b: 0, a: 1 } },
                        ],
                    },
                ],
            };

            const result = figmaApiToDomain(apiNode);

            expect(result.fills?.[0].gradientStops?.[0].color).toEqual({ r: 0, g: 0, b: 0, a: 1 });
            expect(result.fills?.[0].gradientStops?.[1].color).toEqual({ r: 1, g: 0, b: 0, a: 1 });
        });

        // tests that undefined backgroundColor is handled
        it('should handle undefined backgroundColor', () => {
            const apiNode = {
                id: '1:1',
                name: 'Frame',
                type: 'FRAME',
                backgroundColor: undefined,
            };

            const result = figmaApiToDomain(apiNode);

            expect(result.backgroundColor).toBeUndefined();
        });

        // tests that null backgroundColor is converted to default
        it('should handle null backgroundColor', () => {
            const apiNode = {
                id: '1:1',
                name: 'Frame',
                type: 'FRAME',
                backgroundColor: null,
            };

            const result = figmaApiToDomain(apiNode);

            expect(result.backgroundColor).toBeUndefined();
        });

        // tests that partial color objects get default values
        it('should provide defaults for partial color objects', () => {
            const apiNode = {
                id: '1:1',
                name: 'Frame',
                type: 'FRAME',
                fills: [
                    {
                        type: 'SOLID',
                        color: { r: 0.5 }, // missing g, b, a
                    },
                ],
            };

            const result = figmaApiToDomain(apiNode);

            expect(result.fills?.[0].color).toEqual({ r: 0.5, g: 0, b: 0, a: 1 });
        });
    });

    describe('domainToFigmaApi', () => {
        // tests reverse mapping from domain to API format
        it('should map domain node back to API format', () => {
            const domainNode: FigmaNode = {
                id: '1:1',
                name: 'Frame',
                type: 'FRAME',
                absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 50 },
            };

            const result = domainToFigmaApi(domainNode);

            expect(result.id).toBe('1:1');
            expect(result.name).toBe('Frame');
            expect(result.type).toBe('FRAME');
            expect(result.absoluteBoundingBox).toEqual({ x: 0, y: 0, width: 100, height: 50 });
        });

        // tests reverse mapping of children
        it('should map children back to API format', () => {
            const domainNode: FigmaNode = {
                id: '1:1',
                name: 'Parent',
                type: 'FRAME',
                children: [
                    { id: '1:2', name: 'Child', type: 'RECTANGLE' },
                ],
            };

            const result = domainToFigmaApi(domainNode);

            expect(result.children).toBeDefined();
            expect(result.children.length).toBe(1);
            expect(result.children[0].id).toBe('1:2');
        });

        // tests reverse mapping of fills
        it('should map fills back to API format', () => {
            const domainNode: FigmaNode = {
                id: '1:1',
                name: 'Frame',
                type: 'FRAME',
                fills: [
                    {
                        type: 'SOLID',
                        color: { r: 1, g: 0, b: 0, a: 1 },
                    },
                ],
            };

            const result = domainToFigmaApi(domainNode);

            expect(result.fills).toBeDefined();
            expect(result.fills[0].type).toBe('SOLID');
            expect(result.fills[0].color).toEqual({ r: 1, g: 0, b: 0, a: 1 });
        });

        // tests bidirectional mapping (roundtrip)
        it('should handle bidirectional mapping', () => {
            const apiNode = {
                id: '1:1',
                name: 'Frame',
                type: 'FRAME',
                absoluteBoundingBox: { x: 10, y: 20, width: 100, height: 50 },
                cornerRadius: 8,
            };

            const domainNode = figmaApiToDomain(apiNode);
            const backToApi = domainToFigmaApi(domainNode);

            expect(backToApi.id).toBe(apiNode.id);
            expect(backToApi.name).toBe(apiNode.name);
            expect(backToApi.absoluteBoundingBox).toEqual(apiNode.absoluteBoundingBox);
            expect(backToApi.cornerRadius).toBe(apiNode.cornerRadius);
        });
    });
});

