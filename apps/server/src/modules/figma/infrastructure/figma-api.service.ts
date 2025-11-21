import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { FigmaNode } from '../domain/figma.types';
import { figmaApiToDomain } from './mappers/figma-api.mapper';

// Service to communicate with the Figma REST API
@Injectable()
export class FigmaApiService {
  // Base URL for all Figma API requests
  private readonly baseUrl = 'https://api.figma.com/v1';
  
  // Retry configuration for transient failures
  private readonly maxRetries = 2;
  private readonly baseDelayMs = 1000; // 1 second

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
        
      // Mapping raw API response to domain type with type safety and validation
      return figmaApiToDomain(response.data.document);
    } catch (err) {
      const status = err.response?.status;
      const isRetryable = status === 429 || status === 503 || !status; // Rate limit, service unavailable, or network error
      
      // Retry logic for transient failures
      if (isRetryable && attempt < this.maxRetries) {
        const delay = this.baseDelayMs * Math.pow(2, attempt); // Exponential backoff
        await this.sleep(delay);
        return this.fetchWithRetry(fileKey, token, attempt + 1);
      }
      
      // Throwing HTTP exception with Figma's error message or default message
      throw new HttpException(
        err.response?.data?.err || 'Failed to fetch Figma file',
        err.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Helper method to sleep for exponential backoff
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
