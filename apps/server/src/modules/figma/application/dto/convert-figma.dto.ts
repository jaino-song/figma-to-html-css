
import { IsString, IsNotEmpty } from 'class-validator';

/**
 * DTO (Data Transfer Object)
 * 
 * RESPONSIBILITY:
 * Defines the structure of the data expected from the client.
 * Uses 'class-validator' decorators to ensure the data is valid before it reaches the controller.
 * 
 * WHY CLASS?
 * Classes are preserved at runtime, allowing the validation decorators to function.
 */
export class ConvertFigmaDto {
  @IsString()
  @IsNotEmpty()
  fileKey: string;

  @IsString()
  @IsNotEmpty()
  token: string;
}
