import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Destination } from './entities/destination.entity';
import { DestinationsController } from './destinations.controller';
import { DestinationsService } from './destinations.service';
import { NominatimService } from '../locations/nominatim.service';

@Module({
  imports: [TypeOrmModule.forFeature([Destination])],
  controllers: [DestinationsController],
  providers: [DestinationsService, NominatimService],
  exports: [DestinationsService],
})
export class DestinationsModule {}
