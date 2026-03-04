export type TransactionType = "income" | "expense" | "investment";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description?: string;
  date: string;
  recurring: boolean;
  linkedNodeId?: string;
  tags: string[];
  createdAt: number;
}

export interface CreateTransactionInput {
  type: TransactionType;
  amount: number;
  category: string;
  description?: string;
  date: string;
  recurring?: boolean;
  linkedNodeId?: string;
  tags?: string[];
}

export type BudgetPeriod = "weekly" | "monthly";

export interface Budget {
  id: string;
  category: string;
  amount: number;
  period: BudgetPeriod;
  createdAt: number;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  totalInvestments: number;
  savingsRate: number;
  netWorth: number;
}
