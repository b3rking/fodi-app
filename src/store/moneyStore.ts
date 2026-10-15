import { create } from 'zustand';
import {
  deleteExpense as dbDeleteExpense,
  deleteIncome as dbDeleteIncome,
  deleteRecurring as dbDeleteRecurring,
  initDatabase,
  insertExpense as dbInsertExpense,
  insertIncome as dbInsertIncome,
  insertRecurring as dbInsertRecurring,
  listCategories,
  listExpenses,
  listIncomes,
  listRecurrings,
  updateExpense as dbUpdateExpense,
  updateIncome as dbUpdateIncome,
  updateRecurring as dbUpdateRecurring,
  type CategoryRow,
  type ExpenseRow,
  type IncomeRow,
  type NewExpense,
  type NewIncome,
  type RecurringRow,
} from '../db/database';
import { expandRecurrings, monthRange, type Occurrence } from '../core/money/period';

interface MoneyState {
  ready: boolean;
  /** Mois affiché : année + index 0-11. */
  year: number;
  month: number;
  categories: CategoryRow[];
  expenses: ExpenseRow[];
  incomes: IncomeRow[];
  recurrings: RecurringRow[];
  occurrences: Occurrence[];
  load: () => Promise<void>;
  setMonth: (year: number, month: number) => Promise<void>;
  addExpense: (input: NewExpense) => Promise<void>;
  editExpense: (id: number, input: NewExpense) => Promise<void>;
  removeExpense: (id: number) => Promise<NewExpense | null>;
  restoreExpense: (snapshot: NewExpense) => Promise<void>;
  addIncome: (input: NewIncome) => Promise<void>;
  editIncome: (id: number, input: NewIncome) => Promise<void>;
  removeIncome: (id: number) => Promise<NewIncome | null>;
  restoreIncome: (snapshot: NewIncome) => Promise<void>;
  addRecurring: (rule: Omit<RecurringRow, 'id'>) => Promise<void>;
  editRecurring: (id: number, rule: Omit<RecurringRow, 'id'>) => Promise<void>;
  removeRecurring: (id: number) => Promise<void>;
}

async function reloadMonth(year: number, month: number) {
  const { from, to } = monthRange(year, month);
  const [categories, expenses, incomes, recurrings] = await Promise.all([
    listCategories('cost').then(async (costs) => [...costs, ...(await listCategories('income'))]),
    listExpenses(from, to),
    listIncomes(from, to),
    listRecurrings(),
  ]);
  const occurrences = expandRecurrings(
    recurrings
      .filter((r) => r.active)
      .map((r) => ({
        id: r.id,
        label: r.label,
        amount: r.amount,
        cadence: r.cadence,
        nextDueMs: r.nextDue,
        active: true,
      })),
    from,
    to,
  );
  return { categories, expenses, incomes, recurrings, occurrences };
}

export const useMoneyStore = create<MoneyState>((set, get) => {
  const now = new Date();
  return {
    ready: false,
    year: now.getFullYear(),
    month: now.getMonth(),
    categories: [],
    expenses: [],
    incomes: [],
    recurrings: [],
    occurrences: [],

    load: async () => {
      await initDatabase();
      const { year, month } = get();
      set({ ready: true, ...(await reloadMonth(year, month)) });
    },

    setMonth: async (year, month) => {
      set({ year, month, ...(await reloadMonth(year, month)) });
    },

    addExpense: async (input) => {
      await dbInsertExpense(input);
      const { year, month } = get();
      set(await reloadMonth(year, month));
    },

    editExpense: async (id, input) => {
      await dbUpdateExpense(id, input);
      const { year, month } = get();
      set(await reloadMonth(year, month));
    },

    removeExpense: async (id) => {
      const found = get().expenses.find((e) => e.id === id) ?? null;
      if (!found) return null;
      await dbDeleteExpense(id);
      const { year, month } = get();
      set(await reloadMonth(year, month));
      const { id: _dropped, ...rest } = found;
      void _dropped;
      return rest;
    },

    restoreExpense: async (snapshot) => {
      await dbInsertExpense(snapshot);
      const { year, month } = get();
      set(await reloadMonth(year, month));
    },

    addIncome: async (input) => {
      await dbInsertIncome(input);
      const { year, month } = get();
      set(await reloadMonth(year, month));
    },

    editIncome: async (id, input) => {
      await dbUpdateIncome(id, input);
      const { year, month } = get();
      set(await reloadMonth(year, month));
    },

    removeIncome: async (id) => {
      const found = get().incomes.find((e) => e.id === id) ?? null;
      if (!found) return null;
      await dbDeleteIncome(id);
      const { year, month } = get();
      set(await reloadMonth(year, month));
      const { id: _dropped, ...rest } = found;
      void _dropped;
      return rest;
    },

    restoreIncome: async (snapshot) => {
      await dbInsertIncome(snapshot);
      const { year, month } = get();
      set(await reloadMonth(year, month));
    },

    addRecurring: async (rule) => {
      await dbInsertRecurring(rule);
      const { year, month } = get();
      set(await reloadMonth(year, month));
    },

    editRecurring: async (id, rule) => {
      await dbUpdateRecurring(id, rule);
      const { year, month } = get();
      set(await reloadMonth(year, month));
    },

    removeRecurring: async (id) => {
      await dbDeleteRecurring(id);
      const { year, month } = get();
      set(await reloadMonth(year, month));
    },
  };
});
