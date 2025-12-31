'use client';

import { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Clock,
  CheckCircle,
  Filter,
} from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Progress,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui';
import { cn } from '@/lib/utils';

// ============================================================================
// MOCK DATA
// ============================================================================

const mockEarningsData = {
  summary: {
    totalEarnings: 1847500, // in cents
    thisMonth: 284500,
    lastMonth: 241000,
    pending: 128000,
    available: 156500,
  },
  monthlyEarnings: [
    { month: 'Jan', amount: 145000 },
    { month: 'Feb', amount: 178000 },
    { month: 'Mar', amount: 156000 },
    { month: 'Apr', amount: 198000 },
    { month: 'May', amount: 167000 },
    { month: 'Jun', amount: 189000 },
    { month: 'Jul', amount: 223000 },
    { month: 'Aug', amount: 195000 },
    { month: 'Sep', amount: 241000 },
    { month: 'Oct', amount: 284500 },
    { month: 'Nov', amount: 0 },
    { month: 'Dec', amount: 0 },
  ],
  recentTransactions: [
    {
      id: 'TXN-001',
      type: 'commission',
      description: 'Commission - Goa Trip (Arjun K.)',
      amount: 45000,
      status: 'completed',
      date: '2024-10-28',
      bookingId: 'BK-2024-089',
    },
    {
      id: 'TXN-002',
      type: 'commission',
      description: 'Commission - Rajasthan Trip (Priya S.)',
      amount: 38500,
      status: 'pending',
      date: '2024-10-25',
      bookingId: 'BK-2024-087',
    },
    {
      id: 'TXN-003',
      type: 'payout',
      description: 'Payout to Bank Account ****4523',
      amount: -125000,
      status: 'completed',
      date: '2024-10-20',
    },
    {
      id: 'TXN-004',
      type: 'commission',
      description: 'Commission - Kerala Trip (Sneha G.)',
      amount: 52000,
      status: 'completed',
      date: '2024-10-15',
      bookingId: 'BK-2024-082',
    },
    {
      id: 'TXN-005',
      type: 'commission',
      description: 'Commission - Ranthambore Safari (Vikram R.)',
      amount: 62000,
      status: 'pending',
      date: '2024-10-10',
      bookingId: 'BK-2024-085',
    },
    {
      id: 'TXN-006',
      type: 'commission',
      description: 'Commission - Andaman Islands (Amit P.)',
      amount: 41000,
      status: 'completed',
      date: '2024-10-05',
      bookingId: 'BK-2024-079',
    },
    {
      id: 'TXN-007',
      type: 'payout',
      description: 'Payout to Bank Account ****4523',
      amount: -95000,
      status: 'completed',
      date: '2024-09-28',
    },
  ],
  topPerformingTrips: [
    { destination: 'Rajasthan', bookings: 8, revenue: 425000 },
    { destination: 'Kerala', bookings: 12, revenue: 380000 },
    { destination: 'Ladakh', bookings: 6, revenue: 312000 },
    { destination: 'Goa', bookings: 5, revenue: 285000 },
    { destination: 'Andaman Islands', bookings: 9, revenue: 245000 },
  ],
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatCurrency(cents: number, showSign = false): string {
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(Math.abs(cents) / 100);
  
  if (showSign && cents < 0) return `-${formatted}`;
  if (showSign && cents > 0) return `+${formatted}`;
  return formatted;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ============================================================================
// COMPONENTS
// ============================================================================

function StatCard({
  title,
  value,
  subtext,
  icon,
  trend,
  color,
}: {
  title: string;
  value: string;
  subtext?: string;
  icon: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
  color: 'blue' | 'green' | 'purple' | 'amber';
}) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-emerald-500 to-emerald-600',
    purple: 'from-purple-500 to-purple-600',
    amber: 'from-amber-500 to-amber-600',
  };

  return (
    <Card className="overflow-hidden">
      <div className={cn('bg-gradient-to-br p-4 text-white', colorClasses[color])}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white/80">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtext && <p className="text-xs text-white/70 mt-1">{subtext}</p>}
          </div>
          <div className="rounded-full bg-white/20 p-3">{icon}</div>
        </div>
        {trend && (
          <div className="mt-3 flex items-center gap-1 text-sm">
            {trend.isPositive ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            <span>{trend.isPositive ? '+' : ''}{trend.value}% vs last month</span>
          </div>
        )}
      </div>
    </Card>
  );
}

function TransactionRow({ transaction }: { transaction: typeof mockEarningsData.recentTransactions[0] }) {
  const isPositive = transaction.amount > 0;

  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-4">
        <div className={cn(
          'h-10 w-10 rounded-full flex items-center justify-center',
          isPositive ? 'bg-green-100' : 'bg-gray-100'
        )}>
          {isPositive ? (
            <ArrowDownRight className="h-5 w-5 text-green-600" />
          ) : (
            <ArrowUpRight className="h-5 w-5 text-gray-600" />
          )}
        </div>
        <div>
          <p className="font-medium text-gray-900">{transaction.description}</p>
          <p className="text-sm text-gray-500">{formatDate(transaction.date)}</p>
        </div>
      </div>
      <div className="text-right">
        <p className={cn(
          'font-semibold',
          isPositive ? 'text-green-600' : 'text-gray-900'
        )}>
          {formatCurrency(transaction.amount, true)}
        </p>
        <Badge
          variant={transaction.status === 'completed' ? 'success' : 'warning'}
          className="mt-1"
        >
          {transaction.status === 'completed' ? (
            <>
              <CheckCircle className="h-3 w-3 mr-1" />
              Completed
            </>
          ) : (
            <>
              <Clock className="h-3 w-3 mr-1" />
              Pending
            </>
          )}
        </Badge>
      </div>
    </div>
  );
}

function EarningsChart({ data }: { data: typeof mockEarningsData.monthlyEarnings }) {
  const maxAmount = Math.max(...data.map((d) => d.amount));
  const currentMonth = new Date().getMonth();

  return (
    <div className="flex items-end justify-between gap-2 h-48 pt-8">
      {data.map((item, index) => {
        const height = maxAmount > 0 ? (item.amount / maxAmount) * 100 : 0;
        const isCurrentMonth = index === currentMonth;
        const isPastMonth = index < currentMonth;

        return (
          <div key={item.month} className="flex-1 flex flex-col items-center gap-2">
            <div className="relative w-full flex justify-center">
              {item.amount > 0 && (
                <span className="absolute -top-6 text-xs text-gray-500">
                  {formatCurrency(item.amount)}
                </span>
              )}
              <div
                className={cn(
                  'w-full max-w-8 rounded-t-md transition-all',
                  isCurrentMonth
                    ? 'bg-gradient-to-t from-blue-500 to-indigo-500'
                    : isPastMonth
                    ? 'bg-blue-200'
                    : 'bg-gray-100'
                )}
                style={{ height: `${Math.max(height, 4)}%` }}
              />
            </div>
            <span className={cn(
              'text-xs',
              isCurrentMonth ? 'font-semibold text-blue-600' : 'text-gray-500'
            )}>
              {item.month}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function EarningsPage() {
  const [timeRange, setTimeRange] = useState('this_year');
  const [transactionFilter, setTransactionFilter] = useState('all');

  const { summary, monthlyEarnings, recentTransactions, topPerformingTrips } = mockEarningsData;

  const monthlyGrowth = Math.round(
    ((summary.thisMonth - summary.lastMonth) / summary.lastMonth) * 100
  );

  const filteredTransactions = recentTransactions.filter((t) => {
    if (transactionFilter === 'all') return true;
    return t.type === transactionFilter;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Earnings</h1>
          <p className="mt-1 text-gray-500">Track your commission and payouts</p>
        </div>
        <div className="flex gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="this_year">This Year</SelectItem>
              <SelectItem value="all_time">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Earnings"
          value={formatCurrency(summary.totalEarnings)}
          subtext="All time"
          icon={<DollarSign className="h-6 w-6" />}
          color="purple"
        />
        <StatCard
          title="This Month"
          value={formatCurrency(summary.thisMonth)}
          icon={<TrendingUp className="h-6 w-6" />}
          trend={{ value: monthlyGrowth, isPositive: monthlyGrowth > 0 }}
          color="blue"
        />
        <StatCard
          title="Pending"
          value={formatCurrency(summary.pending)}
          subtext="Awaiting trip completion"
          icon={<Clock className="h-6 w-6" />}
          color="amber"
        />
        <StatCard
          title="Available"
          value={formatCurrency(summary.available)}
          subtext="Ready for payout"
          icon={<CreditCard className="h-6 w-6" />}
          color="green"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Earnings Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Monthly Earnings</CardTitle>
            <CardDescription>Your commission earnings over the past 12 months</CardDescription>
          </CardHeader>
          <CardContent>
            <EarningsChart data={monthlyEarnings} />
          </CardContent>
        </Card>

        {/* Top Performing */}
        <Card>
          <CardHeader>
            <CardTitle>Top Destinations</CardTitle>
            <CardDescription>Your best-selling trip types</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topPerformingTrips.map((trip, index) => (
                <div key={trip.destination}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{trip.destination}</span>
                    <span className="text-sm text-gray-500">{trip.bookings} bookings</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress
                      value={(trip.revenue / topPerformingTrips[0].revenue) * 100}
                      color={index === 0 ? 'purple' : 'blue'}
                      className="flex-1"
                    />
                    <span className="text-sm font-semibold text-gray-900 w-20 text-right">
                      {formatCurrency(trip.revenue)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Your recent commissions and payouts</CardDescription>
            </div>
            <Tabs value={transactionFilter} onValueChange={setTransactionFilter}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="commission">Commissions</TabsTrigger>
                <TabsTrigger value="payout">Payouts</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-gray-100">
            {filteredTransactions.map((transaction) => (
              <TransactionRow key={transaction.id} transaction={transaction} />
            ))}
          </div>
          {filteredTransactions.length === 0 && (
            <div className="py-8 text-center text-gray-500">
              No transactions found
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payout Info Card */}
      <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-emerald-900 mb-1">Ready for Payout</h3>
              <p className="text-sm text-emerald-700 mb-4">
                You have {formatCurrency(summary.available)} available for withdrawal
              </p>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <CreditCard className="mr-2 h-4 w-4" />
                Request Payout
              </Button>
            </div>
            <div className="text-right">
              <p className="text-sm text-emerald-700">Bank Account</p>
              <p className="font-mono text-emerald-900">****4523</p>
              <Button variant="link" className="text-emerald-600 p-0 h-auto text-sm">
                Change
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
