/**
 * Group Trip Types
 * 
 * Comprehensive type definitions for the group trip planning feature.
 * Designed for localStorage persistence with easy migration to backend API.
 */

// ============================================================================
// Member Types
// ============================================================================

export type MemberRole = 'organizer' | 'co-organizer' | 'member';
export type MemberStatus = 'pending' | 'confirmed' | 'declined';

export interface GroupTripMember {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  role: MemberRole;
  status: MemberStatus;
  joinedAt: string;
  contribution: number; // Amount paid toward trip
  userId?: string; // Link to real user if logged in
}

// ============================================================================
// Destination Voting Types
// ============================================================================

export interface DestinationOption {
  id: string;
  name: string;
  country: string;
  image: string;
  proposedBy: string; // Member ID
  proposedByName: string;
  priceEstimate: number;
  votes: string[]; // Member IDs who voted
  pros: string[];
  cons: string[];
  createdAt: string;
}

export interface VotingSettings {
  isOpen: boolean;
  deadline: string | null;
  maxVotesPerMember: number;
  allowMultipleVotes: boolean;
}

// ============================================================================
// Expense Types
// ============================================================================

export type ExpenseCategory = 
  | 'flights'
  | 'accommodation'
  | 'transport'
  | 'food'
  | 'activities'
  | 'shopping'
  | 'insurance'
  | 'visas'
  | 'tips'
  | 'other';

export type SplitType = 'equal' | 'custom' | 'percentage';

export interface ExpenseSplit {
  memberId: string;
  amount: number;
  percentage?: number;
  paid?: boolean;
}

export interface GroupExpense {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  currency: string;
  paidBy: string; // Member ID
  splitType: SplitType;
  splits: ExpenseSplit[];
  receipt?: string; // URL or base64
  date: string;
  createdAt: string;
  notes?: string;
}

export interface Settlement {
  id: string;
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  currency: string;
  settledAt: string | null;
  status: 'pending' | 'completed';
  method?: string;
  notes?: string;
}

// ============================================================================
// Activity Planning Types
// ============================================================================

export interface PlannedActivity {
  id: string;
  name: string;
  description?: string;
  date: string;
  time?: string;
  duration?: string;
  location?: string;
  cost?: number;
  bookedBy?: string;
  confirmed: boolean;
  votes: string[];
  attendees: string[];
}

// ============================================================================
// Group Trip Types
// ============================================================================

export type TripStatus = 'planning' | 'voting' | 'booked' | 'in_progress' | 'completed' | 'cancelled';

export interface GroupTripBudget {
  total: number;
  perPerson: number;
  collected: number;
  currency: string;
}

export interface GroupTripDates {
  startDate: string | null;
  endDate: string | null;
  isFlexible: boolean;
  flexibleRange?: {
    earliestStart: string;
    latestEnd: string;
  };
}

export interface GroupTrip {
  id: string;
  name: string;
  description?: string;
  coverImage: string;
  status: TripStatus;
  
  // Location
  destination: string | null;
  destinations: string[]; // Multiple destinations for multi-city trips
  
  // Dates
  dates: GroupTripDates;
  
  // Members
  organizerId: string;
  members: GroupTripMember[];
  inviteCode: string;
  maxMembers: number;
  
  // Budget
  budget: GroupTripBudget;
  
  // Voting
  destinationOptions: DestinationOption[];
  votingSettings: VotingSettings;
  
  // Expenses
  expenses: GroupExpense[];
  settlements: Settlement[];
  
  // Activities
  activities: PlannedActivity[];
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Balance Calculation Types
// ============================================================================

export interface MemberBalance {
  memberId: string;
  memberName: string;
  totalPaid: number;
  totalOwed: number;
  balance: number; // Positive = gets back, Negative = owes
}

export interface SettlementSuggestion {
  from: string;
  fromName: string;
  to: string;
  toName: string;
  amount: number;
}

// ============================================================================
// API Response Types (for future backend integration)
// ============================================================================

export interface GroupTripListResponse {
  trips: GroupTrip[];
  total: number;
  page: number;
  pageSize: number;
}

export interface GroupTripResponse {
  trip: GroupTrip;
}

export interface JoinTripResponse {
  success: boolean;
  trip: GroupTrip;
  member: GroupTripMember;
}

// ============================================================================
// Input Types
// ============================================================================

export interface CreateGroupTripInput {
  name: string;
  description?: string;
  coverImage?: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  isFlexible?: boolean;
  budgetTotal?: number;
  budgetCurrency?: string;
  maxMembers?: number;
}

export interface AddExpenseInput {
  category: ExpenseCategory;
  description: string;
  amount: number;
  currency?: string;
  paidBy: string;
  splitType?: SplitType;
  splitAmong?: string[];
  date?: string;
  notes?: string;
}

export interface ProposeDestinationInput {
  name: string;
  country: string;
  image?: string;
  priceEstimate?: number;
  pros?: string[];
  cons?: string[];
}

export interface InviteMemberInput {
  email: string;
  name: string;
  role?: MemberRole;
}
