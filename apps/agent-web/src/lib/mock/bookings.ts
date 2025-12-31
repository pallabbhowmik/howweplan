export type MockBooking = {
  id: string;
  destination: string;
  client: { firstName: string; lastName: string; email: string };
  dates: { start: string; end: string };
  travelers: { adults: number; children: number };
  status: string;
  totalValue: number;
  commission: number;
  paymentStatus: string;
  daysUntilTrip: number;
  hasUnreadMessages: number;
  createdAt: string;
};

export const mockBookings: MockBooking[] = [
  {
    id: 'BK-2024-089',
    destination: 'Bali, Indonesia',
    client: { firstName: 'Emma', lastName: 'Wilson', email: 'emma.wilson@email.com' },
    dates: { start: '2025-01-15', end: '2025-01-25' },
    travelers: { adults: 2, children: 0 },
    status: 'confirmed',
    totalValue: 875000,
    commission: 87500,
    paymentStatus: 'paid',
    daysUntilTrip: 16,
    hasUnreadMessages: 2,
    createdAt: '2024-10-15',
  },
  {
    id: 'BK-2024-087',
    destination: 'Paris, France',
    client: { firstName: 'Michael', lastName: 'Chen', email: 'michael.chen@email.com' },
    dates: { start: '2025-02-10', end: '2025-02-17' },
    travelers: { adults: 2, children: 0 },
    status: 'itinerary_approved',
    totalValue: 625000,
    commission: 62500,
    paymentStatus: 'pending',
    daysUntilTrip: 42,
    hasUnreadMessages: 0,
    createdAt: '2024-10-10',
  },
  {
    id: 'BK-2024-085',
    destination: 'Safari, Kenya',
    client: { firstName: 'Sarah', lastName: 'Johnson', email: 'sarah.j@email.com' },
    dates: { start: '2025-03-01', end: '2025-03-10' },
    travelers: { adults: 2, children: 2 },
    status: 'pending_payment',
    totalValue: 1250000,
    commission: 125000,
    paymentStatus: 'awaiting',
    daysUntilTrip: 61,
    hasUnreadMessages: 1,
    createdAt: '2024-10-05',
  },
  {
    id: 'BK-2024-082',
    destination: 'Tokyo, Japan',
    client: { firstName: 'David', lastName: 'Lee', email: 'david.lee@email.com' },
    dates: { start: '2024-11-20', end: '2024-12-01' },
    travelers: { adults: 2, children: 1 },
    status: 'in_progress',
    totalValue: 920000,
    commission: 92000,
    paymentStatus: 'paid',
    daysUntilTrip: -10,
    hasUnreadMessages: 0,
    createdAt: '2024-09-20',
  },
  {
    id: 'BK-2024-079',
    destination: 'Greek Islands',
    client: { firstName: 'Lisa', lastName: 'Martinez', email: 'lisa.m@email.com' },
    dates: { start: '2024-10-01', end: '2024-10-12' },
    travelers: { adults: 4, children: 0 },
    status: 'completed',
    totalValue: 845000,
    commission: 84500,
    paymentStatus: 'paid',
    daysUntilTrip: -58,
    hasUnreadMessages: 0,
    createdAt: '2024-08-15',
  },
];

export function getMockBookingById(bookingId: string): MockBooking | null {
  return mockBookings.find((b) => b.id === bookingId) ?? null;
}
