import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateClassDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  language: string;
}
