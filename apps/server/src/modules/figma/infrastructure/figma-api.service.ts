
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

  /**
   * Fetches the Figma file JSON structure.
   * @param fileKey The unique identifier of the Figma file.
   * @param token The Personal Access Token for authentication.
   * @returns The root document node of the Figma file.
   */
  async getFile(fileKey: string, token: string): Promise<FigmaNode> {
    try {
      const response = await axios.get(`${this.baseUrl}/files/${fileKey}`, {
        headers: {
          'X-Figma-Token': token,
        },
      });
      
      // Returns the document root. The application service will decide which part to process.
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
