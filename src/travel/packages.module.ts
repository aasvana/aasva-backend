import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImageKitModule } from '../imagekit/imagekit.module';
import {
  Package,
  PackageDay,
  PackageExclusion,
  PackageImage,
  PackageInclusion,
} from './entities/package.entity';
import { PackagesController } from './packages.controller';
import { PackagesService } from './packages.service';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Package,
      PackageDay,
      PackageImage,
      PackageInclusion,
      PackageExclusion,
    ]),
    ImageKitModule,
  ],
  controllers: [PackagesController],
  providers: [PackagesService],
  exports: [PackagesService],
})
export class PackagesModule {}
