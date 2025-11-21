import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { FigmaNode } from '../domain/figma.types';
import { figmaApiToDomain } from './mappers/figma-api.mapper';

// Service to communicate with the Figma REST API
@Injectable()
export class FigmaApiService {
  // Base URL for all Figma API requests
  private readonly baseUrl = 'https://api.figma.com/v1';

  // Fetches the Figma file structure using the file key and personal access token
  async getFile(fileKey: string, token: string): Promise<FigmaNode> {

    try {
      // Making HTTP GET request to Figma API with authentication header
      const response = await axios.get(`${this.baseUrl}/files/${fileKey}`, {
        headers: {
          'X-Figma-Token': token,
        },
      });
        
      // Mapping raw API response to domain type with type safety and validation
      return figmaApiToDomain(response.data.document);
    } catch (error) {
      // Logging the error for debugging
      console.error('Error fetching Figma file:', error);
      
      // Throwing HTTP exception with Figma's error message or default message
      throw new HttpException(
        error.response?.data?.err || 'Failed to fetch Figma file',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
