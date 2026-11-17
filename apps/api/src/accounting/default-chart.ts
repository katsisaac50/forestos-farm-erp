export type SeedAccount = {
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' | 'cogs';
  normalSide: 'debit' | 'credit';
};

export const DEFAULT_CHART: SeedAccount[] = [
  // Assets
  { code: '1000', name: 'Cash on Hand',         type: 'asset', normalSide: 'debit' },
  { code: '1010', name: 'Bank Account',         type: 'asset', normalSide: 'debit' },
  { code: '1020', name: 'Mobile Money',         type: 'asset', normalSide: 'debit' },
  { code: '1100', name: 'Accounts Receivable',  type: 'asset', normalSide: 'debit' },
  { code: '1200', name: 'Inventory: Seedlings', type: 'asset', normalSide: 'debit' },
  { code: '1210', name: 'Inventory: Honey',     type: 'asset', normalSide: 'debit' },
  { code: '1220', name: 'Inventory: Timber',    type: 'asset', normalSide: 'debit' },
  { code: '1230', name: 'Inventory: Supplies',  type: 'asset', normalSide: 'debit' },
  { code: '1300', name: 'Biological Assets: Growing Trees', type: 'asset', normalSide: 'debit' },
  { code: '1310', name: 'Biological Assets: Bee Colonies',  type: 'asset', normalSide: 'debit' },
  { code: '1400', name: 'PPE: Equipment',       type: 'asset', normalSide: 'debit' },
  { code: '1410', name: 'PPE: Vehicles',        type: 'asset', normalSide: 'debit' },

  // Liabilities
  { code: '2000', name: 'Accounts Payable',     type: 'liability', normalSide: 'credit' },
  { code: '2100', name: 'Accrued Expenses',     type: 'liability', normalSide: 'credit' },
  { code: '2200', name: 'Customer Deposits',    type: 'liability', normalSide: 'credit' },

  // Equity
  { code: '3000', name: "Owner's Capital",      type: 'equity', normalSide: 'credit' },
  { code: '3100', name: 'Retained Earnings',    type: 'equity', normalSide: 'credit' },

  // Revenue
  { code: '4000', name: 'Timber Sales',         type: 'revenue', normalSide: 'credit' },
  { code: '4010', name: 'Honey Sales',          type: 'revenue', normalSide: 'credit' },
  { code: '4020', name: 'Contract Services',    type: 'revenue', normalSide: 'credit' },
  { code: '4900', name: 'Other Income',         type: 'revenue', normalSide: 'credit' },

  // COGS
  { code: '5000', name: 'Cost of Timber Sold',  type: 'cogs', normalSide: 'debit' },
  { code: '5010', name: 'Cost of Honey Sold',   type: 'cogs', normalSide: 'debit' },
  { code: '5020', name: 'Harvesting Costs',     type: 'cogs', normalSide: 'debit' },

  // Operating Expenses
  { code: '6000', name: 'Field Labour',         type: 'expense', normalSide: 'debit' },
  { code: '6010', name: 'Apiary Labour',        type: 'expense', normalSide: 'debit' },
  { code: '6020', name: 'Admin Labour',         type: 'expense', normalSide: 'debit' },
  { code: '6100', name: 'Seedlings & Planting', type: 'expense', normalSide: 'debit' },
  { code: '6110', name: 'Fertiliser & Chemicals', type: 'expense', normalSide: 'debit' },
  { code: '6200', name: 'Tools & Equipment',    type: 'expense', normalSide: 'debit' },
  { code: '6210', name: 'Fuel & Transport',     type: 'expense', normalSide: 'debit' },
  { code: '6220', name: 'Repairs & Maintenance', type: 'expense', normalSide: 'debit' },
  { code: '6300', name: 'Insurance',            type: 'expense', normalSide: 'debit' },
  { code: '6310', name: 'Utilities',            type: 'expense', normalSide: 'debit' },
  { code: '6400', name: 'Professional Fees',    type: 'expense', normalSide: 'debit' },
  { code: '6500', name: 'Depreciation',         type: 'expense', normalSide: 'debit' },
  { code: '6900', name: 'Other Operating Expenses', type: 'expense', normalSide: 'debit' },

  // The "we don't know" bucket — used when a category can't be mapped
  { code: '6999', name: 'Unclassified Expense', type: 'expense', normalSide: 'debit' },
  { code: '4999', name: 'Unclassified Income',  type: 'revenue', normalSide: 'credit' },
];