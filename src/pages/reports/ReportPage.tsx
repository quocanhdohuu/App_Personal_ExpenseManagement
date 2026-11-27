import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  PiggyBank, 
  Percent, 
  Users, 
  Tag, 
  FileText,
  BarChart3,
  PieChart as PieIcon,
  CheckCircle2
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { reportService } from '../../services/reportService';
import { walletService } from '../../services/walletService';
import { TimeframeType, ReportSummary } from '../../types/report.types';
import { WalletWithDetails } from '../../types/wallet.types';
import { formatCurrency } from '../../utils/formatters';

export const ReportPage: React.FC = () => {
  const [timeframe, setTimeframe] = useState<TimeframeType>('MONTH');
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [wallets, setWallets] = useState<WalletWithDetails[]>([]);
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadWallets = async () => {
      const wList = await walletService.getWallets();
      setWallets(wList);
    };
    loadWallets();
  }, []);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const data = await reportService.getReportData(
        timeframe,
        selectedWalletId || undefined,
        customStart || undefined,
        customEnd || undefined
      );
      setReport(data);
    } catch (err) {
      console.error('Error fetching report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [timeframe, selectedWalletId, customStart, customEnd]);

  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Báo Cáo & Thống Kê Tài Chính
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Phân tích dòng tiền, cơ cấu chi tiêu và xu hướng tích lũy theo tuần, tháng, năm
          </p>
        </div>

        {/* Wallet Filter Selector */}
        <div className="flex items-center gap-2">
          <select
            value={selectedWalletId}
            onChange={(e) => setSelectedWalletId(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-xs sm:text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">Tất cả các quỹ</option>
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.type === 'PERSONAL' ? 'Cá nhân' : 'Chung'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Timeframe Switcher Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2 bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setTimeframe('WEEK')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              timeframe === 'WEEK'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Tuần này
          </button>

          <button
            onClick={() => setTimeframe('MONTH')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              timeframe === 'MONTH'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Tháng này
          </button>

          <button
            onClick={() => setTimeframe('YEAR')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              timeframe === 'YEAR'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Năm nay
          </button>

          <button
            onClick={() => setTimeframe('CUSTOM')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              timeframe === 'CUSTOM'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Tùy chọn ngày
          </button>
        </div>

        {/* Custom Date Pickers */}
        {timeframe === 'CUSTOM' && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400">Từ:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs"
            />
            <span className="text-gray-400">Đến:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs"
            />
          </div>
        )}
      </div>

      {/* Mandatory Business Rule Transparency Notice */}
      <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-start gap-3 text-xs text-emerald-950">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold block mb-0.5">Quy tắc chuẩn hóa báo cáo tài chính:</span>
          Báo cáo tự động loại trừ các giao dịch chuyển tiền giữa các quỹ để không làm sai lệch thu nhập hoặc chi phí thực tế.
          {report && report.transfersCount > 0 && (
            <span className="font-medium text-emerald-800 ml-1">
              (Đã tự động loại trừ {report.transfersCount} giao dịch chuyển tiền nội bộ với tổng số tiền {formatCurrency(report.transfersTotalAmount)}).
            </span>
          )}
        </div>
      </div>

      {/* 4 Key Financial Metrics Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Income */}
        <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider block">
              Tổng Thu Thực Tế
            </span>
            <span className="text-2xl font-extrabold text-emerald-600 block mt-1 tracking-tight">
              +{formatCurrency(report?.totalIncome || 0)}
            </span>
            <span className="text-[10px] text-gray-400 block mt-0.5">Tiền vào ví thực nhận</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Total Expense */}
        <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider block">
              Tổng Chi Thực Tế
            </span>
            <span className="text-2xl font-extrabold text-red-600 block mt-1 tracking-tight">
              -{formatCurrency(report?.totalExpense || 0)}
            </span>
            <span className="text-[10px] text-gray-400 block mt-0.5">Chi tiêu không bao gồm chuyển quỹ</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        {/* Net Savings */}
        <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider block">
              Chênh Lệch / Tiết Kiệm
            </span>
            <span className={`text-2xl font-extrabold block mt-1 tracking-tight ${
              (report?.netSavings || 0) >= 0 ? 'text-emerald-700' : 'text-red-700'
            }`}>
              {(report?.netSavings || 0) >= 0 ? '+' : ''}{formatCurrency(report?.netSavings || 0)}
            </span>
            <span className="text-[10px] text-gray-400 block mt-0.5">Dòng tiền ròng tích lũy</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <PiggyBank className="w-6 h-6" />
          </div>
        </div>

        {/* Savings Rate */}
        <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider block">
              Tỷ Lệ Tiết Kiệm
            </span>
            <span className="text-2xl font-extrabold text-indigo-600 block mt-1 tracking-tight">
              {report?.savingsRate || 0}%
            </span>
            <div className="w-24 bg-gray-100 h-1.5 rounded-full overflow-hidden mt-1.5">
              <div 
                className="bg-indigo-600 h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, Math.max(0, report?.savingsRate || 0))}%` }}
              />
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Percent className="w-6 h-6" />
          </div>
        </div>
      </div>
      )}

      {/* Visual Recharts Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* TimeSeries Bar Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-gray-900 text-base">Diễn Biến Thu Nhập & Chi Tiêu</h3>
            </div>
            <span className="text-xs text-gray-400">Theo thời gian</span>
          </div>

          <div className="h-72 w-full pt-4">
            {report && report.timeSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.timeSeries} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip 
                    formatter={(val: number) => formatCurrency(val)}
                    labelStyle={{ fontWeight: 'bold' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                  <Bar dataKey="income" name="Thu nhập" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Chi tiêu" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-xs">
                Chưa có dữ liệu biểu đồ
              </div>
            )}
          </div>
        </div>

        {/* Categories Pie Chart */}
        <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-gray-900 text-base">Cơ Cấu Chi Tiêu</h3>
            </div>
            <span className="text-xs text-gray-400">Danh mục</span>
          </div>

          <div className="h-72 w-full flex items-center justify-center">
            {report && report.topCategories.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={report.topCategories}
                    dataKey="amount"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    innerRadius={45}
                    paddingAngle={3}
                  >
                    {report.topCategories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: number) => formatCurrency(val)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-gray-400 text-xs">Chưa có dữ liệu chi tiêu trong kỳ</div>
            )}
          </div>
        </div>
      </div>

      {/* Top Lists & Member Breakdown Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Top 5 Categories List */}
        <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-gray-900 text-sm">Top Danh Mục Chi Nhiều Nhất</h3>
            </div>
          </div>

          <div className="space-y-3">
            {report?.topCategories && report.topCategories.length > 0 ? (
              report.topCategories.slice(0, 5).map((cat, idx) => (
                <div key={cat.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                      {idx + 1}. {cat.name}
                    </span>
                    <span className="font-bold text-gray-900">{formatCurrency(cat.amount)}</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden flex">
                    <div 
                      className="h-full rounded-full transition-all"
                      style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>{cat.count} giao dịch</span>
                    <span>{cat.percentage}% tổng chi</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-400 text-center py-6">Chưa có chi tiêu danh mục</p>
            )}
          </div>
        </div>

        {/* Top 5 Reasons List */}
        <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-gray-900 text-sm">Top Lý Do Chi Tiêu Nhiều Nhất</h3>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {report?.topReasons && report.topReasons.length > 0 ? (
              report.topReasons.map((item, idx) => (
                <div key={item.description} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-gray-800 block line-clamp-1">
                      {idx + 1}. {item.description}
                    </span>
                    <span className="text-[10px] text-gray-400">Phát sinh {item.count} lần</span>
                  </div>
                  <span className="font-bold text-red-600 ml-2 whitespace-nowrap">
                    -{formatCurrency(item.amount)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-400 text-center py-6">Chưa có dữ liệu lý do chi</p>
            )}
          </div>
        </div>

        {/* Member Spending Breakdown */}
        <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-gray-900 text-sm">Tỷ Trọng Chi Tiêu Thành Viên</h3>
            </div>
          </div>

          <div className="space-y-4">
            {report?.memberSpend && report.memberSpend.length > 0 ? (
              report.memberSpend.map((member) => (
                <div key={member.user_id} className="p-3 rounded-xl bg-gray-50 border border-gray-100 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-900">{member.name}</span>
                    <span className="font-bold text-red-600">{formatCurrency(member.amount)}</span>
                  </div>
                  <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-600 h-full rounded-full transition-all"
                      style={{ width: `${member.percentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>{member.email}</span>
                    <span>Chiếm {member.percentage}% tổng chi</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-400 text-center py-6">Chưa có chi tiêu thành viên</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
