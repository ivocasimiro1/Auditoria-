export type Carrier = 'CTT' | 'DHL' | 'MRW';

export interface ShippingQuote {
  carrier: Carrier;
  cost_eur: number;
  estimated_days: string;
  description: string;
}

export function calculateShipping(stickerCount: number): ShippingQuote[] {
  const quotes: ShippingQuote[] = [
    {
      carrier: 'CTT',
      cost_eur: stickerCount <= 50 ? 1.20 : stickerCount <= 200 ? 2.10 : 3.50,
      estimated_days: '3-5 dias úteis',
      description: 'CTT Correios de Portugal — envio standard',
    },
    {
      carrier: 'DHL',
      cost_eur: parseFloat((5.90 + stickerCount * 0.02).toFixed(2)),
      estimated_days: '1-2 dias úteis',
      description: 'DHL Express — entrega rápida',
    },
    {
      carrier: 'MRW',
      cost_eur: stickerCount <= 100 ? 3.40 : 5.80,
      estimated_days: '2-3 dias úteis',
      description: 'MRW Ibérica — envio Peninsula Ibérica',
    },
  ];
  return quotes;
}

export function generateTrackingNumber(carrier: Carrier): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `${carrier}${rand}${year}PT`;
}

export function generateLabel(carrier: Carrier, trackingNumber: string, fromUser: string, toUser: string): string {
  return JSON.stringify({
    carrier,
    tracking: trackingNumber,
    from: fromUser,
    to: toUser,
    generated_at: new Date().toISOString(),
    barcode: `*${trackingNumber}*`,
    instructions: 'Colocar em envelope acolchoado. Cromos devem estar protegidos com plástico.',
  });
}

export const TRACKING_STATES = [
  'label_created',
  'picked_up',
  'in_transit',
  'delivered',
] as const;
