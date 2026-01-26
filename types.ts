
export enum IncomeType {
  HOURLY = 'Hourly',
  MONTHLY = 'Monthly',
  YEARLY = 'Yearly'
}

export interface HeldItem {
  id: string;
  name: string;
  price: number;
  calculatedHours: number;
  revisitTimestamp?: number;
  createdTimestamp: number;
}
