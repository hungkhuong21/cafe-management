import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  Inject,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { multerUploadConfig } from '../../common/upload/upload.config';

@Controller('settings')
export class SettingsController {
  constructor(@Inject(SettingsService) private readonly settingsService: SettingsService) {}

  @Get()
  async getSettings() {
    return this.settingsService.getSettings();
  }

  @Put()
  async updateSettings(@Body() dto: UpdateSettingsDto) {
    return this.settingsService.updateSettings(dto);
  }

  @Post('upload-logo')
  @UseInterceptors(FileInterceptor('logo', multerUploadConfig))
  uploadLogo(@UploadedFile() file: Express.Multer.File) {
    return {
      logo_url: `/uploads/${file.filename}`,
    };
  }
}

