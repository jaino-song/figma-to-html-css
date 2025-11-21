
import { Module } from '@nestjs/common';
import { FigmaController } from './presentation/figma.controller';
import { FigmaApiService } from './infrastructure/repositories/figma-api.repository';
import { FigmaConverterService } from './application/figma-converter.service';

@Module({
  controllers: [FigmaController],
  providers: [FigmaApiService, FigmaConverterService],
})
export class FigmaModule {}

