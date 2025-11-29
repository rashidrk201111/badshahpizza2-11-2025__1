import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { TrendingUp, Package, Users, IndianRupee, ShoppingCart, Calendar, DollarSign, BarChart3 } from 'lucide-react';
import { formatINR } from '../../lib/currency';

interface SalesData {
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  totalTax: number;
  totalDiscount: number;
}

interface OrderTypeData {
  order_type: string;
  count: number;
  total: number;
}

interface PaymentMethodData {
  payment_method: string;
  count: number;
  total: number;
}

interface DailySalesData {
  date: string;
  total: number;
  orders: number;
}

interface TopItemData {
  name: string;
  quantity: number;
  revenue: number;
}

export function Reports() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });

  const [salesData, setSalesData] = useState<SalesData>({
    totalSales: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    totalTax: 0,
    totalDiscount: 0,
  });

  const [orderTypeData, setOrderTypeData] = useState<OrderTypeData[]>([]);
  const [paymentMethodData, setPaymentMethodData] = useState<PaymentMethodData[]>([]);
  const [dailySalesData, setDailySalesData] = useState<DailySalesData[]>([]);
  const [topItemsData, setTopItemsData] = useState<TopItemData[]>([]);
  const [paymentStatusData, setPaymentStatusData] = useState<any[]>([]);

  useEffect(() => {
    loadReportsData();
  }, [dateRange]);

  const loadReportsData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadSalesData(),
        loadOrderTypeData(),
        loadPaymentMethodData(),
        loadDailySalesData(),
        loadTopItemsData(),
        loadPaymentStatusData(),
      ]);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSalesData = async () => {
    const { data, error } = await supabase
      .from('invoices')
      .select('total, tax, discount, created_at')
      .gte('created_at', `${dateRange.from}T00:00:00`)
      .lte('created_at', `${dateRange.to}T23:59:59`);

    if (error) throw error;

    const totalSales = data?.reduce((sum, inv) => sum + Number(inv.total || 0), 0) || 0;
    const totalTax = data?.reduce((sum, inv) => sum + Number(inv.tax || 0), 0) || 0;
    const totalDiscount = data?.reduce((sum, inv) => sum + Number(inv.discount || 0), 0) || 0;
    const totalOrders = data?.length || 0;

    setSalesData({
      totalSales,
      totalOrders,
      averageOrderValue: totalOrders > 0 ? totalSales / totalOrders : 0,
      totalTax,
      totalDiscount,
    });
  };

  const loadOrderTypeData = async () => {
    const { data, error } = await supabase
      .from('invoices')
      .select('order_type, total')
      .gte('created_at', `${dateRange.from}T00:00:00`)
      .lte('created_at', `${dateRange.to}T23:59:59`)
      .not('order_type', 'is', null);

    if (error) throw error;

    const grouped = data?.reduce((acc: any, inv) => {
      const type = inv.order_type || 'other';
      if (!acc[type]) {
        acc[type] = { order_type: type, count: 0, total: 0 };
      }
      acc[type].count++;
      acc[type].total += Number(inv.total || 0);
      return acc;
    }, {});

    setOrderTypeData(Object.values(grouped || {}));
  };

  const loadPaymentMethodData = async () => {
    const { data: kotsData, error } = await supabase
      .from('kots')
      .select('payment_method, cash_amount, upi_amount, card_amount, total_amount')
      .gte('created_at', `${dateRange.from}T00:00:00`)
      .lte('created_at', `${dateRange.to}T23:59:59`);

    if (error) throw error;

    const methodCounts: any = {
      cash: { payment_method: 'Cash', count: 0, total: 0 },
      upi: { payment_method: 'UPI', count: 0, total: 0 },
      card: { payment_method: 'Card', count: 0, total: 0 },
      split: { payment_method: 'Split', count: 0, total: 0 },
    };

    kotsData?.forEach((kot) => {
      const method = kot.payment_method || 'cash';

      if (method === 'split') {
        methodCounts.split.count++;
        methodCounts.split.total += Number(kot.total_amount || 0);

        if (Number(kot.cash_amount || 0) > 0) {
          methodCounts.cash.total += Number(kot.cash_amount || 0);
        }
        if (Number(kot.upi_amount || 0) > 0) {
          methodCounts.upi.total += Number(kot.upi_amount || 0);
        }
        if (Number(kot.card_amount || 0) > 0) {
          methodCounts.card.total += Number(kot.card_amount || 0);
        }
      } else {
        methodCounts[method].count++;
        methodCounts[method].total += Number(kot.total_amount || 0);
      }
    });

    setPaymentMethodData(Object.values(methodCounts).filter((m: any) => m.count > 0 || m.total > 0));
  };

  const loadDailySalesData = async () => {
    const { data, error } = await supabase
      .from('invoices')
      .select('created_at, total')
      .gte('created_at', `${dateRange.from}T00:00:00`)
      .lte('created_at', `${dateRange.to}T23:59:59`)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const dailyData = data?.reduce((acc: any, inv) => {
      const date = new Date(inv.created_at).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { date, total: 0, orders: 0 };
      }
      acc[date].total += Number(inv.total || 0);
      acc[date].orders++;
      return acc;
    }, {});

    setDailySalesData(Object.values(dailyData || {}).slice(-14)); // Last 14 days
  };

  const loadTopItemsData = async () => {
    const { data, error } = await supabase
      .from('invoice_items')
      .select(`
        menu_item_name,
        quantity,
        unit_price,
        invoice:invoices!inner(created_at)
      `)
      .gte('invoice.created_at', `${dateRange.from}T00:00:00`)
      .lte('invoice.created_at', `${dateRange.to}T23:59:59`);

    if (error) throw error;

    const itemsMap = data?.reduce((acc: any, item) => {
      const name = item.menu_item_name || 'Unknown Item';
      if (!acc[name]) {
        acc[name] = { name, quantity: 0, revenue: 0 };
      }
      acc[name].quantity += Number(item.quantity || 0);
      acc[name].revenue += Number(item.quantity || 0) * Number(item.unit_price || 0);
      return acc;
    }, {});

    const topItems = Object.values(itemsMap || {})
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, 10);

    setTopItemsData(topItems as TopItemData[]);
  };

  const loadPaymentStatusData = async () => {
    const { data, error } = await supabase
      .from('invoices')
      .select('payment_status, total')
      .gte('created_at', `${dateRange.from}T00:00:00`)
      .lte('created_at', `${dateRange.to}T23:59:59`);

    if (error) throw error;

    const statusMap = data?.reduce((acc: any, inv) => {
      const status = inv.payment_status || 'unpaid';
      if (!acc[status]) {
        acc[status] = { status, count: 0, total: 0 };
      }
      acc[status].count++;
      acc[status].total += Number(inv.total || 0);
      return acc;
    }, {});

    setPaymentStatusData(Object.values(statusMap || {}));
  };

  const getOrderTypeLabel = (type: string) => {
    const labels: any = {
      'dine_in': 'Dine In',
      'takeaway': 'Takeaway',
      'delivery': 'Delivery',
    };
    return labels[type] || type;
  };

  const getOrderTypeColor = (type: string) => {
    const colors: any = {
      'dine_in': 'bg-blue-500',
      'takeaway': 'bg-green-500',
      'delivery': 'bg-orange-500',
    };
    return colors[type] || 'bg-gray-500';
  };

  const getPaymentStatusColor = (status: string) => {
    const colors: any = {
      'paid': 'bg-green-500',
      'partial': 'bg-yellow-500',
      'unpaid': 'bg-red-500',
      'overdue': 'bg-red-700',
    };
    return colors[status] || 'bg-gray-500';
  };

  if (loading) {
    return <div className="text-center py-8">Loading reports...</div>;
  }

  const maxOrderTypeTotal = Math.max(...orderTypeData.map(d => d.total), 1);
  const maxPaymentTotal = Math.max(...paymentMethodData.map(d => d.total), 1);
  const maxDailySales = Math.max(...dailySalesData.map(d => d.total), 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Sales Reports & Analytics</h1>
          <p className="text-slate-600 mt-1">Comprehensive insights into your business performance</p>
        </div>
        <div className="flex gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">From</label>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">To</label>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <IndianRupee className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-blue-100 text-sm font-medium mb-1">Total Sales</h3>
          <p className="text-3xl font-bold">{formatINR(salesData.totalSales)}</p>
          <p className="text-xs mt-2 opacity-90">{salesData.totalOrders} orders</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <ShoppingCart className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-green-100 text-sm font-medium mb-1">Average Order Value</h3>
          <p className="text-3xl font-bold">{formatINR(salesData.averageOrderValue)}</p>
          <p className="text-xs mt-2 opacity-90">Per transaction</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-orange-100 text-sm font-medium mb-1">Total Tax Collected</h3>
          <p className="text-3xl font-bold">{formatINR(salesData.totalTax)}</p>
          <p className="text-xs mt-2 opacity-90">GST/Tax amount</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-purple-100 text-sm font-medium mb-1">Total Discounts</h3>
          <p className="text-3xl font-bold">{formatINR(salesData.totalDiscount)}</p>
          <p className="text-xs mt-2 opacity-90">Given to customers</p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales by Order Type */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Sales by Order Type
          </h3>
          <div className="space-y-4">
            {orderTypeData.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No data available</p>
            ) : (
              orderTypeData.map((item) => (
                <div key={item.order_type}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">
                      {getOrderTypeLabel(item.order_type)}
                    </span>
                    <span className="text-sm font-semibold text-slate-900">
                      {formatINR(item.total)} ({item.count})
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3">
                    <div
                      className={`${getOrderTypeColor(item.order_type)} h-3 rounded-full transition-all`}
                      style={{ width: `${(item.total / maxOrderTypeTotal) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Payment Methods Distribution
          </h3>
          <div className="space-y-4">
            {paymentMethodData.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No data available</p>
            ) : (
              paymentMethodData.map((item) => (
                <div key={item.payment_method}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">{item.payment_method}</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {formatINR(item.total)} ({item.count})
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3">
                    <div
                      className="bg-green-500 h-3 rounded-full transition-all"
                      style={{ width: `${(item.total / maxPaymentTotal) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Daily Sales Trend */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          Daily Sales Trend (Last 14 Days)
        </h3>
        <div className="overflow-x-auto">
          {dailySalesData.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No data available</p>
          ) : (
            <div className="flex items-end justify-between gap-2 min-w-max h-64">
              {dailySalesData.map((day) => (
                <div key={day.date} className="flex flex-col items-center flex-1 min-w-[60px]">
                  <div className="text-xs font-semibold text-slate-900 mb-1">
                    {formatINR(day.total)}
                  </div>
                  <div className="w-full flex flex-col justify-end" style={{ height: '200px' }}>
                    <div
                      className="bg-blue-500 rounded-t-lg transition-all hover:bg-blue-600 relative group"
                      style={{ height: `${(day.total / maxDailySales) * 100}%` }}
                    >
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {day.orders} orders
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 mt-2 text-center">
                    {new Date(day.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Items */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-orange-600" />
            Top Selling Items
          </h3>
          <div className="space-y-3">
            {topItemsData.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No data available</p>
            ) : (
              topItemsData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition">
                  <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-orange-600">#{index + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">{item.name}</div>
                    <div className="text-xs text-slate-500">{item.quantity} units sold</div>
                  </div>
                  <div className="text-sm font-semibold text-slate-900">
                    {formatINR(item.revenue)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Payment Status Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            Payment Status Distribution
          </h3>
          <div className="space-y-4">
            {paymentStatusData.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No data available</p>
            ) : (
              paymentStatusData.map((item: any) => (
                <div key={item.status}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700 capitalize">{item.status}</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {formatINR(item.total)} ({item.count})
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3">
                    <div
                      className={`${getPaymentStatusColor(item.status)} h-3 rounded-full transition-all`}
                      style={{ width: `${(item.count / salesData.totalOrders) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
