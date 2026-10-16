import { Component, input } from '@angular/core';

@Component({
  selector: 'app-greeting-card-preview',
  standalone: true,
  template: `
    <article class="card" [attr.data-template]="templateId()" aria-label="Xem trước thiệp chúc mừng">
      <div class="ornament" aria-hidden="true">{{ templateId() === 'BIRTHDAY' ? '✦ · ✧ · ✦' : templateId() === 'LOVE' ? '♡' : '❋' }}</div>
      <h3>{{ heading().normalize('NFC') || 'Tiêu đề thiệp của bạn' }}</h3>
      <p class="message">{{ message().normalize('NFC') || 'Lời chúc của bạn sẽ xuất hiện ở đây…' }}</p>
      <span class="signature">GIFTORY · Gửi quà, trao yêu thương</span>
    </article>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .card { box-sizing: border-box; position: relative; display: flex; flex-direction: column; align-items: center; gap: 12px; min-height: 260px; height: 100%; padding: 24px; border: 1px solid #d8c6ec; border-radius: 16px; background: #faf5ff; color: #553582; text-align: center; overflow-wrap: anywhere; }
    .card::before { content: ''; position: absolute; inset: 7px; border: 1px solid currentColor; opacity: .2; border-radius: 10px; pointer-events: none; }
    .card[data-template="LOVE"] { background: #fff5f5; color: #9b3b55; border-color: #efc3ce; }
    .card[data-template="THANK_YOU"] { background: #f4f9f5; color: #376c54; border-color: #c3dcca; }
    .ornament { font-size: 23px; line-height: 1; }
    h3 { font: 700 22px/1.45 'Giftory Card Serif', 'Times New Roman', serif; letter-spacing: normal; margin: 0; }
    .message { flex: 1; white-space: pre-wrap; font: 400 14px/1.65 'Giftory Card Serif', 'Times New Roman', serif; letter-spacing: normal; margin: 0; width: 100%; }
    .signature { font: 9px/1.4 Arial, sans-serif; letter-spacing: 1px; opacity: .7; }
    @media print {
      .card { min-height: 0; border-radius: 0; padding: 8mm; gap: 3mm; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      h3 { font-size: 20px; }
      .message { font-size: 13px; line-height: 1.4; }
    }
  `],
})
export class GreetingCardPreviewComponent {
  readonly templateId = input('BIRTHDAY');
  readonly heading = input('Gửi bạn thật nhiều yêu thương');
  readonly message = input('');
}
