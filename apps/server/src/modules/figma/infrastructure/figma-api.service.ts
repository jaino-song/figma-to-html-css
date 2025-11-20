
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { FigmaNode } from '../domain/figma.types';

/**
 * Infrastructure Layer: FigmaApiService
 * 
 * RESPONSIBILITY:
 * This service is solely responsible for communicating with the external Figma REST API.
 * It handles the HTTP requests, authentication headers, and error propagation.
 * 
 * WHY INFRASTRUCTURE?
 * In Clean Architecture, details about "how" we fetch data (Axios, HTTP, External URLs)
 * belong in the infrastructure layer. The inner layers (Application/Domain) should not know
 * that the data comes from an HTTP call.
 */
@Injectable()
export class FigmaApiService {
  private readonly baseUrl = 'https://api.figma.com/v1';
  // Caching the Figma file for 1 hour to avoid api call overloading
  // Only for testing logic, in production, this cache should be disabled
  private cache = new Map<string, { data: FigmaNode; timestamp: number }>();
  private readonly CACHE_TTL = 3600000; // 1 hour in milliseconds

  /**
   * Fetches the Figma file JSON structure.
   * @param fileKey The unique identifier of the Figma file.
   * @param token The Personal Access Token for authentication.
   * @returns The root document node of the Figma file.
   */
  async getFile(fileKey: string, token: string): Promise<FigmaNode> {
    const cached = this.cache.get(fileKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log('Using cached Figma file');
      return cached.data;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/files/${fileKey}`, {
        headers: {
          'X-Figma-Token': token,
        },
      });
      
      this.cache.set(fileKey, {
        data: response.data.document,
        timestamp: Date.now(),
      });
      
      return response.data.document;
    } catch (error) {
      console.error('Error fetching Figma file:', error);
      throw new HttpException(
        error.response?.data?.err || 'Failed to fetch Figma file',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
