
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { FigmaNode } from '../../domain/figma.types';

// service to communicate with the Figma REST API
@Injectable()
export class FigmaApiService {
  // base URL for all Figma API requests
  private readonly baseUrl = 'https://api.figma.com/v1';
  
  // fetches the Figma file structure using the file key and personal access token
  async getFile(fileKey: string, token: string): Promise<FigmaNode> {

    try {
      // making HTTP GET request to Figma API with authentication header
      const response = await axios.get(`${this.baseUrl}/files/${fileKey}`, {
        headers: {
          'X-Figma-Token': token,
        },
      });
      
      // returning only the document node from the API response
      return response.data.document;
    } catch (error) {
      // logging the error for debugging
      console.error('Error fetching Figma file:', error);
      
      // throwing HTTP exception with Figma's error message or default message
      throw new HttpException(
        error.response?.data?.err || 'Failed to fetch Figma file',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
