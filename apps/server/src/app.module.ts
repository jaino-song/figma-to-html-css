
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FigmaModule } from './modules/figma/figma.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    FigmaModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
