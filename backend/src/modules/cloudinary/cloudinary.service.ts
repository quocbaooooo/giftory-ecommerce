import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME', 'giftory_cloud'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY', '123456789012345'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET', 'abcdefghijklmnopqrstuvwxyz123'),
    });
  }

  private configure() {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME') || process.env.CLOUDINARY_CLOUD_NAME,
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY') || process.env.CLOUDINARY_API_KEY,
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET') || process.env.CLOUDINARY_API_SECRET,
    });
  }

  async uploadImage(fileBuffer: Buffer, folder: string = 'giftory/products'): Promise<string> {
    this.configure();
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image' },
        (error, result) => {
          if (error) {
            this.logger.error(`Cloudinary upload failed: ${error.message}`);
            return reject(new Error(`Cloudinary upload failed: ${error.message}`));
          }
          if (!result || !result.secure_url) {
            return reject(new Error('Cloudinary upload returned no secure URL'));
          }
          resolve(result.secure_url);
        }
      ).end(fileBuffer);
    });
  }
}
