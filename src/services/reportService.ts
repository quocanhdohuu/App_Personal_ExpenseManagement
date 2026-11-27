import { 
  TimeframeType, 
  ReportSummary, 
  CategorySpendItem, 
  TopReasonItem, 
  MemberSpendItem, 
  TimeSeriesItem 
} from '../types/report.types';
import { loadLocalTransactions } from './transactionService';
import { categoryService } from './categoryService';
import { supabase, isSupabaseConfigured, CURRENT_TEST_USER, SECONDARY_TEST_USER, getAccessibleLocalWalletIds } from './supabase';

export const reportService = {
  /**
   * Tính toán và tổng hợp toàn bộ báo cáo tài chính
   */
  async getReportData(
    timeframe: TimeframeType = 'MONTH',
    walletId?: string,
    customStart?: string,
    customEnd?: string
  ): Promise<ReportSummary> {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (timeframe === 'WEEK') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Thứ 2 đầu tuần
      startDate = new Date(now.setDate(diff));
      startDate.setHours(0, 0, 0, 0);
    } else if (timeframe === 'MONTH') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    } else if (timeframe === 'YEAR') {
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    } else {
      startDate = customStart ? new Date(customStart) : new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = customEnd ? new Date(customEnd) : now;
    }

    const categories = await categoryService.getCategories(walletId);
    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    let filteredTx = [];

    if (isSupabaseConfigured) {
      try {
        let query = supabase
          .from('transactions')
          .select('*, category:categories(*), creator:profiles!transactions_created_by_fkey(*)')
          .eq('is_deleted', false)
          .gte('transaction_date', startDate.toISOString())
          .lte('transaction_date', endDate.toISOString());

        if (walletId) {
          query = query.eq('wallet_id', walletId);
        }

        const { data, error } = await query;
        if (!error && data) {
          filteredTx = data;
        } else {
          throw error;
        }
      } catch (err) {
        console.warn('Supabase getReportData failed, falling back to local:', err);
      }
    }

    if (filteredTx.length === 0 && !isSupabaseConfigured) {
      // Lấy toàn bộ giao dịch không bị xóa mềm trong phạm vi quỹ được phép truy cập
      const accessibleIds = getAccessibleLocalWalletIds();
      const allTx = loadLocalTransactions().filter((t) => {
        if (t.is_deleted) return false;
        if (accessibleIds !== null && !accessibleIds.has(t.wallet_id)) return false;
        return true;
      });

      // Lọc theo ví và khoảng ngày
      filteredTx = allTx.filter((t) => {
        if (walletId && t.wallet_id !== walletId) return false;
        const d = new Date(t.transaction_date).getTime();
        return d >= startDate.getTime() && d <= endDate.getTime();
      });
    }

    let totalIncome = 0;
    let totalExpense = 0;
    let transfersCount = 0;
    let transfersTotalAmount = 0;

    const catExpenseMap = new Map<string, { amount: number; count: number }>();
    const reasonExpenseMap = new Map<string, { amount: number; count: number }>();
    const memberExpenseMap = new Map<string, { amount: number; name: string; email: string }>();
    const timeSeriesMap = new Map<string, { income: number; expense: number }>();

    for (const tx of filteredTx) {
      const cat = categoryMap.get(tx.category_id);
      const isTransfer = 
        cat?.name === 'Chuyển tiền' || 
        tx.description.startsWith('Chuyển đi:') || 
        tx.description.startsWith('Nhận từ:') ||
        tx.idempotency_key?.includes('transfer');

      // 1. Nếu là giao dịch chuyển tiền giữa các quỹ:
      // QUY TẮC BẮT BUỘC: KHÔNG TÍNH VÀO THU/CHI TỔNG HỢP CỦA BÁO CÁO!
      if (isTransfer) {
        if (tx.type === 'EXPENSE') {
          transfersCount += 1;
          transfersTotalAmount += tx.amount;
        }
        continue;
      }

      // 2. Thu nhập thực tế
      if (tx.type === 'INCOME') {
        totalIncome += tx.amount;

        const dateKey = new Date(tx.transaction_date).toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
        });
        const current = timeSeriesMap.get(dateKey) || { income: 0, expense: 0 };
        current.income += tx.amount;
        timeSeriesMap.set(dateKey, current);
      }

      // 3. Chi phí thực tế
      if (tx.type === 'EXPENSE') {
        totalExpense += tx.amount;

        // Thống kê danh mục chi tiêu
        const catId = tx.category_id;
        const currentCat = catExpenseMap.get(catId) || { amount: 0, count: 0 };
        currentCat.amount += tx.amount;
        currentCat.count += 1;
        catExpenseMap.set(catId, currentCat);

        // Thống kê lý do chi tiêu
        const desc = tx.description.trim();
        const currentReason = reasonExpenseMap.get(desc) || { amount: 0, count: 0 };
        currentReason.amount += tx.amount;
        currentReason.count += 1;
        reasonExpenseMap.set(desc, currentReason);

        // Thống kê theo người chi
        const creatorId = tx.created_by;
        const creatorName = tx.creator?.full_name || (creatorId === SECONDARY_TEST_USER.id ? SECONDARY_TEST_USER.full_name : CURRENT_TEST_USER.full_name);
        const creatorEmail = tx.creator?.email || (creatorId === SECONDARY_TEST_USER.id ? SECONDARY_TEST_USER.email : CURRENT_TEST_USER.email);
        const currentMember = memberExpenseMap.get(creatorId) || { amount: 0, name: creatorName, email: creatorEmail };
        currentMember.amount += tx.amount;
        memberExpenseMap.set(creatorId, currentMember);

        // Chuỗi thời gian
        const dateKey = new Date(tx.transaction_date).toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
        });
        const current = timeSeriesMap.get(dateKey) || { income: 0, expense: 0 };
        current.expense += tx.amount;
        timeSeriesMap.set(dateKey, current);
      }
    }

    // Top Categories
    const topCategories: CategorySpendItem[] = [];
    catExpenseMap.forEach((val, cId) => {
      const cat = categoryMap.get(cId);
      const percentage = totalExpense > 0 ? (val.amount / totalExpense) * 100 : 0;
      topCategories.push({
        id: cId,
        name: cat?.name || 'Khác',
        color: cat?.color || '#10B981',
        amount: val.amount,
        percentage: Math.round(percentage * 10) / 10,
        count: val.count,
      });
    });
    topCategories.sort((a, b) => b.amount - a.amount);

    // Top Reasons
    const topReasons: TopReasonItem[] = [];
    reasonExpenseMap.forEach((val, desc) => {
      topReasons.push({
        description: desc,
        amount: val.amount,
        count: val.count,
      });
    });
    topReasons.sort((a, b) => b.amount - a.amount);

    // Member Spending Breakdown
    const memberSpend: MemberSpendItem[] = [];
    memberExpenseMap.forEach((val, userId) => {
      const percentage = totalExpense > 0 ? (val.amount / totalExpense) * 100 : 0;
      memberSpend.push({
        user_id: userId,
        name: val.name,
        email: val.email,
        amount: val.amount,
        percentage: Math.round(percentage * 10) / 10,
      });
    });
    memberSpend.sort((a, b) => b.amount - a.amount);

    // Time Series
    const timeSeries: TimeSeriesItem[] = [];
    timeSeriesMap.forEach((val, dateLabel) => {
      timeSeries.push({
        dateLabel,
        income: val.income,
        expense: val.expense,
        net: val.income - val.expense,
      });
    });

    // Nếu dữ liệu chuỗi thời gian trống, tạo điểm mốc mặc định để biểu đồ render đẹp
    if (timeSeries.length === 0) {
      timeSeries.push({
        dateLabel: 'Hôm nay',
        income: totalIncome,
        expense: totalExpense,
        net: totalIncome - totalExpense,
      });
    }

    const netSavings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? Math.max(0, Math.round((netSavings / totalIncome) * 100)) : 0;

    return {
      timeframe,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      totalIncome,
      totalExpense,
      netSavings,
      savingsRate,
      transfersCount,
      transfersTotalAmount,
      timeSeries,
      topCategories,
      topReasons: topReasons.slice(0, 5),
      memberSpend,
    };
  },
};
