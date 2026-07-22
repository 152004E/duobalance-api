import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UsersService } from '../users/users.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('register')
  register(@Body() data: RegisterDto) {
    return this.authService.register(data);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() data: LoginDto) {
    return this.authService.login(data);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() data: RefreshTokenDto) {
    return this.authService.refresh(data.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Body() data: RefreshTokenDto) {
    return this.authService.logout(data.refreshToken);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async profile(@Req() req: any) {
    const user = await this.usersService.findById(req.user.id);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    const { password, ...result } = user;
    return result;
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Req() req: any, @Body() data: UpdateProfileDto) {
    return this.authService.updateProfile(req.user.id, data);
  }

  @Post('profile/avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: 'uploads/profile-images',
        filename: (
          _req: any,
          file: { originalname: string },
          cb: (error: Error | null, filename: string) => void,
        ) => {
          const ext = extname(file.originalname) || '.jpg';
          const name = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
          cb(null, name);
        },
      }),
      fileFilter: (
        _req: any,
        file: { mimetype: string },
        cb: (error: Error | null, acceptFile: boolean) => void,
      ) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          cb(
            new Error('Solo se permiten imágenes (jpg, jpeg, png, gif, webp)'),
            false,
          );
          return;
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async uploadAvatar(@Req() req: any, @UploadedFile() file: any) {
    console.log('=== uploadAvatar ===');
    console.log('file:', JSON.stringify(file, null, 2));
    console.log('req.user.id:', req.user.id);

    if (!file) {
      console.log('No file received');
      return { message: 'No se proporcionó ningún archivo' };
    }
    console.log('file.filename:', file.filename);
    console.log('file.originalname:', file.originalname);
    console.log('file.mimetype:', file.mimetype);
    console.log('file.size:', file.size);

    const avatarUrl = `/uploads/profile-images/${file.filename}`;
    console.log('avatarUrl:', avatarUrl);
    return this.authService.updateAvatar(req.user.id, avatarUrl);
  }
}
