/**
 * Group Trip Data Store
 * 
 * localStorage-based data persistence for group trips.
 * Designed to be easily replaced with API calls when backend is ready.
 * 
 * All functions are async to match future API signature.
 */

import {
  GroupTrip,
  GroupTripMember,
  GroupExpense,
  DestinationOption,
  Settlement,
  PlannedActivity,
  MemberBalance,
  SettlementSuggestion,
  CreateGroupTripInput,
  AddExpenseInput,
  ProposeDestinationInput,
  InviteMemberInput,
  MemberRole,
  TripStatus,
} from './types';

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEYS = {
  TRIPS: 'tc_group_trips',
  CURRENT_USER: 'tc_group_trip_user',
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function getStoredTrips(): GroupTrip[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEYS.TRIPS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveTrips(trips: GroupTrip[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(trips));
  } catch {
    console.error('Failed to save group trips');
  }
}

// ============================================================================
// Current User (simulated for demo)
// ============================================================================

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

export function getCurrentUser(): CurrentUser {
  if (typeof window === 'undefined') {
    return { id: 'user-1', name: 'You', email: 'demo@example.com', avatar: null };
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // ignore
  }
  // Default demo user
  const defaultUser: CurrentUser = {
    id: 'user-1',
    name: 'You',
    email: 'demo@example.com',
    avatar: null,
  };
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(defaultUser));
  return defaultUser;
}

export function setCurrentUser(user: CurrentUser): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
}

// ============================================================================
// Trip CRUD Operations
// ============================================================================

export async function createGroupTrip(input: CreateGroupTripInput): Promise<GroupTrip> {
  const user = getCurrentUser();
  const now = new Date().toISOString();
  
  const organizer: GroupTripMember = {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    role: 'organizer',
    status: 'confirmed',
    joinedAt: now,
    contribution: 0,
    userId: user.id,
  };

  const trip: GroupTrip = {
    id: generateId(),
    name: input.name,
    description: input.description,
    coverImage: input.coverImage || getRandomCoverImage(),
    status: 'planning',
    destination: input.destination || null,
    destinations: input.destination ? [input.destination] : [],
    dates: {
      startDate: input.startDate || null,
      endDate: input.endDate || null,
      isFlexible: input.isFlexible ?? true,
    },
    organizerId: user.id,
    members: [organizer],
    inviteCode: generateInviteCode(),
    maxMembers: input.maxMembers || 20,
    budget: {
      total: input.budgetTotal || 0,
      perPerson: input.budgetTotal ? input.budgetTotal : 0,
      collected: 0,
      currency: input.budgetCurrency || 'USD',
    },
    destinationOptions: [],
    votingSettings: {
      isOpen: true,
      deadline: null,
      maxVotesPerMember: 3,
      allowMultipleVotes: true,
    },
    expenses: [],
    settlements: [],
    activities: [],
    createdAt: now,
    updatedAt: now,
  };

  const trips = getStoredTrips();
  trips.push(trip);
  saveTrips(trips);

  return trip;
}

export async function getGroupTrip(tripId: string): Promise<GroupTrip | null> {
  const trips = getStoredTrips();
  return trips.find(t => t.id === tripId) || null;
}

export async function getGroupTripByInviteCode(code: string): Promise<GroupTrip | null> {
  const trips = getStoredTrips();
  return trips.find(t => t.inviteCode.toUpperCase() === code.toUpperCase()) || null;
}

export async function getUserTrips(): Promise<GroupTrip[]> {
  const user = getCurrentUser();
  const trips = getStoredTrips();
  return trips.filter(trip => 
    trip.members.some(m => m.id === user.id || m.email === user.email)
  );
}

export async function updateGroupTrip(tripId: string, updates: Partial<GroupTrip>): Promise<GroupTrip | null> {
  const trips = getStoredTrips();
  const index = trips.findIndex(t => t.id === tripId);
  if (index === -1) return null;

  const existingTrip = trips[index];
  if (!existingTrip) return null;
  
  const updatedTrip: GroupTrip = {
    id: existingTrip.id,
    name: updates.name ?? existingTrip.name,
    description: updates.description !== undefined ? updates.description : existingTrip.description,
    coverImage: updates.coverImage ?? existingTrip.coverImage,
    status: updates.status ?? existingTrip.status,
    destination: updates.destination !== undefined ? updates.destination : existingTrip.destination,
    organizerId: updates.organizerId ?? existingTrip.organizerId,
    inviteCode: updates.inviteCode ?? existingTrip.inviteCode,
    members: updates.members ?? existingTrip.members,
    destinations: updates.destinations ?? existingTrip.destinations,
    destinationOptions: updates.destinationOptions ?? existingTrip.destinationOptions,
    votingSettings: updates.votingSettings ?? existingTrip.votingSettings,
    budget: updates.budget ?? existingTrip.budget,
    dates: updates.dates ?? existingTrip.dates,
    maxMembers: updates.maxMembers ?? existingTrip.maxMembers,
    expenses: updates.expenses ?? existingTrip.expenses,
    settlements: updates.settlements ?? existingTrip.settlements,
    activities: updates.activities ?? existingTrip.activities,
    createdAt: existingTrip.createdAt,
    updatedAt: new Date().toISOString(),
  };
  trips[index] = updatedTrip;
  saveTrips(trips);
  return updatedTrip;
}

export async function deleteGroupTrip(tripId: string): Promise<boolean> {
  const trips = getStoredTrips();
  const filtered = trips.filter(t => t.id !== tripId);
  if (filtered.length === trips.length) return false;
  saveTrips(filtered);
  return true;
}

// ============================================================================
// Member Operations
// ============================================================================

export async function joinTrip(inviteCode: string): Promise<{ trip: GroupTrip; member: GroupTripMember } | null> {
  const trip = await getGroupTripByInviteCode(inviteCode);
  if (!trip) return null;

  const user = getCurrentUser();
  
  // Check if already a member
  if (trip.members.some(m => m.id === user.id || m.email === user.email)) {
    return { trip, member: trip.members.find(m => m.id === user.id || m.email === user.email)! };
  }

  // Check max members
  if (trip.members.length >= trip.maxMembers) {
    throw new Error('This trip has reached maximum capacity');
  }

  const newMember: GroupTripMember = {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    role: 'member',
    status: 'confirmed',
    joinedAt: new Date().toISOString(),
    contribution: 0,
    userId: user.id,
  };

  trip.members.push(newMember);
  trip.budget.perPerson = trip.budget.total / trip.members.length;
  await updateGroupTrip(trip.id, { members: trip.members, budget: trip.budget });

  return { trip, member: newMember };
}

export async function inviteMember(tripId: string, input: InviteMemberInput): Promise<GroupTripMember | null> {
  const trip = await getGroupTrip(tripId);
  if (!trip) return null;

  // Check if already invited
  if (trip.members.some(m => m.email === input.email)) {
    throw new Error('This person is already a member or invited');
  }

  const newMember: GroupTripMember = {
    id: generateId(),
    name: input.name,
    email: input.email,
    avatar: null,
    role: input.role || 'member',
    status: 'pending',
    joinedAt: new Date().toISOString(),
    contribution: 0,
  };

  trip.members.push(newMember);
  trip.budget.perPerson = trip.budget.total / trip.members.filter(m => m.status !== 'declined').length;
  await updateGroupTrip(trip.id, { members: trip.members, budget: trip.budget });

  return newMember;
}

export async function updateMemberStatus(
  tripId: string, 
  memberId: string, 
  status: 'confirmed' | 'declined'
): Promise<boolean> {
  const trip = await getGroupTrip(tripId);
  if (!trip) return false;

  const member = trip.members.find(m => m.id === memberId);
  if (!member) return false;

  member.status = status;
  trip.budget.perPerson = trip.budget.total / trip.members.filter(m => m.status !== 'declined').length;
  await updateGroupTrip(trip.id, { members: trip.members, budget: trip.budget });

  return true;
}

export async function removeMember(tripId: string, memberId: string): Promise<boolean> {
  const trip = await getGroupTrip(tripId);
  if (!trip) return false;

  // Can't remove organizer
  if (trip.organizerId === memberId) {
    throw new Error('Cannot remove the trip organizer');
  }

  trip.members = trip.members.filter(m => m.id !== memberId);
  trip.budget.perPerson = trip.budget.total / trip.members.filter(m => m.status !== 'declined').length;
  await updateGroupTrip(trip.id, { members: trip.members, budget: trip.budget });

  return true;
}

export async function updateMemberRole(tripId: string, memberId: string, role: MemberRole): Promise<boolean> {
  const trip = await getGroupTrip(tripId);
  if (!trip) return false;

  const member = trip.members.find(m => m.id === memberId);
  if (!member) return false;

  // Can't change organizer's role
  if (trip.organizerId === memberId && role !== 'organizer') {
    throw new Error('Cannot change the organizer role');
  }

  member.role = role;
  await updateGroupTrip(trip.id, { members: trip.members });

  return true;
}

// ============================================================================
// Destination Voting Operations
// ============================================================================

export async function proposeDestination(tripId: string, input: ProposeDestinationInput): Promise<DestinationOption | null> {
  const trip = await getGroupTrip(tripId);
  if (!trip) return null;

  const user = getCurrentUser();
  
  const destination: DestinationOption = {
    id: generateId(),
    name: input.name,
    country: input.country,
    image: input.image || getDestinationImage(input.name, input.country),
    proposedBy: user.id,
    proposedByName: user.name,
    priceEstimate: input.priceEstimate || 0,
    votes: [user.id], // Proposer auto-votes
    pros: input.pros || [],
    cons: input.cons || [],
    createdAt: new Date().toISOString(),
  };

  trip.destinationOptions.push(destination);
  await updateGroupTrip(trip.id, { destinationOptions: trip.destinationOptions });

  return destination;
}

export async function voteForDestination(tripId: string, destinationId: string): Promise<boolean> {
  const trip = await getGroupTrip(tripId);
  if (!trip || !trip.votingSettings.isOpen) return false;

  const user = getCurrentUser();
  const destination = trip.destinationOptions.find(d => d.id === destinationId);
  if (!destination) return false;

  // Check if already voted
  if (destination.votes.includes(user.id)) {
    // Remove vote (toggle)
    destination.votes = destination.votes.filter(v => v !== user.id);
  } else {
    // Check max votes
    if (!trip.votingSettings.allowMultipleVotes) {
      const userVoteCount = trip.destinationOptions.filter(d => d.votes.includes(user.id)).length;
      if (userVoteCount >= trip.votingSettings.maxVotesPerMember) {
        throw new Error(`You can only vote for ${trip.votingSettings.maxVotesPerMember} destination(s)`);
      }
    }
    destination.votes.push(user.id);
  }

  await updateGroupTrip(trip.id, { destinationOptions: trip.destinationOptions });
  return true;
}

export async function removeDestination(tripId: string, destinationId: string): Promise<boolean> {
  const trip = await getGroupTrip(tripId);
  if (!trip) return false;

  trip.destinationOptions = trip.destinationOptions.filter(d => d.id !== destinationId);
  await updateGroupTrip(trip.id, { destinationOptions: trip.destinationOptions });

  return true;
}

export async function finalizeDestination(tripId: string, destinationId: string): Promise<boolean> {
  const trip = await getGroupTrip(tripId);
  if (!trip) return false;

  const destination = trip.destinationOptions.find(d => d.id === destinationId);
  if (!destination) return false;

  trip.destination = destination.name;
  trip.destinations = [destination.name];
  trip.votingSettings.isOpen = false;
  trip.status = 'booked';

  await updateGroupTrip(trip.id, { 
    destination: trip.destination,
    destinations: trip.destinations,
    votingSettings: trip.votingSettings,
    status: trip.status,
  });

  return true;
}

// ============================================================================
// Expense Operations
// ============================================================================

export async function addExpense(tripId: string, input: AddExpenseInput): Promise<GroupExpense | null> {
  const trip = await getGroupTrip(tripId);
  if (!trip) return null;

  const splitAmong = input.splitAmong || trip.members.filter(m => m.status === 'confirmed').map(m => m.id);
  const splitAmount = input.amount / splitAmong.length;

  const today = new Date().toISOString().split('T')[0] as string;
  const expenseDate: string = input.date || today;
  
  const expense: GroupExpense = {
    id: generateId(),
    category: input.category,
    description: input.description,
    amount: input.amount,
    currency: input.currency || trip.budget.currency,
    paidBy: input.paidBy,
    splitType: input.splitType || 'equal',
    splits: splitAmong.map(memberId => ({
      memberId,
      amount: splitAmount,
      paid: memberId === input.paidBy,
    })),
    date: expenseDate,
    createdAt: new Date().toISOString(),
  };
  
  if (input.notes) {
    expense.notes = input.notes;
  }

  trip.expenses.push(expense);
  
  // Update budget collected
  trip.budget.collected = trip.expenses.reduce((sum, e) => sum + e.amount, 0);
  
  await updateGroupTrip(trip.id, { expenses: trip.expenses, budget: trip.budget });

  return expense;
}

export async function updateExpense(tripId: string, expenseId: string, updates: Partial<GroupExpense>): Promise<boolean> {
  const trip = await getGroupTrip(tripId);
  if (!trip) return false;

  const index = trip.expenses.findIndex(e => e.id === expenseId);
  if (index === -1) return false;

  const existingExpense = trip.expenses[index];
  if (!existingExpense) return false;
  
  const updatedExpense: GroupExpense = {
    id: existingExpense.id,
    category: updates.category ?? existingExpense.category,
    description: updates.description ?? existingExpense.description,
    amount: updates.amount ?? existingExpense.amount,
    currency: updates.currency ?? existingExpense.currency,
    paidBy: updates.paidBy ?? existingExpense.paidBy,
    splitType: updates.splitType ?? existingExpense.splitType,
    splits: updates.splits ?? existingExpense.splits,
    date: updates.date ?? existingExpense.date,
    createdAt: existingExpense.createdAt,
    notes: updates.notes ?? existingExpense.notes,
  };
  trip.expenses[index] = updatedExpense;
  trip.budget.collected = trip.expenses.reduce((sum, e) => sum + e.amount, 0);
  
  await updateGroupTrip(trip.id, { expenses: trip.expenses, budget: trip.budget });

  return true;
}

export async function deleteExpense(tripId: string, expenseId: string): Promise<boolean> {
  const trip = await getGroupTrip(tripId);
  if (!trip) return false;

  trip.expenses = trip.expenses.filter(e => e.id !== expenseId);
  trip.budget.collected = trip.expenses.reduce((sum, e) => sum + e.amount, 0);
  
  await updateGroupTrip(trip.id, { expenses: trip.expenses, budget: trip.budget });

  return true;
}

// ============================================================================
// Balance & Settlement Calculations
// ============================================================================

export function calculateBalances(trip: GroupTrip): MemberBalance[] {
  const balances: Map<string, MemberBalance> = new Map();

  // Initialize balances for all confirmed members
  trip.members
    .filter(m => m.status === 'confirmed')
    .forEach(m => {
      balances.set(m.id, {
        memberId: m.id,
        memberName: m.name,
        totalPaid: 0,
        totalOwed: 0,
        balance: 0,
      });
    });

  // Calculate from expenses
  trip.expenses.forEach(expense => {
    // Add to payer's paid amount
    const payerBalance = balances.get(expense.paidBy);
    if (payerBalance) {
      payerBalance.totalPaid += expense.amount;
    }

    // Add to each member's owed amount
    expense.splits.forEach(split => {
      const memberBalance = balances.get(split.memberId);
      if (memberBalance) {
        memberBalance.totalOwed += split.amount;
      }
    });
  });

  // Calculate net balance
  balances.forEach(balance => {
    balance.balance = balance.totalPaid - balance.totalOwed;
  });

  return Array.from(balances.values());
}

export function calculateSettlements(balances: MemberBalance[]): SettlementSuggestion[] {
  const settlements: SettlementSuggestion[] = [];
  
  // Separate into debtors (owe money) and creditors (get money back)
  const debtors = balances
    .filter(b => b.balance < -0.01)
    .map(b => ({ ...b, remaining: Math.abs(b.balance) }))
    .sort((a, b) => b.remaining - a.remaining);
  
  const creditors = balances
    .filter(b => b.balance > 0.01)
    .map(b => ({ ...b, remaining: b.balance }))
    .sort((a, b) => b.remaining - a.remaining);

  // Simple algorithm: Match largest debtor with largest creditor
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    
    if (!debtor || !creditor) break;
    
    const amount = Math.min(debtor.remaining, creditor.remaining);
    
    if (amount > 0.01) {
      settlements.push({
        from: debtor.memberId,
        fromName: debtor.memberName,
        to: creditor.memberId,
        toName: creditor.memberName,
        amount: Math.round(amount * 100) / 100,
      });
    }

    debtor.remaining -= amount;
    creditor.remaining -= amount;

    if (debtor.remaining < 0.01) debtorIndex++;
    if (creditor.remaining < 0.01) creditorIndex++;
  }

  return settlements;
}

export async function recordSettlement(tripId: string, settlement: Omit<Settlement, 'id'>): Promise<Settlement | null> {
  const trip = await getGroupTrip(tripId);
  if (!trip) return null;

  const newSettlement: Settlement = {
    ...settlement,
    id: generateId(),
  };

  trip.settlements.push(newSettlement);
  await updateGroupTrip(trip.id, { settlements: trip.settlements });

  return newSettlement;
}

export async function markSettlementComplete(tripId: string, settlementId: string): Promise<boolean> {
  const trip = await getGroupTrip(tripId);
  if (!trip) return false;

  const settlement = trip.settlements.find(s => s.id === settlementId);
  if (!settlement) return false;

  settlement.status = 'completed';
  settlement.settledAt = new Date().toISOString();
  
  await updateGroupTrip(trip.id, { settlements: trip.settlements });

  return true;
}

// ============================================================================
// Activity Operations
// ============================================================================

export async function addActivity(tripId: string, activity: Omit<PlannedActivity, 'id'>): Promise<PlannedActivity | null> {
  const trip = await getGroupTrip(tripId);
  if (!trip) return null;

  const newActivity: PlannedActivity = {
    id: generateId(),
    name: activity.name,
    description: activity.description,
    date: activity.date,
    time: activity.time,
    duration: activity.duration,
    location: activity.location,
    cost: activity.cost,
    bookedBy: activity.bookedBy,
    confirmed: activity.confirmed,
    votes: activity.votes ?? [],
    attendees: activity.attendees ?? [],
  };

  trip.activities.push(newActivity);
  await updateGroupTrip(trip.id, { activities: trip.activities });

  return newActivity;
}

export async function updateActivity(tripId: string, activityId: string, updates: Partial<PlannedActivity>): Promise<boolean> {
  const trip = await getGroupTrip(tripId);
  if (!trip) return false;

  const index = trip.activities.findIndex(a => a.id === activityId);
  if (index === -1) return false;

  const existingActivity = trip.activities[index];
  if (!existingActivity) return false;
  
  const updatedActivity: PlannedActivity = {
    id: existingActivity.id,
    name: updates.name ?? existingActivity.name,
    description: updates.description ?? existingActivity.description,
    date: updates.date ?? existingActivity.date,
    time: updates.time ?? existingActivity.time,
    duration: updates.duration ?? existingActivity.duration,
    location: updates.location ?? existingActivity.location,
    cost: updates.cost ?? existingActivity.cost,
    bookedBy: updates.bookedBy ?? existingActivity.bookedBy,
    confirmed: updates.confirmed ?? existingActivity.confirmed,
    votes: updates.votes ?? existingActivity.votes,
    attendees: updates.attendees ?? existingActivity.attendees,
  };
  trip.activities[index] = updatedActivity;
  await updateGroupTrip(trip.id, { activities: trip.activities });

  return true;
}

export async function deleteActivity(tripId: string, activityId: string): Promise<boolean> {
  const trip = await getGroupTrip(tripId);
  if (!trip) return false;

  const newActivities = trip.activities.filter(a => a.id !== activityId);
  await updateGroupTrip(trip.id, { activities: newActivities });

  return true;
}

// ============================================================================
// Utility Functions
// ============================================================================

const coverImages = [
  'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800',
  'https://images.unsplash.com/photo-1530521954074-e64f6810b32d?w=800',
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800',
  'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=800',
  'https://images.unsplash.com/photo-1500259571355-332da5cb07aa?w=800',
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800',
];

function getRandomCoverImage(): string {
  const image = coverImages[Math.floor(Math.random() * coverImages.length)];
  return image || coverImages[0] || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800';
}

function getDestinationImage(name: string, country: string): string {
  const destinationImages: Record<string, string> = {
    'rome': 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600',
    'paris': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600',
    'barcelona': 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=600',
    'london': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600',
    'tokyo': 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600',
    'new york': 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600',
    'dubai': 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600',
    'bali': 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600',
    'maldives': 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=600',
    'santorini': 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=600',
    'italy': 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=600',
    'france': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600',
    'spain': 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=600',
    'thailand': 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=600',
    'japan': 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600',
    'greece': 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=600',
    'australia': 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=600',
    'default': 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600',
  };

  const searchKey = name.toLowerCase();
  const countryKey = country.toLowerCase();
  
  const defaultImage = 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600';
  
  return destinationImages[searchKey] || 
         destinationImages[countryKey] || 
         defaultImage;
}

// ============================================================================
// Initialize Demo Data
// ============================================================================

export async function initializeDemoData(): Promise<void> {
  const trips = getStoredTrips();
  if (trips.length > 0) return; // Already has data

  const user = getCurrentUser();
  const now = new Date().toISOString();

  const demoTrip: GroupTrip = {
    id: 'demo-trip-1',
    name: 'European Adventure 2025',
    description: 'An amazing trip through Italy and France with friends!',
    coverImage: 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=800',
    status: 'planning',
    destination: null,
    destinations: [],
    dates: {
      startDate: '2025-06-15',
      endDate: '2025-06-29',
      isFlexible: false,
    },
    organizerId: user.id,
    members: [
      { id: user.id, name: user.name, email: user.email, avatar: user.avatar, role: 'organizer', status: 'confirmed', joinedAt: now, contribution: 0, userId: user.id },
      { id: 'user-2', name: 'Mike Johnson', email: 'mike@example.com', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200', role: 'member', status: 'confirmed', joinedAt: now, contribution: 0 },
      { id: 'user-3', name: 'Emily Davis', email: 'emily@example.com', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200', role: 'member', status: 'confirmed', joinedAt: now, contribution: 0 },
      { id: 'user-4', name: 'Alex Kim', email: 'alex@example.com', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200', role: 'member', status: 'pending', joinedAt: now, contribution: 0 },
      { id: 'user-5', name: 'Jordan Taylor', email: 'jordan@example.com', avatar: null, role: 'member', status: 'pending', joinedAt: now, contribution: 0 },
    ],
    inviteCode: 'EURO25',
    maxMembers: 10,
    budget: {
      total: 12000,
      perPerson: 2400,
      collected: 6550,
      currency: 'USD',
    },
    destinationOptions: [
      {
        id: 'dest-1',
        name: 'Rome',
        country: 'Italy',
        image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600',
        proposedBy: user.id,
        proposedByName: user.name,
        priceEstimate: 2800,
        votes: [user.id, 'user-2', 'user-3'],
        pros: ['Amazing history', 'Great food', 'Beautiful architecture'],
        cons: ['Can be crowded', 'Hot in summer'],
        createdAt: now,
      },
      {
        id: 'dest-2',
        name: 'Paris',
        country: 'France',
        image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600',
        proposedBy: 'user-2',
        proposedByName: 'Mike Johnson',
        priceEstimate: 3200,
        votes: [user.id, 'user-4'],
        pros: ['Romantic', 'World-class museums', 'Great shopping'],
        cons: ['Expensive', 'Language barrier'],
        createdAt: now,
      },
      {
        id: 'dest-3',
        name: 'Barcelona',
        country: 'Spain',
        image: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=600',
        proposedBy: 'user-3',
        proposedByName: 'Emily Davis',
        priceEstimate: 2400,
        votes: ['user-2', 'user-5'],
        pros: ['Beautiful beaches', 'Gaudi architecture', 'Great nightlife'],
        cons: ['Pickpockets', 'Tourist crowds'],
        createdAt: now,
      },
    ],
    votingSettings: {
      isOpen: true,
      deadline: '2025-03-01',
      maxVotesPerMember: 3,
      allowMultipleVotes: true,
    },
    expenses: [
      {
        id: 'exp-1',
        category: 'flights',
        description: 'Group flight booking',
        amount: 4800,
        currency: 'USD',
        paidBy: user.id,
        splitType: 'equal',
        splits: [
          { memberId: user.id, amount: 960, paid: true },
          { memberId: 'user-2', amount: 960 },
          { memberId: 'user-3', amount: 960 },
          { memberId: 'user-4', amount: 960 },
          { memberId: 'user-5', amount: 960 },
        ],
        date: '2025-01-15',
        createdAt: now,
      },
      {
        id: 'exp-2',
        category: 'accommodation',
        description: 'Airbnb Rome (5 nights)',
        amount: 1500,
        currency: 'USD',
        paidBy: 'user-2',
        splitType: 'equal',
        splits: [
          { memberId: user.id, amount: 300 },
          { memberId: 'user-2', amount: 300, paid: true },
          { memberId: 'user-3', amount: 300 },
          { memberId: 'user-4', amount: 300 },
          { memberId: 'user-5', amount: 300 },
        ],
        date: '2025-01-20',
        createdAt: now,
      },
      {
        id: 'exp-3',
        category: 'activities',
        description: 'Colosseum group tour',
        amount: 250,
        currency: 'USD',
        paidBy: 'user-3',
        splitType: 'equal',
        splits: [
          { memberId: user.id, amount: 50 },
          { memberId: 'user-2', amount: 50 },
          { memberId: 'user-3', amount: 50, paid: true },
          { memberId: 'user-4', amount: 50 },
          { memberId: 'user-5', amount: 50 },
        ],
        date: '2025-02-01',
        createdAt: now,
      },
    ],
    settlements: [],
    activities: [
      {
        id: 'act-1',
        name: 'Colosseum Visit',
        description: 'Guided tour of the ancient Roman arena',
        date: '2025-06-16',
        time: '10:00',
        duration: '3 hours',
        location: 'Rome, Italy',
        cost: 50,
        confirmed: true,
        votes: [user.id, 'user-2', 'user-3'],
        attendees: [user.id, 'user-2', 'user-3', 'user-4', 'user-5'],
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  saveTrips([demoTrip]);
}

// ============================================================================
// Export all functions
// ============================================================================

export const groupTripStore = {
  // Trip operations
  createGroupTrip,
  getGroupTrip,
  getGroupTripByInviteCode,
  getUserTrips,
  updateGroupTrip,
  deleteGroupTrip,
  
  // Member operations
  joinTrip,
  inviteMember,
  updateMemberStatus,
  removeMember,
  updateMemberRole,
  
  // Destination voting
  proposeDestination,
  voteForDestination,
  removeDestination,
  finalizeDestination,
  
  // Expenses
  addExpense,
  updateExpense,
  deleteExpense,
  
  // Settlements
  calculateBalances,
  calculateSettlements,
  recordSettlement,
  markSettlementComplete,
  
  // Activities
  addActivity,
  updateActivity,
  deleteActivity,
  
  // User
  getCurrentUser,
  setCurrentUser,
  
  // Demo
  initializeDemoData,
};
