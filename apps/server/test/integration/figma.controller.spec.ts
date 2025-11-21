import { Test, TestingModule } from '@nestjs/testing';
import { FigmaController } from '../../src/modules/figma/presentation/figma.controller';
import { FigmaApiService } from '../../src/modules/figma/infrastructure/figma-api.service';
import { FigmaConverterService } from '../../src/modules/figma/application/figma-converter.service';
import { ConvertFigmaDto } from '../../src/modules/figma/application/dto/convert-figma.dto';
import { HttpException, HttpStatus } from '@nestjs/common';
import { FigmaNode } from '../../src/modules/figma/domain/figma.types';

// integration tests for the FigmaController
describe('FigmaController (Integration)', () => {
    let controller: FigmaController;
    let figmaApiService: FigmaApiService;
    let converterService: FigmaConverterService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [FigmaController],
            providers: [FigmaApiService, FigmaConverterService],
        }).compile();

        controller = module.get<FigmaController>(FigmaController);
        figmaApiService = module.get<FigmaApiService>(FigmaApiService);
        converterService = module.get<FigmaConverterService>(FigmaConverterService);

        // suppress console.log from converter service
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('convert endpoint', () => {
        // tests successful conversion flow from API fetch to HTML/CSS output
        it('should convert Figma file to HTML and CSS', async () => {
            const dto: ConvertFigmaDto = {
                fileKey: 'test-file-key',
                token: 'test-token',
            };

            const mockFigmaNode: FigmaNode = {
                id: '1:1',
                name: 'Frame',
                type: 'FRAME',
                absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 50 },
            };

            jest.spyOn(figmaApiService, 'getFile').mockResolvedValue(mockFigmaNode);

            const result = await controller.convert(dto);

            expect(result).toHaveProperty('html');
            expect(result).toHaveProperty('css');
            expect(result.html).toContain('div');
            expect(result.css).toContain('width');
            expect(figmaApiService.getFile).toHaveBeenCalledWith('test-file-key', 'test-token');
        });

        // tests that both services are called in correct order
        it('should call FigmaApiService and FigmaConverterService', async () => {
            const dto: ConvertFigmaDto = {
                fileKey: 'abc123',
                token: 'token123',
            };

            const mockNode: FigmaNode = {
                id: '1:1',
                name: 'Test',
                type: 'FRAME',
            };

            const getFileSpy = jest.spyOn(figmaApiService, 'getFile').mockResolvedValue(mockNode);
            const convertSpy = jest.spyOn(converterService, 'convert');

            await controller.convert(dto);

            expect(getFileSpy).toHaveBeenCalledWith('abc123', 'token123');
            expect(convertSpy).toHaveBeenCalledWith(mockNode);
        });

        // tests error handling when API service throws HttpException
        it('should propagate HttpException from FigmaApiService', async () => {
            const dto: ConvertFigmaDto = {
                fileKey: 'invalid-key',
                token: 'test-token',
            };

            const httpError = new HttpException('File not found', HttpStatus.NOT_FOUND);
            jest.spyOn(figmaApiService, 'getFile').mockRejectedValue(httpError);

            await expect(controller.convert(dto)).rejects.toThrow(HttpException);
            await expect(controller.convert(dto)).rejects.toThrow('File not found');
        });

        // tests error handling when API service throws generic error
        it('should wrap generic errors in HttpException', async () => {
            const dto: ConvertFigmaDto = {
                fileKey: 'test-key',
                token: 'test-token',
            };

            const genericError = new Error('Something went wrong');
            jest.spyOn(figmaApiService, 'getFile').mockRejectedValue(genericError);

            try {
                await controller.convert(dto);
            } catch (e) {
                expect(e).toBeInstanceOf(HttpException);
                expect(e.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
                expect(e.message).toBe('Something went wrong');
            }
        });

        // tests that converter service errors are handled
        it('should handle converter service errors', async () => {
            const dto: ConvertFigmaDto = {
                fileKey: 'test-key',
                token: 'test-token',
            };

            const mockNode: FigmaNode = {
                id: '1:1',
                name: 'Test',
                type: 'FRAME',
            };

            jest.spyOn(figmaApiService, 'getFile').mockResolvedValue(mockNode);
            jest.spyOn(converterService, 'convert').mockImplementation(() => {
                throw new Error('Conversion failed');
            });

            try {
                await controller.convert(dto);
            } catch (e) {
                expect(e).toBeInstanceOf(HttpException);
                expect(e.message).toBe('Conversion failed');
            }
        });

        // tests successful conversion with complex nested structure
        it('should handle complex Figma node structure', async () => {
            const dto: ConvertFigmaDto = {
                fileKey: 'complex-file',
                token: 'token',
            };

            const complexNode: FigmaNode = {
                id: '0:0',
                name: 'Document',
                type: 'DOCUMENT',
                children: [
                    {
                        id: '1:1',
                        name: 'Page',
                        type: 'CANVAS',
                        children: [
                            {
                                id: '2:1',
                                name: 'Frame',
                                type: 'FRAME',
                                absoluteBoundingBox: { x: 0, y: 0, width: 200, height: 100 },
                                children: [
                                    {
                                        id: '3:1',
                                        name: 'Text',
                                        type: 'TEXT',
                                        characters: 'Hello World',
                                    },
                                ],
                            },
                        ],
                    },
                ],
            };

            jest.spyOn(figmaApiService, 'getFile').mockResolvedValue(complexNode);

            const result = await controller.convert(dto);

            expect(result.html).toBeTruthy();
            expect(result.css).toBeTruthy();
            expect(result.html).toContain('Hello World');
        });

        // tests that returned object has correct structure
        it('should return object with html and css properties', async () => {
            const dto: ConvertFigmaDto = {
                fileKey: 'key',
                token: 'token',
            };

            const mockNode: FigmaNode = {
                id: '1:1',
                name: 'Frame',
                type: 'FRAME',
            };

            jest.spyOn(figmaApiService, 'getFile').mockResolvedValue(mockNode);

            const result = await controller.convert(dto);

            expect(result).toEqual(
                expect.objectContaining({
                    html: expect.any(String),
                    css: expect.any(String),
                })
            );
        });

        // tests that CSS contains base styles
        it('should include base CSS in output', async () => {
            const dto: ConvertFigmaDto = {
                fileKey: 'key',
                token: 'token',
            };

            const mockNode: FigmaNode = {
                id: '1:1',
                name: 'Frame',
                type: 'FRAME',
            };

            jest.spyOn(figmaApiService, 'getFile').mockResolvedValue(mockNode);

            const result = await controller.convert(dto);

            expect(result.css).toContain('body');
            expect(result.css).toContain('box-sizing');
        });

        // tests conversion with styled frame (fills, borders, effects)
        it('should convert frame with styles', async () => {
            const dto: ConvertFigmaDto = {
                fileKey: 'styled-key',
                token: 'token',
            };

            const styledNode: FigmaNode = {
                id: '1:1',
                name: 'Styled Frame',
                type: 'FRAME',
                absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 100 },
                fills: [
                    {
                        type: 'SOLID',
                        color: { r: 1, g: 0, b: 0, a: 1 },
                        visible: true,
                    },
                ],
                cornerRadius: 8,
            };

            jest.spyOn(figmaApiService, 'getFile').mockResolvedValue(styledNode);

            const result = await controller.convert(dto);

            expect(result.css).toContain('background');
            expect(result.css).toContain('border-radius');
        });

        // tests that DTO validation would be handled by NestJS pipes
        it('should be callable with valid DTO', async () => {
            const dto: ConvertFigmaDto = {
                fileKey: 'valid-key',
                token: 'valid-token',
            };

            const mockNode: FigmaNode = {
                id: '1:1',
                name: 'Frame',
                type: 'FRAME',
            };

            jest.spyOn(figmaApiService, 'getFile').mockResolvedValue(mockNode);

            // Should not throw
            await expect(controller.convert(dto)).resolves.toBeDefined();
        });

        // tests error handling preserves status code
        it('should preserve HTTP status code from FigmaApiService', async () => {
            const dto: ConvertFigmaDto = {
                fileKey: 'key',
                token: 'bad-token',
            };

            const forbiddenError = new HttpException('Invalid token', HttpStatus.FORBIDDEN);
            jest.spyOn(figmaApiService, 'getFile').mockRejectedValue(forbiddenError);

            try {
                await controller.convert(dto);
            } catch (e) {
                expect(e.getStatus()).toBe(HttpStatus.FORBIDDEN);
            }
        });

        // tests that empty/minimal node still produces output
        it('should handle minimal node structure', async () => {
            const dto: ConvertFigmaDto = {
                fileKey: 'minimal',
                token: 'token',
            };

            const minimalNode: FigmaNode = {
                id: '1:1',
                name: 'Minimal',
                type: 'RECTANGLE',
            };

            jest.spyOn(figmaApiService, 'getFile').mockResolvedValue(minimalNode);

            const result = await controller.convert(dto);

            expect(result.html).toBeTruthy();
            expect(result.css).toBeTruthy();
        });
    });
});

