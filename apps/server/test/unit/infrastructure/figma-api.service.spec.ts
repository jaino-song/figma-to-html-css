import { FigmaApiService } from '../../../src/modules/figma/infrastructure/figma-api.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';

// mock axios to prevent real HTTP calls
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// unit tests for the FigmaApiService
describe('FigmaApiService', () => {
    let service: FigmaApiService;

    beforeEach(() => {
        service = new FigmaApiService();
        jest.clearAllMocks();
    });

    describe('getFile', () => {
        // tests successful API call with valid file key and token
        it('should fetch Figma file successfully', async () => {
            const mockResponse = {
                data: {
                    document: {
                        id: '0:0',
                        name: 'Document',
                        type: 'DOCUMENT',
                        children: [
                            {
                                id: '1:1',
                                name: 'Page',
                                type: 'CANVAS',
                            },
                        ],
                    },
                },
            };

            mockedAxios.get.mockResolvedValueOnce(mockResponse);

            const result = await service.getFile('test-file-key', 'test-token');

            expect(result).toBeDefined();
            expect(result.id).toBe('0:0');
            expect(result.name).toBe('Document');
            expect(mockedAxios.get).toHaveBeenCalledWith(
                'https://api.figma.com/v1/files/test-file-key',
                {
                    headers: {
                        'X-Figma-Token': 'test-token',
                    },
                }
            );
        });

        // tests that correct headers are sent with the request
        it('should send correct authentication header', async () => {
            const mockResponse = {
                data: {
                    document: {
                        id: '0:0',
                        name: 'Document',
                        type: 'DOCUMENT',
                    },
                },
            };

            mockedAxios.get.mockResolvedValueOnce(mockResponse);

            await service.getFile('my-file-key', 'my-secret-token');

            expect(mockedAxios.get).toHaveBeenCalledWith(
                expect.stringContaining('my-file-key'),
                expect.objectContaining({
                    headers: {
                        'X-Figma-Token': 'my-secret-token',
                    },
                })
            );
        });

        // tests that API response is mapped to domain model
        it('should map API response to domain model', async () => {
            const mockResponse = {
                data: {
                    document: {
                        id: '1:1',
                        name: 'Test Frame',
                        type: 'FRAME',
                        absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 50 },
                        fills: [
                            {
                                type: 'SOLID',
                                color: { r: 1, g: 0, b: 0, a: 1 },
                            },
                        ],
                    },
                },
            };

            mockedAxios.get.mockResolvedValueOnce(mockResponse);

            const result = await service.getFile('test-key', 'test-token');

            expect(result.id).toBe('1:1');
            expect(result.name).toBe('Test Frame');
            expect(result.type).toBe('FRAME');
            expect(result.fills).toBeDefined();
        });

        // tests handling of 404 error (file not found)
        it('should throw HttpException for 404 error', async () => {
            const error = {
                response: {
                    status: 404,
                    data: {
                        err: 'File not found',
                    },
                },
            };

            mockedAxios.get.mockRejectedValueOnce(error);

            await expect(service.getFile('invalid-key', 'token')).rejects.toThrow(
                HttpException
            );

            try {
                await service.getFile('invalid-key', 'token');
            } catch (e) {
                expect(e.getStatus()).toBe(404);
                expect(e.message).toBe('File not found');
            }
        });

        // tests handling of 403 error (invalid token)
        it('should throw HttpException for 403 error (invalid token)', async () => {
            const error = {
                response: {
                    status: 403,
                    data: {
                        err: 'Invalid token',
                    },
                },
            };

            mockedAxios.get.mockRejectedValueOnce(error);

            await expect(service.getFile('file-key', 'invalid-token')).rejects.toThrow(
                HttpException
            );

            try {
                await service.getFile('file-key', 'invalid-token');
            } catch (e) {
                expect(e.getStatus()).toBe(403);
                expect(e.message).toBe('Invalid token');
            }
        });

        // tests handling of network errors without response object
        it('should throw HttpException for network error', async () => {
            const error = new Error('Network error');

            mockedAxios.get.mockRejectedValueOnce(error);

            await expect(service.getFile('file-key', 'token')).rejects.toThrow(
                HttpException
            );

            try {
                await service.getFile('file-key', 'token');
            } catch (e) {
                expect(e.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
                expect(e.message).toBe('Failed to fetch Figma file');
            }
        });

        // tests that console.error is called when error occurs
        it('should log error to console', async () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
            const error = new Error('Test error');

            mockedAxios.get.mockRejectedValueOnce(error);

            try {
                await service.getFile('file-key', 'token');
            } catch (e) {
                // Expected to throw
            }

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Error fetching Figma file:',
                error
            );

            consoleErrorSpy.mockRestore();
        });

        // tests handling of empty file key
        it('should make request with empty file key', async () => {
            const mockResponse = {
                data: {
                    document: {
                        id: '0:0',
                        name: 'Document',
                        type: 'DOCUMENT',
                    },
                },
            };

            mockedAxios.get.mockResolvedValueOnce(mockResponse);

            await service.getFile('', 'token');

            expect(mockedAxios.get).toHaveBeenCalledWith(
                'https://api.figma.com/v1/files/',
                expect.any(Object)
            );
        });

        // tests handling of API response with missing document field
        it('should handle response without document field', async () => {
            const mockResponse = {
                data: {
                    // Missing document field
                },
            };

            mockedAxios.get.mockResolvedValueOnce(mockResponse);

            await expect(service.getFile('file-key', 'token')).rejects.toThrow();
        });

        // tests correct base URL is used
        it('should use correct base URL', async () => {
            const mockResponse = {
                data: {
                    document: {
                        id: '0:0',
                        name: 'Document',
                        type: 'DOCUMENT',
                    },
                },
            };

            mockedAxios.get.mockResolvedValueOnce(mockResponse);

            await service.getFile('abc123', 'token');

            expect(mockedAxios.get).toHaveBeenCalledWith(
                'https://api.figma.com/v1/files/abc123',
                expect.any(Object)
            );
        });

        // tests handling of 500 error from Figma API
        it('should handle 500 internal server error from Figma', async () => {
            const error = {
                response: {
                    status: 500,
                    data: {
                        err: 'Internal server error',
                    },
                },
            };

            mockedAxios.get.mockRejectedValueOnce(error);

            try {
                await service.getFile('file-key', 'token');
            } catch (e) {
                expect(e.getStatus()).toBe(500);
                expect(e.message).toBe('Internal server error');
            }
        });

        // tests handling of error without err field in response
        it('should use default error message when err field is missing', async () => {
            const error = {
                response: {
                    status: 400,
                    data: {},
                },
            };

            mockedAxios.get.mockRejectedValueOnce(error);

            try {
                await service.getFile('file-key', 'token');
            } catch (e) {
                expect(e.message).toBe('Failed to fetch Figma file');
            }
        });
    });
});

