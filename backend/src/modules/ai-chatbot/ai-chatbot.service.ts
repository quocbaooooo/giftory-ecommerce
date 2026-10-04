import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from '../../database/schemas/product.schema';
import { Order, OrderDocument } from '../../database/schemas/order.schema';
import { buildVietnameseRegex, removeVietnameseAccents } from '../../common/utils/vietnamese.util';
import { ChatMessageDto } from './dto/chat-message.dto';

export interface ChatResponse {
  reply: string;
  intent: 'RECOMMENDATION' | 'SUPPORT_ORDER' | 'SUPPORT_POLICY' | 'HANDOVER_HUMAN' | 'AMBIGUOUS' | 'SAFETY_GUARD';
  products?: any[];
  orderInfo?: any;
  quickChips?: { label: string; value: string; step?: number }[];
  handoverInfo?: {
    agentName: string;
    avatar: string;
    hotline: string;
    zaloUrl: string;
    queueTime: string;
  };
  contextUpdate?: {
    recipient?: string;
    occasion?: string;
    budget?: number;
    preferences?: string;
  };
  isProximateFallback?: boolean;
}

interface GeminiExtractionResult {
  intent: 'RECOMMENDATION' | 'SUPPORT_ORDER' | 'SUPPORT_POLICY' | 'HANDOVER_HUMAN' | 'AMBIGUOUS';
  reply: string;
  entities?: {
    recipient?: string;
    occasion?: string;
    budget?: number;
    preferences?: string;
  };
  orderCodeOrPhone?: string | null;
}

@Injectable()
export class AiChatbotService {
  private readonly logger = new Logger(AiChatbotService.name);

  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    private readonly configService: ConfigService,
  ) {}

  // Danh mục từ ngữ nhạy cảm cần lọc qua Safety Guardrail (US-PD-03 Edge Cases)
  private readonly profanities = [
    'dm', 'dmm', 'đm', 'đmm', 'vcl', 'cl', 'clgt', 'đụ', 'địt', 'cho chet', 'chó chết',
    'lua dao', 'lừa đảo', 'khốn nạn', 'ngu', 'me may', 'mẹ mày', 'bố mày'
  ];

  async processMessage(dto: ChatMessageDto): Promise<ChatResponse> {
    const rawMessage = dto.message.trim();
    const cleanMessage = removeVietnameseAccents(rawMessage).toLowerCase();

    // 1. Safety Guardrail: Kiểm tra từ ngữ nhạy cảm / chửi thề
    for (const badWord of this.profanities) {
      if (cleanMessage.includes(badWord)) {
        return {
          reply: 'Giftory luôn tôn trọng và lắng nghe bạn. Xin vui lòng sử dụng ngôn từ lịch sự để trợ lý có thể hỗ trợ bạn trải nghiệm mua sắm tốt nhất nhé ạ! ❤️',
          intent: 'SAFETY_GUARD',
          quickChips: [
            { label: '🎁 Gợi ý quà tặng', value: 'Gợi ý quà tặng', step: 1 },
            { label: '📦 Kiểm tra đơn hàng', value: 'Kiểm tra đơn hàng' }
          ]
        };
      }
    }

    // 2. Kiểm tra Intent Handover trực tiếp (Seamless Human Handover - BR-REC07 & US-PD-03.4)
    if (this.isHandoverIntent(cleanMessage)) {
      return {
        reply: 'Dạ Giftory đã kết nối bạn với chuyên viên tư vấn trực tuyến! Toàn bộ lịch sử trò chuyện của bạn đã được chuyển giao cho nhân viên tiếp quản. Bạn vui lòng đợi trong giây lát hoặc liên hệ qua kênh hỗ trợ trực tiếp bên dưới nhé:',
        intent: 'HANDOVER_HUMAN',
        handoverInfo: {
          agentName: 'Thùy Chi (Chuyên viên CSKH Giftory)',
          avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
          hotline: '1900 8888 (Phím 1)',
          zaloUrl: 'https://zalo.me/giftory',
          queueTime: 'Dưới 1 phút'
        }
      };
    }

    // 3. Thử phân tích nâng cao với Google Gemini AI nếu có API Key
    const geminiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (geminiKey) {
      try {
        const geminiResult = await this.callGemini(rawMessage, dto.context, geminiKey);
        if (geminiResult) {
          return await this.handleGeminiResult(geminiResult, rawMessage, dto.context);
        }
      } catch (err: any) {
        this.logger.warn(`Gemini AI call failed, falling back to local engine: ${err.message}`);
      }
    }

    // 4. Fallback: Bộ máy NLP & Rule-based nội bộ siêu tốc
    return this.processLocalEngine(rawMessage, cleanMessage, dto.context);
  }

  // --- GOOGLE GEMINI AI INTEGRATION ---
  private async callGemini(
    rawMessage: string,
    existingContext?: ChatMessageDto['context'],
    apiKey?: string
  ): Promise<GeminiExtractionResult | null> {
    if (!apiKey) return null;

    const systemPrompt = `Bạn là Trợ lý AI Concierge thông minh và ấm áp của Giftory - thương hiệu thương mại điện tử quà tặng bespoke & cá nhân hóa cao cấp.
Giftory có các chính sách:
- Đặt cọc 50% đối với sản phẩm Bespoke/Khắc tên cá nhân hóa trước khi gia công (BR-PAY05).
- Khắc laser và in UV hoàn thiện siêu tốc trong 2-4 giờ.
- Giao hàng hỏa tốc trong 2 giờ tại nội thành Hà Nội & TP.HCM.
- Đổi trả 1:1 miễn phí trong 7 ngày nếu lỗi từ xưởng sản xuất.

Nhiệm vụ của bạn:
1. Phân loại intent:
   - "RECOMMENDATION": Khách hàng cần gợi ý, tìm kiếm quà tặng.
   - "SUPPORT_ORDER": Khách muốn kiểm tra, tra cứu tiến độ đơn hàng.
   - "SUPPORT_POLICY": Khách hỏi về chính sách giao hàng hỏa tốc, đổi trả, đặt cọc 50%, thời gian khắc laser.
   - "HANDOVER_HUMAN": Khách muốn gặp nhân viên thật, chuyên viên CSKH, gọi hotline.
   - "AMBIGUOUS": Lời chào mơ hồ (ví dụ: alo, hi shop).
2. Trích xuất entities (nếu có): recipient, occasion, budget (số nguyên VND), preferences (sở thích, chất liệu).
3. Trích xuất mã đơn hàng hoặc SĐT nếu khách tra cứu đơn.
4. Sinh câu trả lời "reply" bằng tiếng Việt lịch sự, tự nhiên, sang trọng và đầy cảm xúc.

BẮT BUỘC trả về DUY NHẤT một chuỗi JSON thuần túy (không dùng markdown code block, không dùng \`\`\`json):
{
  "intent": "RECOMMENDATION" | "SUPPORT_ORDER" | "SUPPORT_POLICY" | "HANDOVER_HUMAN" | "AMBIGUOUS",
  "reply": "câu trả lời",
  "entities": {
    "recipient": "Mẹ | Người yêu | Bố | ...",
    "occasion": "Sinh nhật | Kỷ niệm | ...",
    "budget": 500000,
    "preferences": "nấu ăn, khắc tên..."
  },
  "orderCodeOrPhone": "GF123456 hoặc null"
}`;

    const models = ['gemini-flash-lite-latest', 'gemini-flash-latest'];
    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              { parts: [{ text: `${systemPrompt}\n\nNgữ cảnh trước: ${JSON.stringify(existingContext || {})}\nTin nhắn khách hàng: "${rawMessage}"` }] }
            ],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 600,
            }
          })
        });

        if (!res.ok) continue;

        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) continue;

        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        return parsed as GeminiExtractionResult;
      } catch (e) {
        // Try next model
      }
    }
    return null;
  }

  // --- Xử lý kết quả từ Gemini AI kết hợp Database thực tế ---
  private async handleGeminiResult(
    gemini: GeminiExtractionResult,
    rawMessage: string,
    existingContext?: ChatMessageDto['context']
  ): Promise<ChatResponse> {
    if (gemini.intent === 'SUPPORT_POLICY') {
      return {
        reply: gemini.reply,
        intent: 'SUPPORT_POLICY',
        quickChips: [
          { label: '🎁 Tư vấn quà tặng', value: 'Tư vấn quà tặng', step: 1 },
          { label: '📦 Tra cứu đơn hàng', value: 'Tra cứu đơn hàng' },
          { label: '📞 Kết nối nhân viên', value: 'Cho mình gặp nhân viên tư vấn' }
        ]
      };
    }

    if (gemini.intent === 'SUPPORT_ORDER' || gemini.orderCodeOrPhone) {
      const codeOrPhone = gemini.orderCodeOrPhone || this.extractOrderCodeOrPhone(rawMessage);
      return this.handleOrderSupport(rawMessage, codeOrPhone);
    }

    if (gemini.intent === 'HANDOVER_HUMAN') {
      return {
        reply: gemini.reply || 'Dạ Giftory đã kết nối bạn với chuyên viên tư vấn trực tuyến!',
        intent: 'HANDOVER_HUMAN',
        handoverInfo: {
          agentName: 'Thùy Chi (Chuyên viên CSKH Giftory)',
          avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
          hotline: '1900 8888 (Phím 1)',
          zaloUrl: 'https://zalo.me/giftory',
          queueTime: 'Dưới 1 phút'
        }
      };
    }

    if (gemini.intent === 'AMBIGUOUS') {
      return {
        reply: gemini.reply || 'Chào bạn! Mình là Trợ lý AI của Giftory. Bạn muốn tìm quà tặng hay kiểm tra đơn hàng đã đặt?',
        intent: 'AMBIGUOUS',
        quickChips: [
          { label: '✨ Tư vấn quà tặng', value: 'Tư vấn quà tặng', step: 1 },
          { label: '📦 Tra cứu đơn hàng', value: 'Tra cứu đơn hàng' },
          { label: '⚡ Giao hỏa tốc 2h', value: 'Chính sách giao hàng hỏa tốc' },
          { label: '🎨 Khắc tên cá nhân', value: 'Thời gian khắc tên mất bao lâu' }
        ]
      };
    }

    // Recommendation Intent: Kết hợp bóc tách của Gemini với Catalog DB thực tế (BR-REC03 Zero Hallucination)
    const mergedContext = {
      recipient: gemini.entities?.recipient || existingContext?.recipient,
      occasion: gemini.entities?.occasion || existingContext?.occasion,
      budget: gemini.entities?.budget || existingContext?.budget,
      preferences: gemini.entities?.preferences || existingContext?.preferences,
    };

    return this.queryCatalogAndFormulateResponse(mergedContext, gemini.reply);
  }

  // --- LOCAL RULE-BASED NLP ENGINE (Fallback) ---
  private async processLocalEngine(
    rawMessage: string,
    cleanMessage: string,
    context?: ChatMessageDto['context']
  ): Promise<ChatResponse> {
    // Kiểm tra Intent Policy FAQ
    if (this.isPolicyFaqIntent(cleanMessage)) {
      return this.handlePolicyFaq(cleanMessage);
    }

    // Kiểm tra Intent Support Order
    const orderCodeOrPhone = this.extractOrderCodeOrPhone(rawMessage);
    if (this.isOrderSupportIntent(cleanMessage) || orderCodeOrPhone) {
      return this.handleOrderSupport(rawMessage, orderCodeOrPhone);
    }

    // Kiểm tra câu chào mơ hồ
    if (this.isAmbiguousGreeting(cleanMessage)) {
      return {
        reply: 'Chào bạn! Mình là Trợ lý AI của Giftory. Bạn đang muốn Giftory tư vấn quà tặng mới hay muốn tra cứu tình trạng đơn hàng đã đặt trước đó?',
        intent: 'AMBIGUOUS',
        quickChips: [
          { label: '✨ Tư vấn quà tặng', value: 'Tư vấn quà tặng', step: 1 },
          { label: '📦 Tra cứu đơn hàng', value: 'Tra cứu đơn hàng' },
          { label: '⚡ Chính sách giao hỏa tốc 2h', value: 'Chính sách giao hàng hỏa tốc' },
          { label: '🎨 Thời gian khắc tên cá nhân', value: 'Thời gian khắc tên mất bao lâu' }
        ]
      };
    }

    // Recommendation Intent qua Local NLP
    const localExtracted = this.extractEntities(cleanMessage, rawMessage);
    const mergedContext = {
      recipient: localExtracted.recipient || context?.recipient,
      occasion: localExtracted.occasion || context?.occasion,
      budget: localExtracted.budget || context?.budget,
      preferences: localExtracted.preferences || context?.preferences,
    };

    return this.queryCatalogAndFormulateResponse(mergedContext);
  }

  // --- CORE CATALOG QUERY & RESPONSE FORMULATION (BR-REC01 -> BR-REC05) ---
  private async queryCatalogAndFormulateResponse(
    mergedContext: ChatMessageDto['context'] = {},
    customIntroReply?: string
  ): Promise<ChatResponse> {
    // Kiểm tra ngưỡng tối thiểu 2 tiêu chí (BR-REC04)
    const criteriaCount = [
      mergedContext.recipient,
      mergedContext.occasion,
      mergedContext.budget,
      mergedContext.preferences
    ].filter(Boolean).length;

    if (criteriaCount < 2) {
      if (!mergedContext.recipient) {
        return {
          reply: customIntroReply || 'Dạ để gợi ý món quà phù hợp nhất, bạn muốn tặng quà cho ai thế ạ? (ví dụ: Người yêu, Mẹ, Bố, Bạn bè, Sếp...)',
          intent: 'RECOMMENDATION',
          contextUpdate: mergedContext,
          quickChips: [
            { label: 'Người yêu / Bạn gái', value: 'Tặng người yêu', step: 1 },
            { label: 'Mẹ', value: 'Tặng mẹ', step: 1 },
            { label: 'Bố', value: 'Tặng bố', step: 1 },
            { label: 'Bạn thân', value: 'Tặng bạn thân', step: 1 },
            { label: 'Sếp / Đồng nghiệp', value: 'Tặng sếp hoặc đồng nghiệp', step: 1 }
          ]
        };
      } else if (!mergedContext.occasion) {
        return {
          reply: customIntroReply || `Dạ bạn muốn tìm quà cho ${mergedContext.recipient} nhân dịp gì thế ạ?`,
          intent: 'RECOMMENDATION',
          contextUpdate: mergedContext,
          quickChips: [
            { label: '🎂 Sinh nhật', value: 'Dịp sinh nhật', step: 2 },
            { label: '💖 Kỷ niệm tình yêu', value: 'Dịp kỷ niệm tình yêu', step: 2 },
            { label: '💐 8/3 - 20/10', value: 'Dịp ngày phụ nữ 8/3 và 20/10', step: 2 },
            { label: '🏠 Tân gia', value: 'Dịp tân gia', step: 2 },
            { label: '🎄 Giáng sinh / Năm mới', value: 'Dịp Giáng sinh và Năm mới', step: 2 }
          ]
        };
      } else {
        return {
          reply: customIntroReply || `Dạ quà cho ${mergedContext.recipient} dịp ${mergedContext.occasion}, ngân sách dự kiến của bạn khoảng bao nhiêu ạ?`,
          intent: 'RECOMMENDATION',
          contextUpdate: mergedContext,
          quickChips: [
            { label: 'Dưới 300.000đ', value: 'Ngân sách dưới 300k', step: 3 },
            { label: '300.000đ - 500.000đ', value: 'Ngân sách 500k', step: 3 },
            { label: '500.000đ - 1.000.000đ', value: 'Ngân sách 1 triệu', step: 3 },
            { label: 'Trên 1.000.000đ (Cao cấp)', value: 'Ngân sách trên 1 triệu cao cấp', step: 3 }
          ]
        };
      }
    }

    // Truy vấn CSDL Catalog thực tế (BR-REC01, BR-REC02, BR-REC03)
    const baseFilter: any = {
      status: 'ACTIVE',
      stock: { $gt: 0 }
    };

    if (mergedContext.budget) {
      baseFilter.price = { $lte: mergedContext.budget * 1.25 }; // Dung sai 25%
    }

    const searchTerms: string[] = [];
    if (mergedContext.recipient) searchTerms.push(mergedContext.recipient);
    if (mergedContext.occasion) searchTerms.push(mergedContext.occasion);
    if (mergedContext.preferences) searchTerms.push(mergedContext.preferences);

    let matchedProducts: any[] = [];

    if (searchTerms.length > 0) {
      const orConditions = searchTerms.map(term => {
        const regex = buildVietnameseRegex(term);
        return {
          $or: [
            { name: regex },
            { tags: regex },
            { description: regex }
          ]
        };
      });

      matchedProducts = await this.productModel
        .find({
          ...baseFilter,
          $or: orConditions
        })
        .populate('category', 'name slug')
        .sort({ soldCount: -1, rating: -1 })
        .limit(5)
        .exec();
    }

    if (matchedProducts.length === 0 && mergedContext.budget) {
      matchedProducts = await this.productModel
        .find(baseFilter)
        .populate('category', 'name slug')
        .sort({ soldCount: -1, rating: -1 })
        .limit(5)
        .exec();
    }

    // Cơ chế Fallback tiệm cận (BR-REC05)
    let isProximateFallback = false;
    let replyText = '';

    if (matchedProducts.length === 0) {
      isProximateFallback = true;
      matchedProducts = await this.productModel
        .find({ status: 'ACTIVE', stock: { $gt: 0 } })
        .populate('category', 'name slug')
        .sort({ soldCount: -1, rating: -1 })
        .limit(4)
        .exec();

      replyText = customIntroReply 
        ? `${customIntroReply}\n\n*(Lưu ý: Giftory đang gợi ý các lựa chọn quà bán chạy tiệm cận nhất do tiêu chí tìm kiếm hiện tại chưa có sản phẩm khớp 100%)*`
        : `Giftory chưa có sản phẩm khớp 100% tất cả tiêu chí của bạn (cho ${mergedContext.recipient || 'người nhận'}, dịp ${mergedContext.occasion || 'đặc biệt'}), nhưng trợ lý đề xuất các món quà bán chạy và được yêu thích nhất có thể tùy chỉnh tên riêng phù hợp dưới đây:`;
    } else {
      const occasionText = mergedContext.occasion ? ` dịp ${mergedContext.occasion}` : '';
      const recipientText = mergedContext.recipient ? ` cho ${mergedContext.recipient}` : '';
      replyText = customIntroReply || `Giftory xin gợi ý ${matchedProducts.length} món quà cực kỳ ý nghĩa và tinh tế${recipientText}${occasionText} phù hợp với ngân sách của bạn:`;
    }

    // Format sản phẩm kèm lý do thuyết phục (US-PD-04.2)
    const formattedProducts = matchedProducts.map(p => {
      let fitReason = 'Thiết kế tinh tế, chất lượng cao cấp phù hợp làm quà tặng ý nghĩa.';
      if (p.isCustomizable) {
        fitReason = 'Có thể khắc tên, lời chúc hoặc in hình cá nhân hóa độc bản.';
      } else if (p.rating >= 4.8) {
        fitReason = `Được đánh giá ${p.rating}★ với độ hoàn thiện xuất sắc và đóng gói hộp quà sang trọng.`;
      }

      return {
        id: p._id,
        name: p.name,
        slug: p.slug,
        price: p.price,
        salePrice: p.salePrice || 0,
        image: p.images?.[0] || 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600',
        isCustomizable: p.isCustomizable,
        rating: p.rating,
        fitReason,
        categoryName: p.category?.name || 'Quà tặng'
      };
    });

    return {
      reply: replyText,
      intent: 'RECOMMENDATION',
      products: formattedProducts,
      contextUpdate: mergedContext,
      isProximateFallback,
      quickChips: [
        { label: '✨ Tùy chỉnh ngân sách', value: 'Đổi ngân sách', step: 3 },
        { label: '🎨 Chỉ xem quà có khắc tên', value: 'Tìm quà khắc tên' },
        { label: '📞 Gặp nhân viên tư vấn', value: 'Cho mình gặp nhân viên tư vấn' }
      ]
    };
  }

  // --- Handover & Order Detection Helpers ---
  private isHandoverIntent(text: string): boolean {
    const handoverKeywords = [
      'gap nguoi that', 'gap nhan vien', 'tu van vien', 'gap cskh', 'nhan vien tu van',
      'ket noi nhan vien', 'gap ho tro', 'gap truc tiep', 'khieu nai', 'goi hotline'
    ];
    return handoverKeywords.some(k => text.includes(k));
  }

  private isOrderSupportIntent(text: string): boolean {
    const orderKeywords = [
      'don hang', 'kiem tra don', 'tra cuu don', 'ma don', 'da giao chua',
      'van chuyen den dau', 'khi nao nhan duoc', 'tinh trang don'
    ];
    return orderKeywords.some(k => text.includes(k));
  }

  private extractOrderCodeOrPhone(raw: string): string | null {
    const gfMatch = raw.match(/\b(GF[0-9]{4,10}|ORD-[0-9]{4,10})\b/i);
    if (gfMatch && gfMatch[1]) {
      return gfMatch[1].toUpperCase();
    }
    const hashMatch = raw.match(/#([A-Za-z0-9]{4,12})/);
    if (hashMatch && hashMatch[1]) {
      return hashMatch[1].toUpperCase();
    }
    const explicitOrderMatch = raw.match(/(?:mã đơn|đơn hàng|code)\s*[:#]?\s*([A-Za-z0-9]{4,12})/i);
    if (explicitOrderMatch && explicitOrderMatch[1]) {
      const code = explicitOrderMatch[1].toUpperCase();
      if (!['CUSTOM', 'SHOP', 'GIFTORY', 'ONLINE'].includes(code)) {
        return code;
      }
    }
    const phoneMatch = raw.match(/\b(0[3|5|7|8|9][0-9]{8})\b/);
    if (phoneMatch && phoneMatch[1]) {
      return phoneMatch[1];
    }
    return null;
  }

  private async handleOrderSupport(rawMessage: string, extractedCodeOrPhone: string | null): Promise<ChatResponse> {
    if (!extractedCodeOrPhone) {
      return {
        reply: 'Để kiểm tra thông tin đơn hàng, bạn vui lòng cung cấp Mã đơn hàng (ví dụ: GF123456) hoặc Số điện thoại đặt hàng nhé ạ!',
        intent: 'SUPPORT_ORDER',
        quickChips: [
          { label: 'Ví dụ: GF100123', value: 'GF100123' },
          { label: 'Gặp nhân viên hỗ trợ', value: 'Cho mình gặp nhân viên tư vấn' }
        ]
      };
    }

    const isPhone = /^0[35789][0-9]{8}$/.test(extractedCodeOrPhone);
    const filter = isPhone
      ? { 'customerInfo.phone': extractedCodeOrPhone }
      : { orderCode: new RegExp(extractedCodeOrPhone, 'i') };

    const order = await this.orderModel.findOne(filter).sort({ createdAt: -1 }).exec();

    if (!order) {
      return {
        reply: `Dạ Giftory chưa tìm thấy đơn hàng khớp với "${extractedCodeOrPhone}". Bạn vui lòng kiểm tra lại mã đơn hoặc số điện thoại, hoặc kết nối với nhân viên CSKH để được kiểm tra trực tiếp nhé.`,
        intent: 'SUPPORT_ORDER',
        quickChips: [
          { label: '📞 Kết nối nhân viên CSKH', value: 'Cho mình gặp nhân viên tư vấn' },
          { label: '🎁 Quay lại tư vấn quà', value: 'Tư vấn quà tặng' }
        ]
      };
    }

    const statusMap: Record<string, string> = {
      PENDING: 'Đang chờ xác nhận',
      PROCESSING: 'Đang gia công / Đóng gói',
      SHIPPED: 'Đang vận chuyển',
      DELIVERED: 'Đã giao hàng thành công',
      CANCELLED: 'Đã hủy đơn'
    };

    const statusVi = statusMap[order.orderStatus] || order.orderStatus;
    const itemsSummary = order.items.map(i => `${i.productName} (x${i.quantity})`).join(', ');

    return {
      reply: `Đơn hàng #${order.orderCode} của bạn hiện có trạng thái: **${statusVi}**.\n• Người nhận: ${order.customerInfo.name} (${order.customerInfo.phone})\n• Sản phẩm: ${itemsSummary}\n• Tổng thanh toán: ${order.pricing.totalAmount?.toLocaleString('vi-VN')}đ\n• Địa chỉ giao hàng: ${order.customerInfo.address}`,
      intent: 'SUPPORT_ORDER',
      orderInfo: {
        orderCode: order.orderCode,
        status: statusVi,
        rawStatus: order.orderStatus,
        customerName: order.customerInfo.name,
        phone: order.customerInfo.phone,
        totalAmount: order.pricing.totalAmount,
        itemsCount: order.items.length,
        items: order.items.map(i => ({
          productName: i.productName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          productImage: i.productImage
        }))
      },
      quickChips: [
        { label: '📞 Gặp nhân viên hỗ trợ thêm', value: 'Cho mình gặp nhân viên tư vấn' },
        { label: '🎁 Tiếp tục xem quà tặng', value: 'Tư vấn quà tặng' }
      ]
    };
  }

  // --- Policy FAQs (US-PD-03 & BR-PAY05) ---
  private isPolicyFaqIntent(text: string): boolean {
    const policyKeywords = [
      'giao hang', 'hoa toc', 'doi tra', 'bao hanh', 'dat coc', 'coc', 'khac laser',
      'khac ten mat bao lau', 'phi ship', 'freeship', 'chinh sach'
    ];
    return policyKeywords.some(k => text.includes(k));
  }

  private handlePolicyFaq(text: string): ChatResponse {
    let reply = '';
    const chips: any[] = [];

    if (text.includes('hoa toc') || text.includes('giao hang') || text.includes('bao lau nhan')) {
      reply = '🚀 **Chính sách Giao hàng Giftory:**\n• **Giao hỏa tốc 2 giờ:** Áp dụng cho các đơn hàng quà tặng tại nội thành TP.HCM và Hà Nội.\n• **Giao tiêu chuẩn:** Toàn quốc từ 2 - 3 ngày làm việc.\n• **Freeship:** Đơn hàng từ 500.000đ được miễn phí vận chuyển toàn quốc!';
      chips.push({ label: 'Xem quà giao hỏa tốc', value: 'Tìm quà giao hỏa tốc 2h' });
    } else if (text.includes('doi tra') || text.includes('bao hanh')) {
      reply = '🔄 **Chính sách Đổi trả & Bảo hành:**\n• Giftory hỗ trợ đổi trả 1:1 miễn phí trong **7 ngày** nếu sản phẩm có lỗi từ nhà sản xuất hoặc hư hại do vận chuyển.\n• *Lưu ý:* Đối với sản phẩm cá nhân hóa (Bespoke khắc tên/in ảnh riêng), Giftory chỉ hỗ trợ làm lại nếu lỗi sai nội dung so với thiết kế đã duyệt.';
      chips.push({ label: '📞 Gặp nhân viên hỗ trợ đổi trả', value: 'Cho mình gặp nhân viên tư vấn' });
    } else if (text.includes('coc') || text.includes('dat coc') || text.includes('50%')) {
      reply = '💎 **Chính sách Đặt cọc quà Bespoke (BR-PAY05):**\n• Đối với các sản phẩm thiết kế theo yêu cầu (Khắc tên, in UV, chế tác riêng), Giftory áp dụng mức đặt cọc **50% giá trị đơn hàng** trước khi bắt đầu gia công để đảm bảo phôi chế tác độc bản.\n• Số tiền còn lại quý khách thanh toán khi nhận hàng (COD) sau khi kiểm tra.';
      chips.push({ label: 'Khám phá sản phẩm Bespoke', value: 'Tìm sản phẩm khắc tên' });
    } else if (text.includes('khac laser') || text.includes('khac ten')) {
      reply = '✨ **Quy trình Khắc tên & In ấn cá nhân:**\n• Công nghệ khắc Laser Fiber và in UV Nhật Bản sắc nét, bền vĩnh cửu.\n• **Thời gian hoàn thiện siêu tốc:** Chỉ từ 2 - 4 giờ trong ngày!\n• Quý khách được xem trước bản vẽ 3D trực tiếp trên website trước khi xác nhận đặt hàng.';
      chips.push({ label: 'Tùy chỉnh quà tặng ngay', value: 'Gợi ý quà có thể khắc tên' });
    } else {
      reply = 'Giftory cam kết chất lượng sản phẩm chuẩn xác, dịch vụ đóng gói hộp quà cao cấp, hỗ trợ viết thiệp miễn phí và giao hàng hỏa tốc trong 2h.';
    }

    chips.push({ label: '🎁 Tư vấn quà tặng', value: 'Tư vấn quà tặng', step: 1 });

    return {
      reply,
      intent: 'SUPPORT_POLICY',
      quickChips: chips
    };
  }

  // --- Ambiguous Greetings ---
  private isAmbiguousGreeting(text: string): boolean {
    const greetings = ['hi', 'hello', 'alo', 'chao', 'xin chao', 'shop oi', 'ad oi', 'cho hoi'];
    return greetings.some(g => text === g || text === g + ' shop' || text === g + ' ad');
  }

  // --- Entity Extraction Helper (Local NLP) ---
  private extractEntities(cleanText: string, rawText: string) {
    let recipient: string | undefined;
    let occasion: string | undefined;
    let budget: number | undefined;
    let preferences: string | undefined;

    // Recipient
    if (cleanText.includes('me') || cleanText.includes('me yeu')) recipient = 'Mẹ';
    else if (cleanText.includes('bo') || cleanText.includes('ba') || cleanText.includes('cha')) recipient = 'Bố';
    else if (cleanText.includes('nguoi yeu') || cleanText.includes('ban gai') || cleanText.includes('crush') || cleanText.includes('vo')) recipient = 'Người yêu';
    else if (cleanText.includes('ban trai') || cleanText.includes('chong')) recipient = 'Bạn trai';
    else if (cleanText.includes('ban than') || cleanText.includes('ban be')) recipient = 'Bạn bè';
    else if (cleanText.includes('sep') || cleanText.includes('dong nghiep')) recipient = 'Đồng nghiệp / Sếp';
    else if (cleanText.includes('thay') || cleanText.includes('co giao')) recipient = 'Thầy cô';

    // Occasion
    if (cleanText.includes('sinh nhat')) occasion = 'Sinh nhật';
    else if (cleanText.includes('ky niem') || cleanText.includes('anniversary')) occasion = 'Kỷ niệm';
    else if (cleanText.includes('8/3') || cleanText.includes('20/10') || cleanText.includes('phu nu')) occasion = 'Ngày phụ nữ';
    else if (cleanText.includes('tan gia')) occasion = 'Tân gia';
    else if (cleanText.includes('giang sinh') || cleanText.includes('noel')) occasion = 'Giáng sinh';
    else if (cleanText.includes('tet') || cleanText.includes('nam moi')) occasion = 'Năm mới';
    else if (cleanText.includes('tot nghiep')) occasion = 'Tốt nghiệp';
    else if (cleanText.includes('tri an')) occasion = 'Tri ân';

    // Budget
    const kMatch = cleanText.match(/(\d+)\s*(k|nghin|ngan)/);
    if (kMatch) {
      budget = parseInt(kMatch[1], 10) * 1000;
    } else {
      const trMatch = cleanText.match(/(\d+(\.\d+)?)\s*(trieu|tr)/);
      if (trMatch) {
        budget = Math.round(parseFloat(trMatch[1]) * 1000000);
      } else {
        const rawNumMatch = rawText.match(/(\d{2,3})[.,](\d{3})/);
        if (rawNumMatch) {
          budget = parseInt(rawNumMatch[1] + rawNumMatch[2], 10);
        }
      }
    }

    // Preferences
    if (cleanText.includes('khac ten') || cleanText.includes('in anh') || cleanText.includes('ca nhan')) {
      preferences = 'Khắc tên / Cá nhân hóa';
    } else if (cleanText.includes('go')) {
      preferences = 'Chất liệu Gỗ';
    } else if (cleanText.includes('kim loai') || cleanText.includes('but')) {
      preferences = 'Bút ký / Kim loại';
    } else if (cleanText.includes('da') || cleanText.includes('vi da')) {
      preferences = 'Chất liệu Da';
    }

    return { recipient, occasion, budget, preferences };
  }

  // --- Quick Chips Provider (US-PD-03.3) ---
  getQuickChipsByStep(step: number) {
    if (step === 1) {
      return [
        { label: 'Người yêu / Bạn gái', value: 'Tặng người yêu', step: 1 },
        { label: 'Mẹ', value: 'Tặng mẹ', step: 1 },
        { label: 'Bố', value: 'Tặng bố', step: 1 },
        { label: 'Bạn thân', value: 'Tặng bạn thân', step: 1 },
        { label: 'Sếp / Đồng nghiệp', value: 'Tặng đồng nghiệp', step: 1 }
      ];
    } else if (step === 2) {
      return [
        { label: '🎂 Sinh nhật', value: 'Dịp sinh nhật', step: 2 },
        { label: '💖 Kỷ niệm', value: 'Dịp kỷ niệm', step: 2 },
        { label: '💐 8/3 & 20/10', value: 'Dịp 8/3 - 20/10', step: 2 },
        { label: '🏠 Tân gia', value: 'Dịp tân gia', step: 2 },
        { label: '🎄 Giáng sinh / Tết', value: 'Dịp Giáng sinh', step: 2 }
      ];
    } else {
      return [
        { label: 'Dưới 300.000đ', value: 'Ngân sách dưới 300k', step: 3 },
        { label: '300.000đ - 500.000đ', value: 'Ngân sách 500k', step: 3 },
        { label: '500.000đ - 1.000.000đ', value: 'Ngân sách 1 triệu', step: 3 },
        { label: 'Trên 1.000.000đ (Cao cấp)', value: 'Ngân sách trên 1 triệu', step: 3 }
      ];
    }
  }
}
