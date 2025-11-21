import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { FigmaNode } from '../../domain/figma.types';
// import fs from 'fs';

// Repository to communicate with the Figma REST API
@Injectable()
export class FigmaApiService {
  // Base URL for all Figma API requests
  private readonly baseUrl = 'https://api.figma.com/v1';
  
  // Fetches the Figma file structure using the file key and personal access token
  // Includes automatic retry logic for transient failures (rate limits, network issues)
  async getFile(fileKey: string, token: string): Promise<FigmaNode> {
    return this.fetchWithRetry(fileKey, token, 0);
  }

  // Helper method to fetch with exponential backoff retry logic
  private async fetchWithRetry(
    fileKey: string,
    token: string,
    attempt: number,
  ): Promise<FigmaNode> {
    try {
      // Making HTTP GET request to Figma API with authentication header
      const response = await axios.get(`${this.baseUrl}/files/${fileKey}`, {
        headers: {
          'X-Figma-Token': token,
        },
      });
      
      // Returning only the document node from the API response
      return response.data.document;
    } catch (err) {
      const status = err.response?.status;
      const isRetryable = status === 429 || status === 503 || !status; // Rate limit, service unavailable, or network error
      const maxRetries = 3;
      
      // Retry logic for transient failures
      if (isRetryable && attempt < maxRetries) {
        const delay = 1000 * Math.pow(2, attempt); // Exponential backoff: 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.fetchWithRetry(fileKey, token, attempt + 1);
      }
      
      // Throwing HTTP exception with Figma's error message or default message
      throw new HttpException(
        err.response?.data?.err || 'Failed to fetch Figma file',
        err.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
