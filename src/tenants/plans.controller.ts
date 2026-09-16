import { Controller, Get } from '@nestjs/common';
import { PlansService } from './plans.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Role } from '../roles/enums/role.enum';

@Controller('plans')
@Roles(Role.ADMIN)
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  @Permissions('users:read')
  findAll() {
    return this.plansService.findAll();
  }
}
