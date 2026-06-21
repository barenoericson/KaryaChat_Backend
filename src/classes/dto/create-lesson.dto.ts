import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateLessonDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

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
