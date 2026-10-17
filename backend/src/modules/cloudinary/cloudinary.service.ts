import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private readonly configService: ConfigService) {
    this.configure();
  }

  private configure() {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME') || process.env.CLOUDINARY_CLOUD_NAME,
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY') || process.env.CLOUDINARY_API_KEY,
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET') || process.env.CLOUDINARY_API_SECRET,
    });
  }

  async uploadImage(fileBuffer: Buffer, folder: string = 'giftory/products', mimetype: string = 'image/png'): Promise<string> {
    this.configure();
    try {
      return await new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Cloudinary upload timeout'));
        }, 4000);

        cloudinary.uploader.upload_stream(
          { folder, resource_type: 'image' },
          (error, result) => {
            clearTimeout(timeout);
            if (error) {
              return reject(error);
            }
            if (!result || !result.secure_url) {
              return reject(new Error('No secure URL from Cloudinary'));
            }
            resolve(result.secure_url);
          }
        ).end(fileBuffer);
      });
    } catch (err: any) {
      this.logger.warn(`Cloudinary upload fallback activated: ${err.message}`);
      const safeMime = mimetype && mimetype.startsWith('image/') ? mimetype : 'image/png';
      return `data:${safeMime};base64,${fileBuffer.toString('base64')}`;
    }
  }
}
