import { BadGatewayException, BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { StudioAsset, StudioAssetDocument } from '../../database/schemas/studio-asset.schema';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { ImportOpenClipartDto } from './dto/openclipart.dto';
import { OPENCLIPART_ORIGIN, parseOpenClipartDetail, parseOpenClipartSearch, translateClipartQuery } from './openclipart.parser';

@Injectable()
export class OpenClipartService {
  private readonly cache = new Map<string, { until: number; result: ReturnType<typeof parseOpenClipartSearch> }>();

  constructor(
    @InjectModel(StudioAsset.name) private readonly assets: Model<StudioAssetDocument>,
    private readonly storage: CloudinaryService,
  ) {}

  private async download(path: string, image = false): Promise<Buffer> {
    let url = new URL(path, OPENCLIPART_ORIGIN);
    const signal = AbortSignal.timeout(15000);
    for (let hop = 0; hop < 4; hop++) {
      if (url.origin !== OPENCLIPART_ORIGIN || url.username || url.password) throw new BadGatewayException('OpenClipart chuyển hướng tới địa chỉ không được hỗ trợ.');
      const response = await fetch(url, { signal, redirect: 'manual', headers: { 'User-Agent': 'Giftory-Clipart-Importer/1.0', Accept: image ? 'image/png' : 'text/html' } });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        await response.body?.cancel();
        if (!location) break;
        url = new URL(location, url);
        continue;
      }
      if (!response.ok) {
        await response.body?.cancel();
        throw new BadGatewayException(`OpenClipart tạm thời không phản hồi (HTTP ${response.status}).`);
      }
      const expected = image ? 'image/png' : 'text/html';
      if (!response.headers.get('content-type')?.toLowerCase().includes(expected)) {
        await response.body?.cancel();
        throw new BadGatewayException('OpenClipart trả về định dạng không được hỗ trợ.');
      }
      const limit = image ? 5 * 1024 * 1024 : 2 * 1024 * 1024;
      if (Number(response.headers.get('content-length')) > limit) {
        await response.body?.cancel();
        throw new BadGatewayException('Ảnh OpenClipart vượt quá dung lượng hỗ trợ.');
      }
      const chunks: Uint8Array[] = [];
      let size = 0;
      const reader = response.body?.getReader();
      if (!reader) throw new BadGatewayException('OpenClipart trả về dữ liệu trống.');
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > limit) {
            await reader.cancel();
            throw new BadGatewayException('Dữ liệu OpenClipart vượt quá dung lượng hỗ trợ.');
          }
          chunks.push(value);
        }
      } finally { reader.releaseLock(); }
      const data = Buffer.concat(chunks);
      if (image && (data.length < 24 || data.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a'
        || data.toString('ascii', 12, 16) !== 'IHDR'
        || data.readUInt32BE(16) < 1 || data.readUInt32BE(20) < 1
        || data.readUInt32BE(16) > 12000 || data.readUInt32BE(20) > 12000)) {
        throw new BadGatewayException('Ảnh PNG không hợp lệ.');
      }
      return data;
    }
    throw new BadGatewayException('OpenClipart chuyển hướng quá nhiều lần.');
  }

  async search(query: string, page = 1) {
    if (!query?.trim()) throw new BadRequestException('Nhập từ khóa để tìm clipart.');
    const searchQuery = translateClipartQuery(query);
    const key = `${searchQuery.toLowerCase()}:${page}`;
    let result = this.cache.get(key)?.until > Date.now() ? this.cache.get(key)!.result : undefined;
    if (!result) {
      try {
        const params = new URLSearchParams({ query: searchQuery, p: String(page) });
        const html = await this.download(`/search/?${params}`);
        result = parseOpenClipartSearch(html.toString('utf8'), page);
      } catch {
        throw new ServiceUnavailableException('Không kết nối được OpenClipart hoặc cấu trúc tìm kiếm đã thay đổi. Vui lòng thử lại sau.');
      }
      if (this.cache.size >= 100) this.cache.delete(this.cache.keys().next().value!);
      this.cache.set(key, { until: Date.now() + 5 * 60 * 1000, result });
    }
    const existing = await this.assets.find({ sourceProvider: 'OPENCLIPART', sourceId: { $in: result.items.map(item => item.id) } }).select('sourceId').lean().exec();
    const imported = new Set(existing.map(asset => asset.sourceId));
    return { ...result, query: query.trim(), searchQuery, items: result.items.map(item => ({ ...item, imported: imported.has(item.id) })) };
  }

  async import(dto: ImportOpenClipartDto) {
    const results: Array<{ id: string; status: 'imported' | 'skipped' | 'failed'; message?: string }> = [];
    // Small bounded batches keep memory and upstream traffic predictable.
    const ids = [...new Set(dto.ids)];
    for (let offset = 0; offset < ids.length; offset += 3) {
      const batch = await Promise.all(ids.slice(offset, offset + 3).map(async id => {
        if (!/^[1-9]\d{0,8}$/.test(id)) return { id, status: 'failed' as const, message: 'Mã clipart không hợp lệ.' };
        try {
          if (await this.assets.exists({ sourceProvider: 'OPENCLIPART', sourceId: id })) return { id, status: 'skipped' as const };
          const detail = parseOpenClipartDetail((await this.download(`/detail/${id}`)).toString('utf8'), id);
          const image = await this.download(`/image/2000px/${id}`, true);
          // Copy pixels to our storage; storefront exports never depend on remote CORS.
          const imageUrl = await this.storage.uploadImage(image, 'giftory/cliparts/openclipart', 'image/png');
          const tags = [...new Set([...detail.tags, dto.query?.trim(), dto.query ? translateClipartQuery(dto.query) : ''].filter(Boolean))].slice(0, 32);
          await this.assets.create({
            name: detail.name, icon: imageUrl, imageUrl, thumbnailUrl: imageUrl,
            type: 'CLIPART', category: dto.category?.trim() || 'Phổ biến', tags,
            surcharge: 0, isActive: true, sourceProvider: 'OPENCLIPART', sourceId: id,
            sourceUrl: `${OPENCLIPART_ORIGIN}/detail/${id}`, author: detail.author, license: 'CC0-1.0',
          });
          return { id, status: 'imported' as const };
        } catch (error: any) {
          if (error?.code === 11000) return { id, status: 'skipped' as const };
          const message = error instanceof BadGatewayException ? error.message
            : error?.message?.startsWith('Clipart') || error?.message?.startsWith('Không tìm thấy') ? error.message
            : 'Không nhập được clipart. Vui lòng thử lại.';
          return { id, status: 'failed' as const, message };
        }
      }));
      results.push(...batch);
    }
    return {
      results, imported: results.filter(item => item.status === 'imported').length,
      skipped: results.filter(item => item.status === 'skipped').length,
      failed: results.filter(item => item.status === 'failed').length,
    };
  }
}
