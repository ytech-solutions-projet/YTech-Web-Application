import { buildReceiptDocument, __paymentReceiptTestUtils } from './paymentReceipt';

const createFakeCanvasContext = () => ({
  font: '',
  measureText(text) {
    return { width: `${text ?? ''}`.length * 13 };
  }
});

describe('payment receipt layout', () => {
  test('keeps footer clear of the last section on the same page', () => {
    const receipt = buildReceiptDocument({
      transaction: {
        id: 'pp_1774122384116',
        service: 'Application mobile',
        quoteId: 'DEV-2026-001',
        amount: 38500,
        currency: 'MAD',
        paymentMethod: 'paypal',
        paymentLabel: 'PayPal (othmane.b@gmail.com)',
        paymentEmail: 'othmane.b@gmail.com',
        status: 'completed',
        timestamp: '2026-03-21T19:59:44.000Z'
      },
      user: {
        name: 'Othmane B',
        email: 'othmane.b@gmail.com',
        company: 'test'
      }
    });

    const layout = __paymentReceiptTestUtils.buildReceiptLayout(createFakeCanvasContext(), receipt);
    const lastSection = layout.sections[layout.sections.length - 1];
    const lastSectionBottom = lastSection.y + lastSection.height;

    expect(lastSection.height).toBeGreaterThan(250);

    if (lastSection.pageIndex === layout.footerPageIndex) {
      expect(layout.footerY - lastSectionBottom).toBeGreaterThanOrEqual(28);
    } else {
      expect(layout.footerPageIndex).toBeGreaterThan(lastSection.pageIndex);
      expect(layout.footerY).toBe(__paymentReceiptTestUtils.RECEIPT_FOOTER_BASELINE_Y);
    }

    expect(layout.footerY).toBeLessThanOrEqual(__paymentReceiptTestUtils.RECEIPT_FOOTER_MAX_BASELINE_Y);
  });
});
