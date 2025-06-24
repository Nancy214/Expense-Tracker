export interface ExpenseType {
  _id?: string;
  date: string;
  title: string;
  amount: number;
  description?: string;
  category: string;
}

export interface ExpenseResponseType {
  _id: string;
  date: Date;
  title: string;
  amount: number;
  description?: string;
  category: string;
}
