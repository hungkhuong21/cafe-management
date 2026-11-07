import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Headers,
  Inject,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, ChangePasswordDto, UpdateProfileDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  // 1. POST /auth/login - Đăng nhập, trả JWT (Công khai)
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // 2. POST /auth/logout - Đăng xuất (JWT không lưu phiên, client xóa token)
  @Post('logout')
  async logout(@Headers('authorization') authHeader?: string) {
    // Xác thực token nếu cần
    if (authHeader) {
      try {
        this.authService.verifyToken(authHeader);
      } catch {
        // Cho phép logout ngay cả khi token đã hết hạn
      }
    }
    return this.authService.logout();
  }

  // 3. GET /auth/me - Thông tin tài khoản (JWT)
  @Get('me')
  async getProfile(@Headers('authorization') authHeader: string) {
    return this.authService.getProfile(authHeader);
  }

  // 4. PATCH /auth/change-password - Đổi mật khẩu (JWT)
  @Patch('change-password')
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @Headers('authorization') authHeader?: string,
  ) {
    return this.authService.changePassword(dto, authHeader);
  }

  // 5. PATCH /auth/profile - Đổi tên hiển thị (JWT)
  @Patch('profile')
  async updateProfile(
    @Body() dto: UpdateProfileDto,
    @Headers('authorization') authHeader: string,
  ) {
    return this.authService.updateProfile(dto, authHeader);
  }
}
