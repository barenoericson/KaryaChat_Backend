import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateClassDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  language?: string;

  @IsBoolean()
  @IsOptional()
  isArchived?: boolean;
}
