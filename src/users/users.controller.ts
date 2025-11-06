import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ChangePassDto } from './dto/change-pass';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';
import { LoginDto } from './dto/login-user.dto';
const API_URL = process.env.APP_BASE_URL ;
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
UseGuards;

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.register(createUserDto);
  }

  @Post('login')
  login(
    @Body() loginUserDto: LoginDto,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    return this.usersService.login(loginUserDto, res, req);
  }
  @Get('current')
  async getCurrentUser(@Req() req: Request, @Res() res: Response) {
    return this.usersService.currentUser(req, res);
  }

  @Post('change-password')
  changePass(
    @Req() req: Request,
    @Body() changePassDto: ChangePassDto,
    @Res() res: Response,
  ) {
    return this.usersService.changePass(req, changePassDto, res);
  }
  @Delete('delete-account')
  async deleteAccount(@Req() req: Request, @Res() res: Response) {
    return this.usersService.deleteAccount(req, res);
  }

  @Patch(':id')
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.updateUser(id, updateUserDto);
  }

  @Get('search')
  async searchUsers(@Query('email') email: string, @Req() req: Request) {
    return this.usersService.searchUsersByEmail(email, req);
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res() res: Response) {
    return this.usersService.logout(req, res);
  }

  @Get()
  async getAllUsers(@Req() req: Request) {
    return this.usersService.findAllUsers(req);
  }


  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads', // nơi lưu file
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  uploadAvatar(@UploadedFile() file: Express.Multer.File) {
    const imageUrl = `${API_URL}/uploads/${file.filename}`;
    return { url: imageUrl };
  }

  
}
