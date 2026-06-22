import { Controller, Get, Patch, Post, Param, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { AdminService } from './admin.service';
import { IsEnum, IsUUID } from 'class-validator';

class UpdateRoleDto {
  @IsEnum(UserRole)
  role!: UserRole;
}

class SeedAdminDto {
  @IsUUID()
  userId!: string;
}

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // One-time endpoint — disabled automatically once any admin exists
  @Post('seed-admin')
  async seedAdmin(@Body() dto: SeedAdminDto) {
    try {
      return await this.adminService.seedAdmin(dto.userId);
    } catch (e: any) {
      throw new BadRequestException(e.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('users')
  getAllUsers() {
    return this.adminService.getAllUsers();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch('users/:id/role')
  updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.adminService.updateUserRole(id, dto.role);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }
}
