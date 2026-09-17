import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ItineraryTemplate,
  ItineraryTemplateDay,
} from './entities/itinerary-template.entity';
import {
  ItineraryTemplatesController,
  PackagesController,
} from './itinerary-templates.controller';
import { ItineraryTemplatesService } from './itinerary-templates.service';
@Module({
  imports: [
    TypeOrmModule.forFeature([ItineraryTemplate, ItineraryTemplateDay]),
  ],
  controllers: [ItineraryTemplatesController, PackagesController],
  providers: [ItineraryTemplatesService],
})
export class ItineraryTemplatesModule {}
