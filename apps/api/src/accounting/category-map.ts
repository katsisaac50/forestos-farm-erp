// Categories are user-typed free text, so we normalize case and trim.
// Any category not in this map falls to `Unclassified Expense` / `Unclassified Income`
// so backfill never fails, and reports surface them for manual classification.

const normalize = (s: string) => s.trim().toLowerCase();

// key = normalized category, value = GL account code to DEBIT for expense / CREDIT for income
const EXPENSE_MAP: Record<string, string> = {
  'labour':                  '6000',
  'field labour':            '6000',
  'apiary labour':           '6010',
  'admin labour':            '6020',
  'wages':                   '6000',
  'seedlings':               '6100',
  'planting':                '6100',
  'fertiliser':              '6110',
  'fertilizer':              '6110',
  'chemicals':               '6110',
  'tools':                   '6200',
  'equipment':               '6200',
  'fuel':                    '6210',
  'transport':               '6210',
  'maintenance':             '6220',
  'repairs':                 '6220',
  'insurance':               '6300',
  'utilities':               '6310',
  'professional fees':       '6400',
  'depreciation':            '6500',
  'plantation maintenance':  '6000',
  'weeding':                 '6000',
};

const INCOME_MAP: Record<string, string> = {
  'timber':                  '4000',
  'timber sales':            '4000',
  'wood':                    '4000',
  'honey':                   '4010',
  'honey sales':             '4010',
  'contract services':       '4020',
};

export function expenseAccountFor(category: string): string {
  return EXPENSE_MAP[normalize(category)] ?? '6999';
}

export function incomeAccountFor(category: string): string {
  return INCOME_MAP[normalize(category)] ?? '4999';
}

// The GL account to credit / debit based on payment method
export function cashAccountFor(paymentMethod: string): string {
  switch (paymentMethod) {
    case 'Bank':          return '1010';
    case 'Mobile money':  return '1020';
    case 'Cash':
    case 'Other':
    default:              return '1000';
  }
}