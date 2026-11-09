export type DashboardSummary = {
 generatedAt:string;
 finance:{recordedIncomeUgx:number;recordedExpensesUgx:number;operatingNetUgx:number;transfersUgx:number};
 sales:{orderValueUgx:number;amountPaidUgx:number;outstandingUgx:number;orderCount:number};
 operations:{inventoryItems:number;lowStockItems:number;openTasks:number;overdueTasks:number};
 performanceByBusinessLine:Record<string,{income:number;expenses:number;net:number}>;
 warnings:string[];
};
