const assert = require('node:assert/strict');
const { normalizeGreetingCard } = require('../dist/modules/orders/greeting-card.rules');
const { normalizeGift, giftRecipientView } = require('../dist/modules/orders/gift.rules');
const input = { templateId: 'LOVE', message: 'Have a lovely day!', senderName: '  Your   friend ', recipientName: ' Dear   you ' };
const card = normalizeGreetingCard(input);
assert.equal(card.senderName, 'Your friend');
assert.equal(card.recipientName, 'Dear you');
for (const key of ['senderName', 'recipientName']) {
  assert.throws(() => normalizeGreetingCard({ ...input, [key]: 'a'.repeat(101) }));
  assert.throws(() => normalizeGreetingCard({ ...input, [key]: 123 }));
}
assert.equal(normalizeGreetingCard({ templateId: 'LOVE', message: 'Legacy card' }).senderName, undefined);
const gift = normalizeGift({ enabled: true, anonymous: true, sender: { name: 'Private Buyer', phone: '0912345678', email: 'buyer@example.test' } }, { name: 'Recipient', phone: '0988888888' }, card, 'VIETQR');
assert.equal(card.senderName, 'Giftory');
const view = giftRecipientView({ gift, customerInfo: { name: 'Recipient' }, greetingCard: { ...card, senderName: 'Private Buyer' }, items: [] });
assert.equal(view.greetingCard.senderName, 'Giftory');
assert.equal(view.greetingCard.recipientName, 'Dear you');
console.log('PASS card names normalize, reject invalid values, preserve legacy cards, and hide anonymous senders');
