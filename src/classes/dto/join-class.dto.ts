import { IsNotEmpty, IsString, Length } from 'class-validator';

export class JoinClassDto {
  @IsString()
  @IsNotEmpty()
  @Length(7, 7, { message: 'classCode must be exactly 7 characters' })
  classCode: string;
}
