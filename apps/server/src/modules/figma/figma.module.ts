
import { Module } from '@nestjs/common';
import { FigmaController } from './presentation/figma.controller';
import { FigmaApiService } from './infrastructure/figma-api.service';
import { FigmaConverterService } from './application/figma-converter.service';

@Module({
  controllers: [FigmaController],
  providers: [FigmaApiService, FigmaConverterService],
})
export class FigmaModule {}

