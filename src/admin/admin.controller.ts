import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { AdminService } from './admin.service';
import { IsEnum } from 'class-validator';

class UpdateRoleDto {
  @IsEnum(UserRole)
  role!: UserRole;
}

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  getAllUsers() {
    return this.adminService.getAllUsers();
  }

  @Patch('users/:id/role')
  updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.adminService.updateUserRole(id, dto.role);
  }

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }
}
