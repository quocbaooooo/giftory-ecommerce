import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from './schemas/user.schema';
import { Category, CategoryDocument } from './schemas/category.schema';
import { Product, ProductDocument } from './schemas/product.schema';
import { Voucher, VoucherDocument } from './schemas/voucher.schema';
import { Order, OrderDocument } from './schemas/order.schema';
import { LoyaltyTransaction, LoyaltyTransactionDocument } from './schemas/loyalty-transaction.schema';
import { UserRole, OrderStatus, PaymentStatus, FulfillmentStatus, PaymentMode, PaymentMethod, OrderItemStatus } from '../common/enums/role.enum';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
  const categoryModel = app.get<Model<CategoryDocument>>(getModelToken(Category.name));
  const productModel = app.get<Model<ProductDocument>>(getModelToken(Product.name));
  const voucherModel = app.get<Model<VoucherDocument>>(getModelToken(Voucher.name));
  const orderModel = app.get<Model<OrderDocument>>(getModelToken(Order.name));
  const loyaltyModel = app.get<Model<LoyaltyTransactionDocument>>(getModelToken(LoyaltyTransaction.name));

  console.log('--- 🚀 Bắt đầu quá trình nạp dữ liệu Seed cho Giftory ---');

  // Clear existing collections
  await Promise.all([
    userModel.deleteMany({}),
    categoryModel.deleteMany({}),
    productModel.deleteMany({}),
    voucherModel.deleteMany({}),
    orderModel.deleteMany({}),
    loyaltyModel.deleteMany({})
  ]);

  console.log('✅ Đã dọn dẹp sạch dữ liệu cũ');

  // 1. Seed Users (1 Admin + 6 Customers)
  const salt = await bcrypt.genSalt(10);
  const adminPassword = await bcrypt.hash('Admin@Giftory2026', salt);
  const customerPassword = await bcrypt.hash('Giftory@2026', salt);

  const admin = await userModel.create({
    name: 'Admin Hoàng Nam',
    email: 'admin@giftory.vn',
    password: adminPassword,
    phone: '0988889999',
    role: UserRole.ADMIN,
    loyaltyPoints: 9999,
    loyaltyTier: 'DIAMOND',
    avatar: 'https://lh3.googleusercontent.com/aida/AEtjO1U-AmO7wYkGLRxIOLsnjUuDL6LgUVUfmqPc3T34pG9c0CG_s_HUusRsjnlb8QAmGb2ByrFf7cnlXGLzzNLAoFGfs146WRsR3R7vwRDYuUZ9eVSoJYeBpivAldRpvJ9RXrzALSwykqVHPiOX713l_JIkDUCmy1qHV5n24RpKSfD2-kDFYXkDK7-sQZJQlBuXiavNpOAKEJzyNUaL5Uf3BgUTAMBuD9Rgjp1h8_Q4us-rDs0j58boYAeUJcHumLL2U4ZYTZvG6sWggyY',
    address: { street: '128 Đường Số 7', ward: 'An Phú', district: 'Thủ Đức', city: 'TP. Hồ Chí Minh' }
  });

  const customersData = [
    { name: 'Nguyễn Minh Anh', email: 'customer@giftory.vn', phone: '0901112233', points: 350, tier: 'SILVER' },
    { name: 'Trần Thuý Hường', email: 'thuyhuong@gmail.com', phone: '0902223344', points: 520, tier: 'GOLD' },
    { name: 'Lê Quốc Dũng', email: 'quocdung@gmail.com', phone: '0903334455', points: 120, tier: 'BRONZE' },
    { name: 'Phạm Phương Thảo', email: 'phuongthao@gmail.com', phone: '0904445566', points: 840, tier: 'GOLD' },
    { name: 'Vũ Hoàng Quân', email: 'hoangquan@gmail.com', phone: '0905556677', points: 1500, tier: 'DIAMOND' },
    { name: 'Đặng Mai Linh', email: 'mailinh@gmail.com', phone: '0906667788', points: 80, tier: 'BRONZE' },
  ];

  const createdCustomers: UserDocument[] = [];
  for (const c of customersData) {
    const cust = await userModel.create({
      name: c.name,
      email: c.email,
      password: customerPassword,
      phone: c.phone,
      role: UserRole.CUSTOMER,
      loyaltyPoints: c.points,
      loyaltyTier: c.tier,
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCRbj1Xlk6xPUT5xpT4NWozIhnu9-l5jJFg3wi5hduQMFNP8eq35s6HQi-7njUTqplZ5gKMJgwL0aYcoB4ZQhuTXuywlvmCNpmRBDnC8fAFTen2ZkUwFa1tRBkI62LPpBWCU5T8tqFTA2aGvXfm8T8T2KenmPq5-ajEmvJdZxoLXYgMY1-NSDsEItTCboL69H-cD0E1nwDsT4gm2om46yVFNOrpxv3GkjkhCLDxSbPCfDpfmKYZHF1jP6tbM72_Xg_fvIA',
      address: { street: 'Số 45 Lê Lợi', ward: 'Bến Nghé', district: 'Quận 1', city: 'TP. Hồ Chí Minh' }
    });
    createdCustomers.push(cust);

    // Initial loyalty transaction
    await loyaltyModel.create({
      userId: cust._id,
      type: 'EARN',
      points: c.points,
      balanceAfter: c.points,
      description: 'Quà tặng điểm thưởng chào mừng hội viên Giftory',
      referenceId: 'WELCOME-BONUS'
    });
  }
  console.log(`✅ Đã tạo 1 Admin (${admin.email}) và ${createdCustomers.length} Customers`);

  // 2. Seed Categories (6 Danh mục theo Stitch)
  const categoriesData = [
    { name: 'Bình Giữ Nhiệt & Cốc Sứ', slug: 'binh-giu-nhiet-coc-su', emoji: '☕', icon: 'local_cafe', description: 'Bình giữ nhiệt Inox 304 và ly sứ cao cấp khắc tên nghệ thuật' },
    { name: 'Sổ Tay & Bút Ký Kim Loại', slug: 'so-tay-but-ky', emoji: '✒️', icon: 'edit_note', description: 'Sổ tay bìa da hoàng gia và bút ký cao cấp khắc laser' },
    { name: 'Nến Thơm & Decor Không Gian', slug: 'nen-thom-decor', emoji: '🕯️', icon: 'spa', description: 'Nến thơm tinh dầu hoa khô thuần chay Citta và đồ decor sang trọng' },
    { name: 'Móc Khóa & Quà Gỗ', slug: 'moc-khoa-tho-go', emoji: '🐰', icon: 'key', description: 'Móc khóa gỗ sồi tự nhiên khắc hình ảnh & ngày kỷ niệm' },
    { name: 'Áo Thun & Ốp Gốm Monogram', slug: 'ao-thun-op-custom', emoji: '👕', icon: 'apparel', description: 'Áo cotton thêu vi tính và ốp lưng gốm in chữ cái mạ vàng' },
    { name: 'Set Quà Sang Trọng & Tạp Dề', slug: 'set-qua-sang-trong', emoji: '🎁', icon: 'featured_seasonal_and_gifts', description: 'Hộp quà cao cấp lụa satin kèm phụ kiện tinh tế' },
  ];

  const categoryMap = new Map<string, any>();
  for (let i = 0; i < categoriesData.length; i++) {
    const c = categoriesData[i];
    const cat = await categoryModel.create({ ...c, order: i + 1, isActive: true });
    categoryMap.set(c.slug, cat._id);
  }
  console.log(`✅ Đã tạo ${categoriesData.length} danh mục sản phẩm`);

  // 3. Seed Products (18 sản phẩm thực tế theo Stitch)
  const productsData = [
    // 1. Bình Nordic Bespoke
    {
      name: 'Bình Giữ Nhiệt Nordic Bọc Da & Khắc Laser Cá Nhân (500ml)',
      slug: 'binh-giu-nhiet-nordic-boc-da-khac-laser',
      description: 'Thân bình cấu tạo Inox 304 kép giữ nhiệt 24 giờ, phủ lớp da Ý thảo mộc tự nhiên. Khắc laser Fiber cực nét từng nét chữ ký và thông điệp.',
      price: 250000,
      salePrice: 220000,
      categorySlug: 'binh-giu-nhiet-coc-su',
      images: [
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCKTkcqYCzqbTubW6b24R7ddPlXnKvpUh3sevKFt9aZ2IubRObqHaXhYGWuJgfkN55yzlfM9E_5fCBjSSjiU053-Xl1klSE7ynrNox5NTwMc_I0Frts8wXqny2HopN0raGUJLqzu4cSp7HATWpSGAuvm3lcrPja7yxnOqkKK_RjmQiRJfOFfmeGbqF3STibU3rtbT-52xamfqVwTvLVVn50VHX2PYyjrxhv0rEaLKVW2LlkaztehscPSCwAKluEJn-GtN4',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCnbFnr2bFrmqaeDLx_elgUmNO1zsXditnQ03OwaUohpSw85hopV7UoMrufnrskIYaA7OoLwB8lq9fG6wZK51zDXAaalVUGhlcwmAjVemlLNow5PANugfRdvlyzkw-y7S17vl8CJXw9_rJLZxiicLlqMA84C4TWLpIFwcV8iks14JnTvN9lSyb8HfnF3GT49kfeuybrcNJCRzQDKQj0pdZuwULSz7u-PuDs-xUYJLIWebl-2RaYdJc1ECqMjNKEsjuGH8Q'
      ],
      isCustomizable: true,
      isFlashSale: true,
      flashSaleDiscountPercent: 20,
      customBaseFee: 30000,
      stock: 150,
      soldCount: 890,
      rating: 4.9,
      tags: ['Bespoke', 'Khắc laser', 'Inox 304', 'Quà sinh nhật'],
      variants: [
        { name: 'Navy Blue (Xanh Đại Dương)', price: 220000, stock: 50 },
        { name: 'Deep Slate (Xám Titan)', price: 220000, stock: 40 },
        { name: 'Sand Beige (Be Cát)', price: 220000, stock: 30 },
        { name: 'Terracotta (Đỏ Đất)', price: 220000, stock: 30 }
      ],
      specs: [
        { key: 'Chất liệu thân', value: 'Inox 304 Food-grade an toàn thực phẩm' },
        { key: 'Dung tích', value: '500ml' },
        { key: 'Thời gian giữ nhiệt', value: 'Nóng 12h - Lạnh 24h' },
        { key: 'Công nghệ chế tác', value: 'Khắc Laser Fiber độ chính xác ±0.01mm' }
      ]
    },
    // 2. Ly sứ Good Things Take Time
    {
      name: "Hộp Quà Ly Sứ Cao Cấp 'Good Things Take Time' & Thìa Vàng Khắc Tên",
      slug: 'hop-qua-ly-su-good-things-take-time-thia-vang',
      description: 'Bộ cốc sứ nung nhiệt độ cao 1280 độ C, men bóng không bám cặn cà phê. Đi kèm thìa mạ vàng titan khắc tên người nhận.',
      price: 350000,
      salePrice: 300000,
      categorySlug: 'binh-giu-nhiet-coc-su',
      images: [
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCAEHf4MVMsrFVCiqEQZiMtZCxXXCtcd6QWKqrJ0Z-TkD3AgaGCW4tBAZNCJcrfTkJCVs4J8z_214U_1dlJmb8GAxtoS173O3PYqdDSFDv3je0gOSfkh_dgGZmNyrtM1x99klY63Oz5AblgYiQIiILjt2egRi89p3xyUhl1Z42l1SNh9WNJBhrMFAkGUMOg6BYF7Xt4gP9YbzsptMmikdtwL8TU9Jc5S9MYaWg_SV8SJRzbV_ux409ZY0_VUdcjxnYJsvQ',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCmi8pqctrGS6fEmb1AhbMuAdk_5AdA8tLPUU7Q5KY9j62dMoJncBMWhzstbXhVD-u4m80ETkD1nfYx3ThZDxXGrjA0GvhL2sW7-3SkQkb4Qs2bPj5p07B1EgFzwxCCEkAdqtus1AvMf4ofg6ZCmF3Dj8EGjQQIYVbLpab2KZjv_HROvhj9nB2IpBYTcCfkbA5dYDhuX7ir9W-9wtC8pmw4eX8AE5r0WNQxqFYpgpRstoCaL8f1UD2rW0IKNQUT9aE1y9s'
      ],
      isCustomizable: true,
      isFlashSale: false,
      customBaseFee: 50000,
      stock: 80,
      soldCount: 420,
      rating: 5.0,
      tags: ['Cốc sứ', 'Thìa vàng', 'Bespoke', 'Quà kỷ niệm'],
      variants: [
        { name: 'Xanh Matcha', price: 300000, stock: 40 },
        { name: 'Trắng Ngọc Trai', price: 300000, stock: 40 }
      ],
      specs: [
        { key: 'Chất liệu', value: 'Gốm sứ cao cấp nung 1280°C' },
        { key: 'Phụ kiện', value: 'Thìa hợp kim mạ Titan vàng khắc laser' },
        { key: 'Hộp đóng gói', value: 'Hộp cứng lót satin & nơ lụa thắt tay' }
      ]
    },
    // 3. Nến Thơm Botanical Citta
    {
      name: 'Hũ Nến Thơm Hoa Khô Botanical Citta (Sáp Đậu Nành Thuần Chay)',
      slug: 'hu-nen-thom-hoa-kho-botanical-citta',
      description: 'Nến thơm làm từ sáp đậu nành thiên nhiên 100%, kết hợp hoa khô thủ công tuyển chọn và tinh dầu thảo mộc thư giãn giấc ngủ.',
      price: 250000,
      salePrice: 215000,
      categorySlug: 'nen-thom-decor',
      images: [
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAz2x-vsVgczLtCTzYqysyrVrjw_MMDhtf7Jp0AA_a5GI5ZdhWCx3tnxJwc9GzXI4NOHB-1xXMCH7cwVAGbkXnH1QUXUyY8ZNqTADpD6sbcHxh-6SofnIpzLbDTwaSbOcJAiLsjOR2mnAyxP2yhtuR3sGn3IRzmZ_LziEhi2Wq3al2tgc-4hd-V8IKfoXieeJl7ygfarh_EoM_Vo4tBnIOriYFl71QK4H-E8nE_wBkZhz-ejIs7tVkgQ-oKviu1FJiAhuc',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuD0AgXNm0dmGk3HNBCmrk9OS5ijfKIE41QmngNG9OA54P11IRzvZjBHDcnlHGdNH76JJ3MlrDWSaEoi43vB0EaXYWjGQZQssWH6s8x6ON9tG6pStpFPDyyDNUu1ShvSVTPwE4VuAuQxvHMiDIqZg2P-k3E3VkhW5uKwMOZog3IsAgRGhyih7Yre6YJW4iI5wm1wzz1t20wpq46St21-fX5c4sV3b8qxEKzrLqNb3OgV9s1z2yLbLv0x-SL_R11fIxBbJSU'
      ],
      isCustomizable: false,
      isFlashSale: true,
      flashSaleDiscountPercent: 15,
      stock: 200,
      soldCount: 1250,
      rating: 4.8,
      tags: ['Nến thơm', 'Hoa khô', 'Relax', 'Quà 8/3', 'Quà 20/10'],
      variants: [
        { name: 'Gỗ Thông & Lavender', price: 215000, stock: 100 },
        { name: 'Cam Quế & Vani', price: 215000, stock: 100 }
      ],
      specs: [
        { key: 'Khối lượng sáp', value: '200g (Thời gian cháy ~45 giờ)' },
        { key: 'Thành phần', value: 'Sáp đậu nành tự nhiên, bấc cotton không khói' }
      ]
    },
    // 4. Set Sổ Da Hoàng Thành & Bút Ký
    {
      name: 'Set Sổ Tay Bìa Da Hoàng Thành Cung Đình & Bút Ký Kim Loại Khắc Tên Laser',
      slug: 'set-so-tay-bia-da-hoang-thanh-but-ky-laser',
      description: 'Hộp quà sang trọng gồm sổ tay bìa da dập nổi hoa văn Hoàng Thành, ruột giấy chống mỏi mắt và bút kim loại phủ sơn tĩnh điện khắc tên laser.',
      price: 400000,
      salePrice: 350000,
      categorySlug: 'so-tay-but-ky',
      images: [
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBQnU2yO_V3b2vnD1UlbKml4MeqNs0GGdHK2oaj9vaBYBgY-iDCRzEaZdH9ZxSvaKgTaCKXLkV7Zob3Z7dvFk8vQhGupFgHXBmiXj0wvPad3La5bHcCHB6ZZAMAmXhm7v2aCPGXrtSznA7xVCVP8DNsXYRcYs2cC7M8ObOrHae6HyHQliLCoJhBUJrkUl0IqHKF_n_K-b6fQpZbBY6e4lA7xnQvXIb7dHvtGvPOihfhODbYNs0JhvArQ7FQ5sQi2Op4784',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBTiUcc1K16mRQtadu3yEAnXGoIohAuCMoAY1yVBoAMwvyfjPIJFirLHWov_uxVpgQ5-GykkXfJ9UexjI-MS_WgHGcD7W0aG0F9yHAziycn8URpqVpTqCFiptz3t_UzpIAFu4ICjGwbBHrbKlGDyRzFQ9HDiLH48zvQjwFtMgMn0XwySjnxnKBc8fnFy38rvx0ufp9BHsnvb3zwHmgmei_s5P1fJU-ZbURE8_qWkyjKo-ZV3j0Ik87ZxHOQPbBdB0vQnpE'
      ],
      isCustomizable: true,
      isFlashSale: false,
      customBaseFee: 40000,
      stock: 65,
      soldCount: 310,
      rating: 4.9,
      tags: ['Sổ da', 'Bút ký', 'Bespoke', 'Quà doanh nghiệp', 'Quà sếp'],
      variants: [
        { name: 'Nâu Cổ Điển', price: 350000, stock: 35 },
        { name: 'Xanh Rêu Hoàng Gia', price: 350000, stock: 30 }
      ],
      specs: [
        { key: 'Kích thước sổ', value: 'A5 (148 x 210 mm) - 200 trang' },
        { key: 'Định lượng giấy', value: '100gsm kẻ ô hạt đậu cao cấp' },
        { key: 'Khắc tên', value: 'Khắc laser tên người nhận trên thân bút và bìa da' }
      ]
    },
    // 5. Ốp Gốm Monogram
    {
      name: 'Ốp Lưng Gốm Monogram In Chữ Lồng Thếp Vàng Kim Độc Bản',
      slug: 'op-lung-gom-monogram-thep-vang',
      description: 'Mặt lưng gốm ceramic matt mịn tay, viền TPU đàn hồi chống sốc quân sự. Chữ cái tên viết tắt được dát vàng sang trọng.',
      price: 220000,
      salePrice: 190000,
      categorySlug: 'ao-thun-op-custom',
      images: [
        'https://lh3.googleusercontent.com/aida-public/AB6AXuA-bRbWBhv_zezdlBaL0rLu9Plt7vm0VuTJnqygcImvTlLiugv2etis2o4XIwkp35Q-9iBQJ4QgUAPjVyLVk5O4mTf93VT_lAslrS36cC4DTVYEiJOOYOm-RtpRmuaJQ0zjoan3nIg4F9OIGJjvGOs5UgjkrlyX9aD4_ino2r1bPMh8NA57AC2dt0ZnWFo_Pir3cXLrm6ytxc6azoDlqrq6tfdUVaoeoS_A5tLDImqU0eEXAz96BWRaVA'
      ],
      isCustomizable: true,
      isFlashSale: true,
      flashSaleDiscountPercent: 15,
      customBaseFee: 30000,
      stock: 120,
      soldCount: 750,
      rating: 4.9,
      tags: ['Ốp lưng', 'Monogram', 'Ceramic', 'Custom'],
      variants: [
        { name: 'iPhone 15 / 15 Pro / 15 Pro Max', price: 190000, stock: 60 },
        { name: 'iPhone 16 / 16 Pro / 16 Pro Max', price: 190000, stock: 60 }
      ]
    },
    // 6. Áo thun Cotton thêu tên nghệ thuật
    {
      name: 'Áo Thun Cotton Premium 250gsm Thêu Tên Nghệ Thuật Mini',
      slug: 'ao-thun-cotton-theu-ten-mini',
      description: 'Chất liệu 100% cotton chải kỹ thấm hút tối đa, form suông đứng dáng. Vị trí ngực áo được thêu vi tính chữ ký hoặc icon kỷ niệm.',
      price: 280000,
      salePrice: 240000,
      categorySlug: 'ao-thun-op-custom',
      images: [
        'https://lh3.googleusercontent.com/aida-public/AB6AXuA5C_BuC6873TScG4V8tj6GF6BOc7sPhdDrpa9wu7VLUcXlpKM8NoJBlY_9lYrl1IdRAa9WwlwGO7AEeIPbNjvTh3na33-nodInHZkRzA0TzoNPRLcWCITN6DkPlwvTriwZwIy3eNfOlIULrMjsDgmdVYRmZO-byKa6I9evbnNhSpDxDmwJzJgRPilIlQ8qd50ywk89bB1Fl2swu3qpQGw-p16cSmWz2TNbspfGMc-R81sIl2MWPtVS-Q'
      ],
      isCustomizable: true,
      isFlashSale: false,
      customBaseFee: 40000,
      stock: 100,
      soldCount: 530,
      rating: 4.8,
      tags: ['Áo thun', 'Thêu tên', 'Cotton', 'Bespoke'],
      variants: [
        { name: 'Size S (Trắng / Đen)', price: 240000, stock: 25 },
        { name: 'Size M (Trắng / Đen)', price: 240000, stock: 25 },
        { name: 'Size L (Trắng / Đen)', price: 240000, stock: 25 },
        { name: 'Size XL (Trắng / Đen)', price: 240000, stock: 25 }
      ]
    },
    // 7. Móc khóa thỏ gỗ đôi Nau Factory
    {
      name: 'Móc Khóa Thỏ Gỗ Đôi Cá Nhân Hóa Khắc Chân Dung & Ngày Kỷ Niệm',
      slug: 'moc-khoa-tho-go-doi-ca-nhan-hoa',
      description: 'Cặp móc khóa chế tác từ gỗ sồi tự nhiên Bắc Mỹ, tiện tay tỉ mỉ và mài bóng mịn. Khắc laser hình chibi hoặc tên hai người yêu nhau.',
      price: 180000,
      salePrice: 150000,
      categorySlug: 'moc-khoa-tho-go',
      images: [
        'https://lh3.googleusercontent.com/aida-public/AB6AXuB13Z7iIbjVRr60YvfNMx5FpccEhDWukJEVwqvUzgts1c_hPNfuQ1RLJyKiLkZ5Gx10SldKrbGQQI8cE9Uwt_lIlt555_Q6spEluVtPZLYEGOi_-_7nC9BiK6PuhyAWV0GtGZ9I1BUdYluPy0EqTTztUGbsLYcATRZimlk4TEROEZ5CGFVlZF50CSrY8nvps95-Ir05bA-GVu5eR2P2n28_W0sjvorJ-8A46PWH8ySYo7W1l7NvhkFYjSO-cKcSp7XZwFA'
      ],
      isCustomizable: true,
      isFlashSale: true,
      flashSaleDiscountPercent: 20,
      customBaseFee: 20000,
      stock: 300,
      soldCount: 1680,
      rating: 5.0,
      tags: ['Móc khóa', 'Thỏ gỗ', 'Đôi bạn', 'Valentine', 'Kỷ niệm'],
      variants: [
        { name: 'Set 2 Con (Thỏ Trắng & Thỏ Nâu)', price: 150000, stock: 150 },
        { name: 'Đơn 1 Con', price: 85000, stock: 150 }
      ]
    },
    // 8. Tạp dề Vintage hoa cúc
    {
      name: 'Tạp Dề Nấu Bếp Vải Linen Vintage Hoa Cúc Kèm Khăn Lau Tay',
      slug: 'tap-de-linen-vintage-hoa-cuc',
      description: 'Chất liệu linen dệt thô cao cấp, thoáng khí và có túi tiện dụng. Phù hợp làm quà tặng mẹ, vợ hoặc bạn gái yêu thích làm bánh nấu ăn.',
      price: 210000,
      salePrice: 175000,
      categorySlug: 'set-qua-sang-trong',
      images: [
        'https://lh3.googleusercontent.com/aida-public/AB6AXuChrv5ZqSVPcOiQOuSrVifoMDGBij88ii0IBfrprraLU3Jf04Zx06cDR8IUOFjKOSDOCWP8l-n8h4jftIvRCpux9agmLQLWn_Rzu7p-Dh0e1y4chQzyvR6pV7lMrgGD21E9XfAJ6aj_lgBsehbXPgO3WJFngO_5OXT6oUEMsE_Vw5eMcqEHoMMw7Po02zIKOpZQe3gXsHitpLxafxZ0TLf04WaGRlY5X-sRCexb3rqyb9N8D5kCy7fWGZDDC_1idGnFWdA'
      ],
      isCustomizable: false,
      isFlashSale: true,
      flashSaleDiscountPercent: 17,
      stock: 90,
      soldCount: 380,
      rating: 4.7,
      tags: ['Tạp dề', 'Vintage', 'Quà tặng mẹ', 'Linen'],
      variants: [
        { name: 'Xanh Bơ Pastel', price: 175000, stock: 45 },
        { name: 'Hồng Đất Cổ Điển', price: 175000, stock: 45 }
      ]
    },
    // 9. Set ví da & thắt lưng Lavatino
    {
      name: 'Set Hộp Quà Ví Da Bò Sáp & Thắt Lưng Khóa Tự Động Sang Trọng',
      slug: 'set-vi-da-that-lung-hop-qua-sang-trong',
      description: 'Chế tác từ da bò nguyên tấm xử lý sáp chống trầy, hộp quà nắp nam châm thắt nơ sang trọng dành riêng cho phái mạnh.',
      price: 650000,
      salePrice: 550000,
      categorySlug: 'set-qua-sang-trong',
      images: [
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCNWZAQV-0lboW5HavTlggDYLidAiz7nP8VyGHaKtx2Wf9_S-2-FS5yvMguc1FdYN5VKuBwIJgmdJxJv3rJwPpJGMGhwlHi72InwnVtSCCSSqrWvdsOcMU0AlSJJnJ6ldoGo3XJlBNcvOsysmHzs8LTRxfU8flLoktQZBn-iJKyOBctdjo6LCuvNx1cL_H1wODWu7OKkjmgXytk1OXeZyY86IJA6qalswU5MSRAOdHIwHaKq6faCMwWd-vXQCLd3xG5Lms'
      ],
      isCustomizable: true,
      isFlashSale: false,
      customBaseFee: 50000,
      stock: 45,
      soldCount: 220,
      rating: 4.9,
      tags: ['Ví da', 'Thắt lưng', 'Quà tặng bạn trai', 'Quà sinh nhật nam'],
      variants: [
        { name: 'Đen Tuyển Khóa Bạc', price: 550000, stock: 25 },
        { name: 'Nâu Cà Phê Khóa Đồng', price: 550000, stock: 20 }
      ]
    },
    // 10. Ly giữ nhiệt LocknLock cà phê sữa
    {
      name: 'Ly Giữ Nhiệt Uống Cà Phê LocknLock Bucket Tumbler 540ml',
      slug: 'ly-giu-nhiet-locknlock-bucket-tumbler',
      description: 'Thiết kế nắp bật tiện lợi, giữ đá không tan 18 tiếng. Sơn tĩnh điện chống trầy kèm quai xách silicon êm ái.',
      price: 320000,
      salePrice: 260000,
      categorySlug: 'binh-giu-nhiet-coc-su',
      images: [
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCHV628Htey3c0DEpENFeZ51ycqGUZ_h9VWLWtSNDboYla9v9nF7Bf5NZZrE5P1lMbtcD1zCADEcYEW29E4zwAIlwjgbhCfGBCvDbDMnETcPjqmVeg5_wNhBYxxw-NOyomX4DZfe9kgL5-vHiQwCkaHTv_BqA8JmXM67pujdTO_SiyhisPQBefGaTqjEniUkSF44fJkmZ8pst4swKNEOcLQXmA7wpQ7G5K8XX_xeNr4LZs4KGRBtBhQHIVBdYRBIEr61L0'
      ],
      isCustomizable: false,
      isFlashSale: true,
      flashSaleDiscountPercent: 19,
      stock: 140,
      soldCount: 880,
      rating: 4.8,
      tags: ['LocknLock', 'Ly giữ nhiệt', 'Cafe', 'Office']
    },
    // 11. Bình giữ nhiệt TokyoLife Inox 316
    {
      name: 'Bình Giữ Nhiệt TokyoLife Smart LED Nhiệt Độ Inox 316',
      slug: 'binh-giu-nhiet-tokyolife-smart-led',
      description: 'Màn hình cảm ứng LED chạm xem nhiệt độ nước chính xác. Lòng bình tráng Inox 316 y tế cao cấp kháng khuẩn.',
      price: 290000,
      salePrice: 245000,
      categorySlug: 'binh-giu-nhiet-coc-su',
      images: [
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBG9z0p95yvo7kaXHDTEaKd7lstT-xUG_WvzJCcgTsyW5l8XiUntchCo7AsMBf2sSYhJCyCZFQeRthup58OoCkPrsHaIY-7zNq6LR-RjFRmaA8UmrrgvEIQX6WsAZ7ylpWr9v6GQW2gmFx5wZPzNlzAg_-JXyxAfi2Y9leqTwHWYVR-OoD4vo2iTkSu5IZKoF76nw9hIjRLgHzHOjzkNkxjFiqc6ZMFT8sJWnjvngH8yyteqtAgLYxe_El7ES9UT_w2Vgs'
      ],
      isCustomizable: true,
      isFlashSale: false,
      customBaseFee: 30000,
      stock: 95,
      soldCount: 460,
      rating: 4.9,
      tags: ['Inox 316', 'Màn hình LED', 'Bespoke']
    },
    // 12. Hộp quà trà hoa dưỡng nhan thảo mộc
    {
      name: 'Hộp Quà Trà Hoa Dưỡng Nhan Thảo Mộc Thủy Tinh & Mật Ong Bạc Hà',
      slug: 'hop-qua-tra-hoa-duong-nhan-thao-moc',
      description: 'Set gồm 6 vị trà hoa sấy lạnh giữ nguyên màu và tinh chất, kèm hũ mật ong bạc hà Hà Giang nguyên chất trong hộp gỗ sang trọng.',
      price: 380000,
      salePrice: 320000,
      categorySlug: 'set-qua-sang-trong',
      images: [
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDZB_oxf292nhvhqJ2mQdnUMWgXcTSwMWfzSxkUVfwMeZPo0FgvuH7_WvpYvwIMJGzdH7TRfv7vtDuhDX8akCo_iNMsqSUOfSdw8nhi_I6ujN_5xZ7fGHIQlgBnZMyNB7WfNLDods9nFD5zsxTgjPNY0H5LJN6EQysLpoSgvh18i9lS_qFifBYYauDtGZJtWD7eejJFhrnYA_QE5MZovxtP8-UZ262wo6ziEXRL--HU-qBWgxzAFXwqEtQXSrWHV-4T0Ac'
      ],
      isCustomizable: false,
      isFlashSale: true,
      flashSaleDiscountPercent: 16,
      stock: 60,
      soldCount: 290,
      rating: 5.0,
      tags: ['Trà hoa', 'Dưỡng nhan', 'Hộp quà sức khỏe', 'Quà phụ nữ']
    }
  ];

  const createdProducts: any[] = [];
  for (const p of productsData) {
    const categoryId = categoryMap.get(p.categorySlug);
    const prod = await productModel.create({
      ...p,
      category: categoryId,
      status: 'ACTIVE'
    });
    createdProducts.push(prod);
  }
  console.log(`✅ Đã tạo ${createdProducts.length} sản phẩm (Bespoke & Standard)`);

  // 4. Seed Vouchers
  const vouchersData = [
    { code: 'TRIAN30K', title: 'Ưu đãi tri ân khách hàng', description: 'Giảm ngay 30.000đ cho đơn hàng từ 200.000đ', discountType: 'FIXED', discountValue: 30000, minOrderValue: 200000, usageLimit: 500, requiredPoints: 0 },
    { code: 'FREESHIP', title: 'Miễn phí vận chuyển toàn quốc', description: 'Freeship tối đa 35.000đ cho đơn từ 250.000đ', discountType: 'FIXED', discountValue: 35000, minOrderValue: 250000, usageLimit: 300, requiredPoints: 0 },
    { code: 'BESPOKE50', title: 'Trợ giá chế tác riêng', description: 'Giảm 50.000đ cho các đơn hàng có quà Custom Studio', discountType: 'FIXED', discountValue: 50000, minOrderValue: 400000, usageLimit: 200, requiredPoints: 100 },
    { code: 'LOYALTY100K', title: 'Voucher Hội viên Kim Cương', description: 'Giảm 100.000đ đổi từ điểm tích lũy', discountType: 'FIXED', discountValue: 100000, minOrderValue: 500000, usageLimit: 100, requiredPoints: 200 },
    { code: 'GIFT20K', title: 'Voucher Đổi điểm 50 Point', description: 'Giảm 20.000đ trực tiếp khi thanh toán', discountType: 'FIXED', discountValue: 20000, minOrderValue: 150000, usageLimit: 1000, requiredPoints: 50 },
  ];

  for (const v of vouchersData) {
    await voucherModel.create({ ...v, isActive: true });
  }
  console.log(`✅ Đã tạo ${vouchersData.length} mã Voucher & chương trình đổi điểm`);

  // 5. Seed Orders (với các trạng thái: Chờ cọc, Tại xưởng, Đang giao, Đã giao)
  const sampleCustomer = createdCustomers[0];
  const prodCustom = createdProducts[0]; // Bình Nordic Bespoke
  const prodCup = createdProducts[1]; // Ly sứ Good Things
  const prodCandle = createdProducts[2]; // Nến Citta

  const ordersSeed = [
    // 1. Đơn chờ xác nhận (Mới tạo 2 giờ trước, chưa đủ 12 giờ - BR-01, BR-02)
    {
      orderCode: 'GF-104001',
      userId: sampleCustomer._id,
      customerInfo: {
        name: sampleCustomer.name,
        phone: sampleCustomer.phone,
        email: sampleCustomer.email,
        address: 'Số 15 Lê Duẩn, Phường Bến Nghé, Quận 1, TP.HCM',
        note: 'Giao giờ hành chính, gọi trước 15 phút'
      },
      items: [
        {
          productId: prodCustom._id,
          productName: prodCustom.name,
          productImage: prodCustom.images[0],
          variantName: 'Navy Blue (Xanh Đại Dương)',
          quantity: 1,
          unitPrice: 250000,
          isCustom: true,
          itemType: 'CUSTOM',
          status: OrderItemStatus.PENDING,
          customDetails: {
            frontMessage: 'Happy Birthday My Love ❤️',
            backMessage: 'Giftory Special 2026',
            fontFamily: 'Signature',
            engraveColor: 'Gold',
            selectedColor: 'Navy Blue'
          },
          depositRequired: 125000
        }
      ],
      pricing: {
        itemsTotal: 250000,
        voucherDiscount: 0,
        shippingFee: 0,
        giftWrapFee: 0,
        totalAmount: 250000,
        depositAmount: 125000,
        remainingCodAmount: 125000
      },
      paymentMode: PaymentMode.DEPOSIT_50,
      paymentMethod: PaymentMethod.VIETQR,
      paymentStatus: PaymentStatus.PARTIALLY_PAID_DEPOSIT_50,
      orderStatus: OrderStatus.AWAITING_CONFIRMATION,
      fulfillmentStatus: FulfillmentStatus.AWAITING_CONFIRMATION,
      confirmationWait: {
        minWaitHours: 12,
        maxWaitHours: 48,
        eligibleAt: new Date(Date.now() + 10 * 3600000), // Còn 10h nữa mới đủ 12h
        deadlineAt: new Date(Date.now() + 46 * 3600000),
        confirmedAt: null,
        confirmedBy: ''
      },
      isPackaged: false,
      deliveryInfo: {
        carrier: 'Giao Hàng Tiết Kiệm (GHTK)',
        trackingCode: 'GHTK-VN-8821941',
        deliveryAttempts: [],
        deliveryResult: 'PENDING',
        failureReason: '',
        allowRetry: true
      },
      shippingCarrier: 'Giao Hàng Tiết Kiệm Express',
      timeline: [
        { title: 'Tiếp nhận đơn hàng từ BP-03 (BR-01)', description: 'Đơn hàng được ghi nhận ở trạng thái "Chờ xác nhận đơn hàng".', timestamp: new Date(Date.now() - 2 * 3600000), completed: true },
        { title: 'Đang trong thời gian chờ xác nhận (BR-02)', description: 'Thời gian chờ ít nhất sau 12 giờ và tối đa 48 giờ. Bộ đếm đang kích hoạt.', timestamp: new Date(Date.now() - 2 * 3600000), completed: false }
      ]
    },

    // 2. Đơn chờ xác nhận (Tạo 16 giờ trước, ĐÃ ĐỦ ĐIỀU KIỆN XÁC NHẬN >= 12h - BR-02, BR-03)
    {
      orderCode: 'GF-104002',
      userId: createdCustomers[1]._id,
      customerInfo: {
        name: createdCustomers[1].name,
        phone: createdCustomers[1].phone,
        email: createdCustomers[1].email,
        address: 'Tòa nhà Landmark 81, 720A Điện Biên Phủ, Bình Thạnh, TP.HCM',
        note: 'Đơn quà tặng kỷ niệm ngày cưới'
      },
      items: [
        {
          productId: prodCandle._id,
          productName: prodCandle.name,
          productImage: prodCandle.images[0],
          variantName: 'Gỗ Thông & Lavender',
          quantity: 2,
          unitPrice: 215000,
          isCustom: false,
          itemType: 'READY_MADE',
          status: OrderItemStatus.PENDING,
          depositRequired: 0
        }
      ],
      pricing: {
        itemsTotal: 430000,
        voucherDiscount: 30000,
        shippingFee: 0,
        giftWrapFee: 0,
        totalAmount: 400000,
        depositAmount: 400000,
        remainingCodAmount: 0
      },
      paymentMode: PaymentMode.FULL_PAYMENT,
      paymentMethod: PaymentMethod.VIETQR,
      paymentStatus: PaymentStatus.PAID_FULL,
      orderStatus: OrderStatus.AWAITING_CONFIRMATION,
      fulfillmentStatus: FulfillmentStatus.AWAITING_CONFIRMATION,
      confirmationWait: {
        minWaitHours: 12,
        maxWaitHours: 48,
        eligibleAt: new Date(Date.now() - 4 * 3600000), // Đã đủ 12h từ 4h trước!
        deadlineAt: new Date(Date.now() + 32 * 3600000),
        confirmedAt: null,
        confirmedBy: ''
      },
      isPackaged: false,
      deliveryInfo: {
        carrier: 'Giao Hàng Nhanh Hỏa Tốc',
        trackingCode: 'GHN-VN-4402195',
        deliveryAttempts: [],
        deliveryResult: 'PENDING',
        failureReason: '',
        allowRetry: true
      },
      shippingCarrier: 'Giao Hàng Nhanh Hỏa Tốc (2h - 48h)',
      timeline: [
        { title: 'Tiếp nhận đơn hàng từ BP-03 (BR-01)', description: 'Đơn hàng được ghi nhận ở trạng thái "Chờ xác nhận đơn hàng".', timestamp: new Date(Date.now() - 16 * 3600000), completed: true },
        { title: 'Đã hoàn thành thời gian chờ tối thiểu 12h (BR-02)', description: 'Đơn hàng đủ điều kiện để Admin Quản lý đơn hàng xác nhận.', timestamp: new Date(Date.now() - 4 * 3600000), completed: true }
      ]
    },

    // 3. Đơn đã được xác nhận, trích xuất Order Items gồm cả Ready-made & Custom (US-04.01, BR-04, BR-05)
    {
      orderCode: 'GF-104003',
      userId: createdCustomers[2]._id,
      customerInfo: {
        name: createdCustomers[2].name,
        phone: createdCustomers[2].phone,
        email: createdCustomers[2].email,
        address: 'Số 88 Trần Phú, Quận Hải Châu, Đà Nẵng',
        note: 'Cốc sứ khắc chữ vàng, nến thơm gói nơ satin đỏ'
      },
      items: [
        {
          productId: prodCup._id,
          productName: prodCup.name,
          productImage: prodCup.images[0],
          variantName: 'Xanh Matcha',
          quantity: 1,
          unitPrice: 350000,
          isCustom: true,
          itemType: 'CUSTOM',
          status: OrderItemStatus.PENDING, // Chờ xưởng nhận cấu hình
          customDetails: {
            frontMessage: 'Khắc Tên: Thùy Trang - 2026',
            fontFamily: 'Serif',
            engraveColor: 'Gold'
          },
          depositRequired: 175000
        },
        {
          productId: prodCandle._id,
          productName: prodCandle.name,
          productImage: prodCandle.images[0],
          variantName: 'Gỗ Thông & Lavender',
          quantity: 1,
          unitPrice: 215000,
          isCustom: false,
          itemType: 'READY_MADE',
          status: OrderItemStatus.PENDING, // Chờ Admin lấy hàng
          depositRequired: 0
        }
      ],
      pricing: {
        itemsTotal: 565000,
        voucherDiscount: 50000,
        shippingFee: 0,
        giftWrapFee: 0,
        totalAmount: 515000,
        depositAmount: 175000,
        remainingCodAmount: 340000
      },
      paymentMode: PaymentMode.DEPOSIT_50,
      paymentMethod: PaymentMethod.MOMO,
      paymentStatus: PaymentStatus.PARTIALLY_PAID_DEPOSIT_50,
      orderStatus: OrderStatus.CONFIRMED,
      fulfillmentStatus: FulfillmentStatus.CONFIRMED,
      confirmationWait: {
        minWaitHours: 12,
        maxWaitHours: 48,
        eligibleAt: new Date(Date.now() - 14 * 3600000),
        deadlineAt: new Date(Date.now() + 20 * 3600000),
        confirmedAt: new Date(Date.now() - 3 * 3600000),
        confirmedBy: 'Admin Hoàng Nam'
      },
      isPackaged: false,
      deliveryInfo: {
        carrier: 'Giao Hàng Tiết Kiệm (GHTK)',
        trackingCode: 'GHTK-VN-5509214',
        deliveryAttempts: [],
        deliveryResult: 'PENDING',
        failureReason: '',
        allowRetry: true
      },
      shippingCarrier: 'Giao Hàng Tiết Kiệm Express',
      timeline: [
        { title: 'Tiếp nhận đơn hàng từ BP-03 (BR-01)', description: 'Ghi nhận đơn "Chờ xác nhận đơn hàng".', timestamp: new Date(Date.now() - 20 * 3600000), completed: true },
        { title: 'Đơn hàng đã được xác nhận (US-04.01, BR-04)', description: 'Admin Hoàng Nam xác nhận đơn. Trích xuất thông tin Order Items: 1 Ready-made Gift và 1 Custom Gift.', timestamp: new Date(Date.now() - 3 * 3600000), completed: true }
      ]
    },

    // 4. Đơn có sản phẩm Custom đang gia công & kiểm định QC (US-04.03, BR-07, BR-08)
    {
      orderCode: 'GF-104004',
      userId: createdCustomers[3]._id,
      customerInfo: {
        name: createdCustomers[3].name,
        phone: createdCustomers[3].phone,
        email: createdCustomers[3].email,
        address: 'Số 45 Lê Lợi, Bến Nghé, Quận 1, TP.HCM',
        note: 'Khắc laser vi điểm độ nét cao'
      },
      items: [
        {
          productId: prodCustom._id,
          productName: prodCustom.name,
          productImage: prodCustom.images[0],
          variantName: 'Xanh Đại Dương',
          quantity: 1,
          unitPrice: 250000,
          isCustom: true,
          itemType: 'CUSTOM',
          status: OrderItemStatus.IN_PRODUCTION,
          customDetails: {
            frontMessage: 'Giftory Signature - Phuong Thao',
            fontFamily: 'Modern Sans',
            engraveColor: 'Silver'
          },
          depositRequired: 125000
        }
      ],
      pricing: {
        itemsTotal: 250000,
        voucherDiscount: 0,
        shippingFee: 0,
        giftWrapFee: 0,
        totalAmount: 250000,
        depositAmount: 125000,
        remainingCodAmount: 125000
      },
      paymentMode: PaymentMode.DEPOSIT_50,
      paymentMethod: PaymentMethod.VIETQR,
      paymentStatus: PaymentStatus.PARTIALLY_PAID_DEPOSIT_50,
      orderStatus: OrderStatus.CONFIRMED,
      fulfillmentStatus: FulfillmentStatus.AT_WORKSHOP,
      confirmationWait: {
        minWaitHours: 12,
        maxWaitHours: 48,
        eligibleAt: new Date(Date.now() - 24 * 3600000),
        deadlineAt: new Date(Date.now() + 10 * 3600000),
        confirmedAt: new Date(Date.now() - 12 * 3600000),
        confirmedBy: 'Admin Hoàng Nam'
      },
      isPackaged: false,
      deliveryInfo: {
        carrier: 'Giao Hàng Tiết Kiệm (GHTK)',
        trackingCode: 'GHTK-VN-6601923',
        deliveryAttempts: [],
        deliveryResult: 'PENDING',
        failureReason: '',
        allowRetry: true
      },
      shippingCarrier: 'Giao Hàng Tiết Kiệm Express',
      timeline: [
        { title: 'Tiếp nhận đơn hàng từ BP-03 (BR-01)', description: 'Ghi nhận đơn.', timestamp: new Date(Date.now() - 36 * 3600000), completed: true },
        { title: 'Đơn hàng đã được xác nhận (US-04.01, BR-04)', description: 'Đã trích xuất cấu hình Custom Gift.', timestamp: new Date(Date.now() - 12 * 3600000), completed: true },
        { title: 'Bắt đầu sản xuất Custom Gift (US-04.03, BR-07)', description: 'Nhân viên sản xuất tiếp nhận cấu hình và gia công khắc laser vi điểm.', timestamp: new Date(Date.now() - 4 * 3600000), completed: true }
      ]
    },

    // 5. Đơn đã chuẩn bị đầy đủ và đã đóng gói (US-04.04, BR-09, chờ bàn giao Shipper)
    {
      orderCode: 'GF-104005',
      userId: createdCustomers[4]._id,
      customerInfo: {
        name: createdCustomers[4].name,
        phone: createdCustomers[4].phone,
        email: createdCustomers[4].email,
        address: 'Căn hộ Riverpark, Phú Mỹ Hưng, Quận 7, TP.HCM',
        note: 'Đóng hộp nơ nhung cao cấp'
      },
      items: [
        {
          productId: prodCandle._id,
          productName: prodCandle.name,
          productImage: prodCandle.images[0],
          variantName: 'Gỗ Thông & Lavender',
          quantity: 1,
          unitPrice: 215000,
          isCustom: false,
          itemType: 'READY_MADE',
          status: OrderItemStatus.PREPARED,
          preparedAt: new Date(Date.now() - 5 * 3600000),
          preparedBy: 'Admin Hoàng Nam',
          depositRequired: 0
        }
      ],
      pricing: {
        itemsTotal: 215000,
        voucherDiscount: 0,
        shippingFee: 30000,
        giftWrapFee: 0,
        totalAmount: 245000,
        depositAmount: 245000,
        remainingCodAmount: 0
      },
      paymentMode: PaymentMode.FULL_PAYMENT,
      paymentMethod: PaymentMethod.VIETQR,
      paymentStatus: PaymentStatus.PAID_FULL,
      orderStatus: OrderStatus.CONFIRMED,
      fulfillmentStatus: FulfillmentStatus.PACKAGED,
      isPackaged: true,
      packagedAt: new Date(Date.now() - 2 * 3600000),
      packagedBy: 'Admin Hoàng Nam',
      deliveryInfo: {
        carrier: 'Giao Hàng Tiết Kiệm (GHTK)',
        trackingCode: 'GHTK-VN-7703921',
        deliveryAttempts: [],
        deliveryResult: 'PENDING',
        failureReason: '',
        allowRetry: true
      },
      shippingCarrier: 'Giao Hàng Tiết Kiệm Express',
      timeline: [
        { title: 'Tiếp nhận đơn hàng từ BP-03 (BR-01)', description: 'Ghi nhận đơn.', timestamp: new Date(Date.now() - 30 * 3600000), completed: true },
        { title: 'Đơn hàng đã được xác nhận (US-04.01)', description: 'Xác nhận đơn thành công.', timestamp: new Date(Date.now() - 10 * 3600000), completed: true },
        { title: 'Đã lấy Ready-made Gift (US-04.02)', description: 'Admin đã lấy sản phẩm có sẵn.', timestamp: new Date(Date.now() - 5 * 3600000), completed: true },
        { title: 'Đã hoàn tất đóng gói đơn hàng (US-04.04, BR-09)', description: 'Admin Hoàng Nam đã đóng gói hộp quà, sẵn sàng bàn giao cho Shipper.', timestamp: new Date(Date.now() - 2 * 3600000), completed: true }
      ]
    },

    // 6. Đơn đã bàn giao cho Shipper - Đang giao hàng (In transit) (US-04.04, US-04.05, BR-10, BR-11)
    {
      orderCode: 'GF-104006',
      userId: createdCustomers[5]._id,
      customerInfo: {
        name: createdCustomers[5].name,
        phone: createdCustomers[5].phone,
        email: createdCustomers[5].email,
        address: 'Số 12 Bà Triệu, Phường Tràng Tiền, Quận Hoàn Kiếm, Hà Nội',
        note: 'Giao sáng trước 11h'
      },
      items: [
        {
          productId: prodCup._id,
          productName: prodCup.name,
          productImage: prodCup.images[0],
          variantName: 'Xanh Matcha',
          quantity: 1,
          unitPrice: 350000,
          isCustom: true,
          itemType: 'CUSTOM',
          status: OrderItemStatus.QC_PASSED,
          depositRequired: 175000
        }
      ],
      pricing: {
        itemsTotal: 350000,
        voucherDiscount: 0,
        shippingFee: 30000,
        giftWrapFee: 0,
        totalAmount: 380000,
        depositAmount: 175000,
        remainingCodAmount: 205000
      },
      paymentMode: PaymentMode.DEPOSIT_50,
      paymentMethod: PaymentMethod.MOMO,
      paymentStatus: PaymentStatus.PARTIALLY_PAID_DEPOSIT_50,
      orderStatus: OrderStatus.IN_TRANSIT,
      fulfillmentStatus: FulfillmentStatus.SHIPPED,
      isPackaged: true,
      packagedAt: new Date(Date.now() - 14 * 3600000),
      packagedBy: 'Admin Hoàng Nam',
      trackingCode: 'GHTK-VN-9941203',
      shippingCarrier: 'Giao Hàng Tiết Kiệm Express',
      deliveryInfo: {
        carrier: 'Giao Hàng Tiết Kiệm Express',
        trackingCode: 'GHTK-VN-9941203',
        dispatchedAt: new Date(Date.now() - 10 * 3600000),
        deliveryAttempts: [],
        deliveryResult: 'PENDING',
        failureReason: '',
        allowRetry: true
      },
      timeline: [
        { title: 'Tiếp nhận đơn hàng từ BP-03 (BR-01)', description: 'Ghi nhận đơn.', timestamp: new Date(Date.now() - 48 * 3600000), completed: true },
        { title: 'Đơn hàng đã được xác nhận (US-04.01)', description: 'Xác nhận đơn thành công.', timestamp: new Date(Date.now() - 30 * 3600000), completed: true },
        { title: 'Hoàn tất sản xuất và đạt kiểm định QC (US-04.03)', description: 'QC Passed.', timestamp: new Date(Date.now() - 20 * 3600000), completed: true },
        { title: 'Đóng gói hoàn tất (US-04.04, BR-09)', description: 'Đã đóng hộp quà.', timestamp: new Date(Date.now() - 14 * 3600000), completed: true },
        { title: 'Bàn giao cho Shipper - "In transit" (US-04.04, BR-10)', description: 'Bàn giao GHTK Express. Mã vận đơn: GHTK-VN-9941203. Đang chuyển tới người nhận.', timestamp: new Date(Date.now() - 10 * 3600000), completed: true }
      ]
    },

    // 7. Đơn giao không thành công - Đang trả hàng về Giftory (US-04.06, BR-15, EF2)
    {
      orderCode: 'GF-104007',
      userId: createdCustomers[0]._id,
      customerInfo: {
        name: 'Trần Văn Long',
        phone: '0977889900',
        email: 'vanlong@gmail.com',
        address: 'Số 102 Nguyễn Đình Chiểu, Phường 6, Quận 3, TP.HCM',
        note: 'Giao chiều sau 16h'
      },
      items: [
        {
          productId: prodCandle._id,
          productName: prodCandle.name,
          productImage: prodCandle.images[0],
          variantName: 'Gỗ Thông & Lavender',
          quantity: 1,
          unitPrice: 215000,
          isCustom: false,
          itemType: 'READY_MADE',
          status: OrderItemStatus.PREPARED,
          depositRequired: 0
        }
      ],
      pricing: {
        itemsTotal: 215000,
        voucherDiscount: 0,
        shippingFee: 30000,
        giftWrapFee: 0,
        totalAmount: 245000,
        depositAmount: 0,
        remainingCodAmount: 245000
      },
      paymentMode: PaymentMode.FULL_PAYMENT,
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.UNPAID,
      orderStatus: OrderStatus.IN_TRANSIT,
      fulfillmentStatus: FulfillmentStatus.RETURNING,
      isPackaged: true,
      packagedAt: new Date(Date.now() - 40 * 3600000),
      packagedBy: 'Admin Hoàng Nam',
      trackingCode: 'GHTK-VN-8833910',
      shippingCarrier: 'Giao Hàng Tiết Kiệm Express',
      deliveryInfo: {
        carrier: 'Giao Hàng Tiết Kiệm Express',
        trackingCode: 'GHTK-VN-8833910',
        dispatchedAt: new Date(Date.now() - 36 * 3600000),
        deliveryAttempts: [
          { attemptNumber: 1, timestamp: new Date(Date.now() - 24 * 3600000), success: false, failureReason: 'Khách không nghe máy (3 cuộc gọi)', allowRetry: true, note: 'Hẹn giao lại ngày mai' },
          { attemptNumber: 2, timestamp: new Date(Date.now() - 6 * 3600000), success: false, failureReason: 'Khách từ chối nhận hàng do đổi ý', allowRetry: false, note: 'Khách xác nhận không nhận nữa' }
        ],
        deliveryResult: 'FAILED',
        failureReason: 'Khách từ chối nhận hàng do đổi ý',
        allowRetry: false,
        returnedAt: new Date(Date.now() - 5 * 3600000)
      },
      timeline: [
        { title: 'Tiếp nhận đơn hàng từ BP-03 (BR-01)', description: 'Ghi nhận đơn COD.', timestamp: new Date(Date.now() - 60 * 3600000), completed: true },
        { title: 'Bàn giao cho Shipper - "In transit" (BR-10)', description: 'Bàn giao GHTK Express.', timestamp: new Date(Date.now() - 36 * 3600000), completed: true },
        { title: 'Giao không thành công lần 1 (BR-14)', description: 'Khách không nghe máy. Cho phép giao lại.', timestamp: new Date(Date.now() - 24 * 3600000), completed: true },
        { title: 'Giao hàng không thành công - Đang trả hàng về Giftory (US-04.06, BR-15, EF2)', description: 'Lý do: "Khách từ chối nhận hàng do đổi ý". Không được phép giao lại, Delivery Service chuyển hàng trả về kho Giftory.', timestamp: new Date(Date.now() - 5 * 3600000), completed: true }
      ]
    },

    // 8. Đơn đã giao hàng thành công (US-04.05, BR-12)
    {
      orderCode: 'GF-104008',
      userId: createdCustomers[2]._id,
      customerInfo: {
        name: createdCustomers[2].name,
        phone: createdCustomers[2].phone,
        email: createdCustomers[2].email,
        address: 'Số 88 Trần Phú, Quận Hải Châu, Đà Nẵng',
        note: 'Đã nhận đủ hàng'
      },
      items: [
        {
          productId: prodCandle._id,
          productName: prodCandle.name,
          productImage: prodCandle.images[0],
          variantName: 'Gỗ Thông & Lavender',
          quantity: 2,
          unitPrice: 215000,
          isCustom: false,
          itemType: 'READY_MADE',
          status: OrderItemStatus.PREPARED,
          depositRequired: 0
        }
      ],
      pricing: {
        itemsTotal: 430000,
        voucherDiscount: 30000,
        shippingFee: 0,
        giftWrapFee: 0,
        totalAmount: 400000,
        depositAmount: 400000,
        remainingCodAmount: 0
      },
      paymentMode: PaymentMode.FULL_PAYMENT,
      paymentMethod: PaymentMethod.VIETQR,
      paymentStatus: PaymentStatus.PAID_FULL,
      orderStatus: OrderStatus.DELIVERED,
      fulfillmentStatus: FulfillmentStatus.DELIVERED,
      isPackaged: true,
      packagedAt: new Date(Date.now() - 72 * 3600000),
      packagedBy: 'Admin Hoàng Nam',
      trackingCode: 'GHTK-VN-1102941',
      shippingCarrier: 'Giao Hàng Nhanh Hỏa Tốc',
      deliveryInfo: {
        carrier: 'Giao Hàng Nhanh Hỏa Tốc',
        trackingCode: 'GHTK-VN-1102941',
        dispatchedAt: new Date(Date.now() - 50 * 3600000),
        deliveryAttempts: [
          { attemptNumber: 1, timestamp: new Date(Date.now() - 24 * 3600000), success: true, failureReason: '', allowRetry: false, note: 'Khách ký nhận đầy đủ' }
        ],
        deliveryResult: 'SUCCESS',
        failureReason: '',
        allowRetry: false
      },
      timeline: [
        { title: 'Tiếp nhận đơn hàng từ BP-03 (BR-01)', description: 'Ghi nhận đơn hàng.', timestamp: new Date(Date.now() - 96 * 3600000), completed: true },
        { title: 'Đơn hàng đã được xác nhận (US-04.01)', description: 'Xác nhận đơn thành công.', timestamp: new Date(Date.now() - 80 * 3600000), completed: true },
        { title: 'Đóng gói quà tặng lụa (US-04.04, BR-09)', description: 'Đã hoàn tất đóng gói.', timestamp: new Date(Date.now() - 72 * 3600000), completed: true },
        { title: 'Bàn giao cho Shipper (BR-10)', description: 'Đang vận chuyển.', timestamp: new Date(Date.now() - 50 * 3600000), completed: true },
        { title: 'Đã giao hàng thành công (US-04.05, BR-12)', description: 'Delivery Service xác nhận giao hàng thành công. Hoàn tất quá trình giao hàng và kết thúc quy trình BP-04.', timestamp: new Date(Date.now() - 24 * 3600000), completed: true }
      ]
    }
  ];

  for (const o of ordersSeed) {
    await orderModel.create(o);
  }
  console.log(`✅ Đã tạo ${ordersSeed.length} đơn hàng mẫu với timeline thực tế`);

  console.log('--- 🎉 NẠP DỮ LIỆU SEED GIFTORY HOÀN TẤT THÀNH CÔNG! ---');
  console.log('👉 Tài khoản Admin: admin@giftory.vn | Mật khẩu: Admin@Giftory2026');
  console.log('👉 Tài khoản Khách hàng: customer@giftory.vn | Mật khẩu: Giftory@2026');

  await app.close();
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Lỗi nạp seed data:', err);
  process.exit(1);
});
