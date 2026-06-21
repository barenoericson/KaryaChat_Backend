import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, User } from '../users/user.entity';
import { SubmissionsService } from './submissions.service';
import { Request } from 'express';

const uploadsDir = join(process.cwd(), 'uploads');
if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });

const storage = diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => {
    cb(null, `${uuidv4()}${extname(file.originalname)}`);
  },
});

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
) => {
  const allowed = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/zip', 'application/x-zip-compressed',
    'text/plain', 'text/html',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new BadRequestException(`File type ${file.mimetype} is not allowed`), false);
  }
};

@Controller('classes/:classId/lessons/:lessonId/submissions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubmissionsController {
  constructor(private submissionsService: SubmissionsService) {}

  /** Student: submit work for a lesson */
  @Post()
  @Roles(UserRole.STUDENT)
  @UseInterceptors(FileInterceptor('file', { storage, fileFilter, limits: { fileSize: 20 * 1024 * 1024 } }))
  async submit(
    @Param('classId') classId: string,
    @Param('lessonId') lessonId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    const protocol = req.protocol;
    const host = req.get('host');
    const apiBaseUrl = `${protocol}://${host}`;
    return this.submissionsService.submit(user.id, classId, lessonId, file, apiBaseUrl);
  }

  /** Teacher: view all submissions for a lesson */
  @Get()
  @Roles(UserRole.TEACHER)
  getAll(
    @Param('classId') classId: string,
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: User,
  ) {
    return this.submissionsService.getForLesson(user.id, classId, lessonId);
  }

  /** Student: get own submission */
  @Get('mine')
  @Roles(UserRole.STUDENT)
  getMine(
    @Param('classId') classId: string,
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: User,
  ) {
    return this.submissionsService.getMySubmission(user.id, classId, lessonId);
  }
}
