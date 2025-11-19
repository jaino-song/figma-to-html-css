
import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { FigmaApiService } from '../infrastructure/figma-api.service';
import { FigmaConverterService } from '../application/figma-converter.service';
import { ConvertFigmaDto } from '../application/dto/convert-figma.dto';

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
}
