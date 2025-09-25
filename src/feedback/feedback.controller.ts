import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { FeedbackService } from './feedback.service';

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @UseInterceptors(
    FilesInterceptor('screenshots', 10, {
      storage: diskStorage({
        destination: './uploads/feedback',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + extname(file.originalname));
        },
      }),
    }),
  )
  async create(@UploadedFiles() files: Express.Multer.File[], @Body() body: any) {
    const feedback = await this.feedbackService.createFeedback({
      ...body,
      screenshots: files.map((f) => f.filename),
    });

    return { success: true, data: feedback };
  }

  @Get()
  async findAll() {
    const feedbacks = await this.feedbackService.getAllFeedbacks();
    return { success: true, data: feedbacks };
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string) {
    return {
      success: true,
      data: await this.feedbackService.markAsRead(id),
    };
  }

  // @Delete(':id')
  // async remove(@Param('id') id: string) {
  //   return {
  //     success: true,
  //     data: await this.feedbackService.deleteFeedback(id),
  //   };
  // }
}
