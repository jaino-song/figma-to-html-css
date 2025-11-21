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
  async getFile(fileKey: string, token: string): Promise<FigmaNode> {

    try {
      // Making HTTP GET request to Figma API with authentication header
      const response = await axios.get(`${this.baseUrl}/files/${fileKey}`, {
        headers: {
          'X-Figma-Token': token,
        },
      });
      // Saving the response for debugging in development environment
      // try {
      //   fs.writeFileSync('figma-response2.json', JSON.stringify(response.data, null, 2));
      //   console.log('response saved to figma-response2.json');
      // } catch (error) {
      //   console.log('Error saving response to file:', error);
      // }
      
      // Returning only the document node from the API response
      return response.data.document;
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
