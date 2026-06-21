import { IsEmail, IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { UserRole } from '../../users/user.entity';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  username: string;

  @IsEnum([UserRole.TEACHER, UserRole.STUDENT], {
    message: 'role must be either teacher or student',
  })
  role: UserRole.TEACHER | UserRole.STUDENT;
}
