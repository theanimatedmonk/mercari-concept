import amazonMark from '../../assets/myntra.png';
import myntraMark from '../../assets/amazon.png';
import type { MerchantId } from '../../types';

export function merchantMark(merchant: MerchantId | undefined) {
  if (merchant === 'amazon') return amazonMark;
  if (merchant === 'myntra') return myntraMark;
  return undefined;
}
