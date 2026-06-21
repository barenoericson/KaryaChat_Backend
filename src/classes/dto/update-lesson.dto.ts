import { IsDateString, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateLessonDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  codeSnippet?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  order?: number;

  @IsDateString()
  @IsOptional()
  deadline?: string;
}
