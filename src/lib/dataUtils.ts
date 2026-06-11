export const historicalEntriesToFinancial = (historical: any[]) => {
  return historical.map(h => ({
    id: h.id,
    entry_date: `${h.year}-${String(h.month).padStart(2, '0')}-01`,
    paid_amount: h.expense_amount || h.revenue_amount || 0,
    entry_type: h.revenue_amount !== undefined ? 'receita' : 'despesa',
    dre_group: h.dre_group || (h.revenue_amount !== undefined ? null : 'Outros'),
    business_unit: h.business_unit,
    account_category_id: null,
    category_id: null,
    is_historical: true
  }));
};
