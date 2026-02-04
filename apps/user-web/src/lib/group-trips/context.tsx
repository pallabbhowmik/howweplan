'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import {
  GroupTrip,
  GroupTripMember,
  GroupExpense,
  DestinationOption,
  MemberBalance,
  SettlementSuggestion,
  CreateGroupTripInput,
  AddExpenseInput,
  ProposeDestinationInput,
  InviteMemberInput,
  MemberRole,
} from './types';
import {
  groupTripStore,
  getCurrentUser,
  calculateBalances,
  calculateSettlements,
  initializeDemoData,
  type CurrentUser,
} from './store';

// ============================================================================
// Context Types
// ============================================================================

interface GroupTripsContextValue {
  // Current user
  currentUser: CurrentUser;
  
  // Trips list
  trips: GroupTrip[];
  tripsLoading: boolean;
  refreshTrips: () => Promise<void>;
  
  // Single trip
  currentTrip: GroupTrip | null;
  tripLoading: boolean;
  loadTrip: (tripId: string) => Promise<void>;
  
  // Trip CRUD
  createTrip: (input: CreateGroupTripInput) => Promise<GroupTrip>;
  updateTrip: (updates: Partial<GroupTrip>) => Promise<void>;
  deleteTrip: () => Promise<void>;
  
  // Join
  joinTripByCode: (code: string) => Promise<{ trip: GroupTrip; member: GroupTripMember }>;
  
  // Members
  inviteMember: (input: InviteMemberInput) => Promise<GroupTripMember>;
  removeMember: (memberId: string) => Promise<void>;
  updateMemberRole: (memberId: string, role: MemberRole) => Promise<void>;
  
  // Destinations
  proposeDestination: (input: ProposeDestinationInput) => Promise<DestinationOption>;
  voteForDestination: (destinationId: string) => Promise<void>;
  removeDestination: (destinationId: string) => Promise<void>;
  finalizeDestination: (destinationId: string) => Promise<void>;
  
  // Expenses
  addExpense: (input: AddExpenseInput) => Promise<GroupExpense>;
  updateExpense: (expenseId: string, updates: Partial<GroupExpense>) => Promise<void>;
  deleteExpense: (expenseId: string) => Promise<void>;
  
  // Balances
  balances: MemberBalance[];
  settlements: SettlementSuggestion[];
  
  // Utils
  isOrganizer: boolean;
  canManage: boolean;
  getMemberById: (memberId: string) => GroupTripMember | undefined;
  getUserVotes: () => Set<string>;
  
  // Error state
  error: string | null;
  clearError: () => void;
}

const GroupTripsContext = createContext<GroupTripsContextValue | null>(null);

// ============================================================================
// Provider Component
// ============================================================================

interface GroupTripsProviderProps {
  children: ReactNode;
  tripId?: string;
}

export function GroupTripsProvider({ children, tripId }: GroupTripsProviderProps) {
  // Current user
  const [currentUser, setCurrentUser] = useState<CurrentUser>(() => getCurrentUser());
  
  // Trips list state
  const [trips, setTrips] = useState<GroupTrip[]>([]);
  const [tripsLoading, setTripsLoading] = useState(true);
  
  // Current trip state
  const [currentTrip, setCurrentTrip] = useState<GroupTrip | null>(null);
  const [tripLoading, setTripLoading] = useState(false);
  
  // Error state
  const [error, setError] = useState<string | null>(null);
  
  // ============================================================================
  // Initialize
  // ============================================================================
  
  useEffect(() => {
    const init = async () => {
      await initializeDemoData();
      await refreshTrips();
      if (tripId) {
        await loadTrip(tripId);
      }
    };
    init();
  }, [tripId]);
  
  // ============================================================================
  // Trips List Operations
  // ============================================================================
  
  const refreshTrips = useCallback(async () => {
    setTripsLoading(true);
    try {
      const userTrips = await groupTripStore.getUserTrips();
      setTrips(userTrips);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trips');
    } finally {
      setTripsLoading(false);
    }
  }, []);
  
  // ============================================================================
  // Single Trip Operations
  // ============================================================================
  
  const loadTrip = useCallback(async (id: string) => {
    setTripLoading(true);
    try {
      const trip = await groupTripStore.getGroupTrip(id);
      setCurrentTrip(trip);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trip');
    } finally {
      setTripLoading(false);
    }
  }, []);
  
  const refreshCurrentTrip = useCallback(async () => {
    if (currentTrip?.id) {
      const trip = await groupTripStore.getGroupTrip(currentTrip.id);
      setCurrentTrip(trip);
    }
  }, [currentTrip?.id]);
  
  // ============================================================================
  // Trip CRUD
  // ============================================================================
  
  const createTrip = useCallback(async (input: CreateGroupTripInput): Promise<GroupTrip> => {
    try {
      const trip = await groupTripStore.createGroupTrip(input);
      await refreshTrips();
      setCurrentTrip(trip);
      return trip;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create trip';
      setError(message);
      throw new Error(message);
    }
  }, [refreshTrips]);
  
  const updateTrip = useCallback(async (updates: Partial<GroupTrip>) => {
    if (!currentTrip) return;
    try {
      await groupTripStore.updateGroupTrip(currentTrip.id, updates);
      await refreshCurrentTrip();
      await refreshTrips();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update trip');
      throw err;
    }
  }, [currentTrip, refreshCurrentTrip, refreshTrips]);
  
  const deleteTrip = useCallback(async () => {
    if (!currentTrip) return;
    try {
      await groupTripStore.deleteGroupTrip(currentTrip.id);
      setCurrentTrip(null);
      await refreshTrips();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete trip');
      throw err;
    }
  }, [currentTrip, refreshTrips]);
  
  // ============================================================================
  // Join Trip
  // ============================================================================
  
  const joinTripByCode = useCallback(async (code: string) => {
    try {
      const result = await groupTripStore.joinTrip(code);
      if (!result) {
        throw new Error('Invalid invite code or trip not found');
      }
      await refreshTrips();
      setCurrentTrip(result.trip);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to join trip';
      setError(message);
      throw new Error(message);
    }
  }, [refreshTrips]);
  
  // ============================================================================
  // Member Operations
  // ============================================================================
  
  const inviteMember = useCallback(async (input: InviteMemberInput): Promise<GroupTripMember> => {
    if (!currentTrip) throw new Error('No trip selected');
    try {
      const member = await groupTripStore.inviteMember(currentTrip.id, input);
      if (!member) throw new Error('Failed to invite member');
      await refreshCurrentTrip();
      return member;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to invite member';
      setError(message);
      throw new Error(message);
    }
  }, [currentTrip, refreshCurrentTrip]);
  
  const removeMember = useCallback(async (memberId: string) => {
    if (!currentTrip) return;
    try {
      await groupTripStore.removeMember(currentTrip.id, memberId);
      await refreshCurrentTrip();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
      throw err;
    }
  }, [currentTrip, refreshCurrentTrip]);
  
  const updateMemberRole = useCallback(async (memberId: string, role: MemberRole) => {
    if (!currentTrip) return;
    try {
      await groupTripStore.updateMemberRole(currentTrip.id, memberId, role);
      await refreshCurrentTrip();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update member role');
      throw err;
    }
  }, [currentTrip, refreshCurrentTrip]);
  
  // ============================================================================
  // Destination Voting
  // ============================================================================
  
  const proposeDestination = useCallback(async (input: ProposeDestinationInput): Promise<DestinationOption> => {
    if (!currentTrip) throw new Error('No trip selected');
    try {
      const dest = await groupTripStore.proposeDestination(currentTrip.id, input);
      if (!dest) throw new Error('Failed to propose destination');
      await refreshCurrentTrip();
      return dest;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to propose destination';
      setError(message);
      throw new Error(message);
    }
  }, [currentTrip, refreshCurrentTrip]);
  
  const voteForDestination = useCallback(async (destinationId: string) => {
    if (!currentTrip) return;
    try {
      await groupTripStore.voteForDestination(currentTrip.id, destinationId);
      await refreshCurrentTrip();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to vote');
      throw err;
    }
  }, [currentTrip, refreshCurrentTrip]);
  
  const removeDestination = useCallback(async (destinationId: string) => {
    if (!currentTrip) return;
    try {
      await groupTripStore.removeDestination(currentTrip.id, destinationId);
      await refreshCurrentTrip();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove destination');
      throw err;
    }
  }, [currentTrip, refreshCurrentTrip]);
  
  const finalizeDestination = useCallback(async (destinationId: string) => {
    if (!currentTrip) return;
    try {
      await groupTripStore.finalizeDestination(currentTrip.id, destinationId);
      await refreshCurrentTrip();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to finalize destination');
      throw err;
    }
  }, [currentTrip, refreshCurrentTrip]);
  
  // ============================================================================
  // Expense Operations
  // ============================================================================
  
  const addExpense = useCallback(async (input: AddExpenseInput): Promise<GroupExpense> => {
    if (!currentTrip) throw new Error('No trip selected');
    try {
      const expense = await groupTripStore.addExpense(currentTrip.id, input);
      if (!expense) throw new Error('Failed to add expense');
      await refreshCurrentTrip();
      return expense;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add expense';
      setError(message);
      throw new Error(message);
    }
  }, [currentTrip, refreshCurrentTrip]);
  
  const updateExpense = useCallback(async (expenseId: string, updates: Partial<GroupExpense>) => {
    if (!currentTrip) return;
    try {
      await groupTripStore.updateExpense(currentTrip.id, expenseId, updates);
      await refreshCurrentTrip();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update expense');
      throw err;
    }
  }, [currentTrip, refreshCurrentTrip]);
  
  const deleteExpense = useCallback(async (expenseId: string) => {
    if (!currentTrip) return;
    try {
      await groupTripStore.deleteExpense(currentTrip.id, expenseId);
      await refreshCurrentTrip();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete expense');
      throw err;
    }
  }, [currentTrip, refreshCurrentTrip]);
  
  // ============================================================================
  // Calculated Values
  // ============================================================================
  
  const balances = currentTrip ? calculateBalances(currentTrip) : [];
  const settlements = calculateSettlements(balances);
  
  const isOrganizer = currentTrip?.organizerId === currentUser.id;
  const canManage = isOrganizer || 
    currentTrip?.members.some(m => 
      m.id === currentUser.id && (m.role === 'organizer' || m.role === 'co-organizer')
    ) || false;
  
  const getMemberById = useCallback((memberId: string): GroupTripMember | undefined => {
    return currentTrip?.members.find(m => m.id === memberId);
  }, [currentTrip]);
  
  const getUserVotes = useCallback((): Set<string> => {
    if (!currentTrip) return new Set();
    const votes = new Set<string>();
    currentTrip.destinationOptions.forEach(dest => {
      if (dest.votes.includes(currentUser.id)) {
        votes.add(dest.id);
      }
    });
    return votes;
  }, [currentTrip, currentUser.id]);
  
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  // ============================================================================
  // Context Value
  // ============================================================================
  
  const value: GroupTripsContextValue = {
    currentUser,
    trips,
    tripsLoading,
    refreshTrips,
    currentTrip,
    tripLoading,
    loadTrip,
    createTrip,
    updateTrip,
    deleteTrip,
    joinTripByCode,
    inviteMember,
    removeMember,
    updateMemberRole,
    proposeDestination,
    voteForDestination,
    removeDestination,
    finalizeDestination,
    addExpense,
    updateExpense,
    deleteExpense,
    balances,
    settlements,
    isOrganizer,
    canManage,
    getMemberById,
    getUserVotes,
    error,
    clearError,
  };
  
  return (
    <GroupTripsContext.Provider value={value}>
      {children}
    </GroupTripsContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useGroupTrips() {
  const context = useContext(GroupTripsContext);
  if (!context) {
    throw new Error('useGroupTrips must be used within a GroupTripsProvider');
  }
  return context;
}
