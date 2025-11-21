
import { Controller, Post, Body, Get, HttpException, HttpStatus } from '@nestjs/common';
import { FigmaApiService } from '../infrastructure/repositories/figma-api.repository';
import { FigmaConverterService } from '../application/figma-converter.service';
import { ConvertFigmaDto } from '../application/dto/convert-figma.dto';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Presentation Layer: FigmaController
 * 
 * RESPONSIBILITY:
 * This class handles the HTTP Interface. It is the entry point for outside requests.
 * It is responsible for:
 * 1. Receiving the Request (GET/POST)
 * 2. Validating the Body (via DTOs)
 * 3. Calling the appropriate Application Services
 * 4. Returning the final Response
 * 
 * CLEAN ARCHITECTURE:
 * Controllers sit at the outer edge. They adapt HTTP to our internal Service calls.
 */
@Controller('figma')
export class FigmaController {
  constructor(
    private readonly figmaApi: FigmaApiService,
    private readonly converter: FigmaConverterService,
  ) {}

  /**
   * Endpoint: POST /figma/convert
   * Receives a file key and token, fetches the file, and returns HTML/CSS.
   */
  @Post('convert')
  async convert(@Body() dto: ConvertFigmaDto) {
    try {
      // 1. Use Infrastructure Service to get data from external world
      const figmaFile = await this.figmaApi.getFile(dto.fileKey, dto.token);
      
      // 2. Use Application Service to process that data into our desired format
      const result = this.converter.convert(figmaFile);
      
      // 3. Return response
      return result;
    } catch (error) {
      // Error Handling: Normalize errors before sending to client
      if (error instanceof HttpException) throw error;
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Endpoint: GET /figma/test
   * Test endpoint that uses figma-response2.json mock data for visual verification
   */
  // @Get('test')
  // async test() {
  //   try {
  //     // Load the mock figma-response.json file
  //     const mockDataPath = path.join(process.cwd(), 'figma-response2.json');
  //     const mockData = JSON.parse(fs.readFileSync(mockDataPath, 'utf-8'));

  //     // Convert the mock data using the converter service
  //     const result = this.converter.convert(mockData.document);

  //     return result;
  //   } catch (error) {
  //     if (error instanceof HttpException) throw error;
  //     throw new HttpException(
  //       `Test endpoint failed: ${error.message}`,
  //       HttpStatus.INTERNAL_SERVER_ERROR,
  //     );
  //   }
  // }
}
