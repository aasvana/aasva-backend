import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Term } from './entities/term.entity';
import { TermsController } from './terms.controller';
import { TermsService } from './terms.service';

@Module({
  imports: [TypeOrmModule.forFeature([Term])],
  controllers: [TermsController],
  providers: [TermsService],
  exports: [TermsService],
})
export class TermsModule {}
