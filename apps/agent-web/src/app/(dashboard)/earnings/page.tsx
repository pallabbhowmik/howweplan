'use client';

import { useState, useEffect } from 'react';
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
  Loader2,
  AlertCircle,
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
  Skeleton,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import { listAgentBookings, type AgentBooking } from '@/lib/data/agent';

// ============================================================================
// TYPES
// ============================================================================

type EarningsSummary = {
  totalEarnings: number;
  thisMonth: number;
  lastMonth: number;
  pending: number;
  available: number;
};

type Transaction = {
  id: string;
  type: 'commission' | 'payout';
  description: string;
  amount: number;
  status: 'completed' | 'pending';
  date: string;
  bookingId?: string;
};

type MonthlyEarning = {
  month: string;
  amount: number;
};

type TopDestination = {
  destination: string;
  bookings: number;
  revenue: number;
};

// ============================================================================
// DATA TRANSFORMATION UTILITIES
// ============================================================================

function calculateEarningsFromBookings(bookings: AgentBooking[]): {
  summary: EarningsSummary;
  monthlyEarnings: MonthlyEarning[];
  transactions: Transaction[];
  topDestinations: TopDestination[];
} {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Calculate commission as 10% of total (adjust based on business logic)
  const bookingsWithCommission = bookings.map((b) => ({
    ...b,
    commission: Math.round(b.totalAmountCents * 0.1),
  }));

  // Summary calculations
  let totalEarnings = 0;
  let thisMonth = 0;
  let lastMonth = 0;
  let pending = 0;
  let available = 0;

  // Monthly aggregation
  const monthlyMap: Record<string, number> = {};
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  months.forEach((m) => { monthlyMap[m] = 0; });

  // Destination aggregation
  const destMap: Record<string, { bookings: number; revenue: number }> = {};

  // Transaction list
  const transactions: Transaction[] = [];

  for (const booking of bookingsWithCommission) {
    const bookingDate = new Date(booking.createdAt);
    const bookingMonth = bookingDate.getMonth();
    const bookingYear = bookingDate.getFullYear();
    const commission = booking.commission;

    // Total earnings (from completed bookings)
    if (booking.state === 'completed') {
      totalEarnings += commission;
      available += commission;
    } else if (booking.state !== 'cancelled') {
      pending += commission;
    }

    // This month
    if (bookingYear === currentYear && bookingMonth === currentMonth) {
      thisMonth += commission;
    }

    // Last month
    const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
    if (bookingYear === lastMonthDate.getFullYear() && bookingMonth === lastMonthDate.getMonth()) {
      lastMonth += commission;
    }

    // Monthly aggregation (current year only)
    if (bookingYear === currentYear) {
      const monthName = months[bookingMonth];
      monthlyMap[monthName] = (monthlyMap[monthName] || 0) + commission;
    }

    // Destination aggregation
    const dest = [booking.destinationCity, booking.destinationCountry]
      .filter(Boolean)
      .join(', ') || 'Other';
    if (!destMap[dest]) {
      destMap[dest] = { bookings: 0, revenue: 0 };
    }
    destMap[dest].bookings += 1;
    destMap[dest].revenue += commission;

    // Create transaction entry
    if (booking.state !== 'cancelled') {
      transactions.push({
        id: `TXN-${booking.id}`,
        type: 'commission',
        description: `Commission - ${dest}`,
        amount: commission,
        status: booking.state === 'completed' ? 'completed' : 'pending',
        date: booking.createdAt,
        bookingId: booking.id,
      });
    }
  }

  // Convert monthly map to array
  const monthlyEarnings = months.map((month) => ({
    month,
    amount: monthlyMap[month],
  }));

  // Convert destination map to sorted array
  const topDestinations = Object.entries(destMap)
    .map(([destination, data]) => ({
      destination,
      bookings: data.bookings,
      revenue: data.revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Sort transactions by date (newest first)
  transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    summary: {
      totalEarnings,
      thisMonth,
      lastMonth,
      pending,
      available,
    },
    monthlyEarnings,
    transactions: transactions.slice(0, 10), // Limit to 10 most recent
    topDestinations,
  };
}

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

function TransactionRow({ transaction }: { transaction: Transaction }) {
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

function EarningsChart({ data }: { data: MonthlyEarning[] }) {
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

function StatCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="bg-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24 bg-gray-300" />
            <Skeleton className="h-7 w-32 bg-gray-300" />
            <Skeleton className="h-3 w-20 bg-gray-300" />
          </div>
          <Skeleton className="h-12 w-12 rounded-full bg-gray-300" />
        </div>
      </div>
    </Card>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function EarningsPage() {
  const [timeRange, setTimeRange] = useState('this_year');
  const [transactionFilter, setTransactionFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<EarningsSummary>({
    totalEarnings: 0,
    thisMonth: 0,
    lastMonth: 0,
    pending: 0,
    available: 0,
  });
  const [monthlyEarnings, setMonthlyEarnings] = useState<MonthlyEarning[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [topDestinations, setTopDestinations] = useState<TopDestination[]>([]);
  const [payoutMessage, setPayoutMessage] = useState<string | null>(null);

  // Fetch bookings and calculate earnings
  useEffect(() => {
    async function loadEarnings() {
      try {
        setIsLoading(true);
        setError(null);

        const bookings = await listAgentBookings({ limit: 100 });
        const earningsData = calculateEarningsFromBookings(bookings);

        setSummary(earningsData.summary);
        setMonthlyEarnings(earningsData.monthlyEarnings);
        setTransactions(earningsData.transactions);
        setTopDestinations(earningsData.topDestinations);
      } catch (err) {
        console.error('Failed to load earnings:', err);
        setError('Failed to load earnings data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }

    loadEarnings();
  }, []);

  const monthlyGrowth = summary.lastMonth > 0
    ? Math.round(((summary.thisMonth - summary.lastMonth) / summary.lastMonth) * 100)
    : 0;

  const filteredTransactions = transactions.filter((t) => {
    if (transactionFilter === 'all') return true;
    return t.type === transactionFilter;
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Earnings</h1>
            <p className="mt-1 text-gray-500">Track your commission and payouts</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Monthly Earnings</CardTitle>
              <CardDescription>Your commission earnings over the past 12 months</CardDescription>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-48 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Top Destinations</CardTitle>
              <CardDescription>Your best-selling trip types</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-2 w-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Earnings</h1>
          <p className="mt-1 text-gray-500">Track your commission and payouts</p>
        </div>
        <Card>
          <CardContent className="py-16 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Error loading earnings</h3>
            <p className="text-gray-500 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          <Button variant="outline" onClick={() => {
            const headers = ['Date', 'Type', 'Description', 'Amount (₹)', 'Status'];
            const rows = transactions.map(t => [
              new Date(t.date).toLocaleDateString('en-IN'),
              t.type,
              t.description,
              (t.amount / 100).toFixed(2),
              t.status,
            ]);
            const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `earnings-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }}>
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
              {topDestinations.length > 0 ? (
                topDestinations.map((trip, index) => (
                  <div key={trip.destination}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{trip.destination}</span>
                      <span className="text-sm text-gray-500">{trip.bookings} booking{trip.bookings !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress
                        value={topDestinations[0]?.revenue ? (trip.revenue / topDestinations[0].revenue) * 100 : 0}
                        color={index === 0 ? 'purple' : 'blue'}
                        className="flex-1"
                      />
                      <span className="text-sm font-semibold text-gray-900 w-20 text-right">
                        {formatCurrency(trip.revenue)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No booking data yet</p>
              )}
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
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => {
                setPayoutMessage('Payout request submitted! You will receive your funds within 3-5 business days.');
                setTimeout(() => setPayoutMessage(null), 5000);
              }}>
                <CreditCard className="mr-2 h-4 w-4" />
                Request Payout
              </Button>
              {payoutMessage && (
                <p className="text-sm text-emerald-700 mt-2 bg-emerald-100 rounded px-3 py-2">{payoutMessage}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-emerald-700">Bank Account</p>
              <p className="font-mono text-emerald-900">****4523</p>
              <Button variant="link" className="text-emerald-600 p-0 h-auto text-sm" onClick={() => {
                window.location.href = '/settings#payment';
              }}>
                Change
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
