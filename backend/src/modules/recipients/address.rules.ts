import { BadRequestException } from '@nestjs/common';
import { locations } from './locations.data';

export function normalizeAddress(input: { provinceCode: string; wardCode: string; street: string }) {
  const province = locations.find(item => item.code === input.provinceCode);
  const ward = province?.wards.find(item => item.code === input.wardCode);
  const street = typeof input.street === 'string' ? input.street.trim().replace(/\s+/g, ' ') : '';
  if (!province || !ward) throw new BadRequestException('Vui lòng chọn phường/xã thuộc tỉnh/thành đã chọn');
  if (street.length < 3 || street.length > 200) throw new BadRequestException('Số nhà, tên đường phải từ 3 đến 200 ký tự');
  return {
    provinceCode: province.code, provinceName: province.name,
    wardCode: ward.code, wardName: ward.name, street,
    address: `${street}, ${ward.name}, ${province.name}`,
  };
}
