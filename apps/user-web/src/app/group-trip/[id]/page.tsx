'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Users,
  UserPlus,
  Mail,
  Copy,
  Check,
  Crown,
  ThumbsUp,
  MessageSquare,
  Calendar,
  MapPin,
  DollarSign,
  Calculator,
  Sparkles,
  Share2,
  Settings,
  ChevronRight,
  ArrowLeft,
  Plane,
  Hotel,
  Utensils,
  Ticket,
  Car,
  Plus,
  X,
  Star,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Vote,
  Trash2,
  MoreVertical,
  Globe,
  ShoppingBag,
  Shield,
  FileText,
  Coins,
  Gift,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  GroupTripsProvider, 
  useGroupTrips,
  ExpenseCategory,
} from '@/lib/group-trips';
import { cn } from '@/lib/utils';

// Category icons for expenses
const categoryIcons: Record<ExpenseCategory | string, typeof Plane> = {
  flights: Plane,
  accommodation: Hotel,
  food: Utensils,
  activities: Ticket,
  transport: Car,
  shopping: ShoppingBag,
  insurance: Shield,
  visas: FileText,
  tips: Coins,
  other: Gift,
};

const categoryColors: Record<ExpenseCategory | string, { bg: string; text: string }> = {
  flights: { bg: 'bg-blue-100', text: 'text-blue-600' },
  accommodation: { bg: 'bg-purple-100', text: 'text-purple-600' },
  food: { bg: 'bg-orange-100', text: 'text-orange-600' },
  activities: { bg: 'bg-emerald-100', text: 'text-emerald-600' },
  transport: { bg: 'bg-cyan-100', text: 'text-cyan-600' },
  shopping: { bg: 'bg-pink-100', text: 'text-pink-600' },
  insurance: { bg: 'bg-slate-100', text: 'text-slate-600' },
  visas: { bg: 'bg-amber-100', text: 'text-amber-600' },
  tips: { bg: 'bg-yellow-100', text: 'text-yellow-600' },
  other: { bg: 'bg-gray-100', text: 'text-gray-600' },
};

// Add Expense Modal Component
function AddExpenseModal({ 
  isOpen, 
  onClose, 
  onAdd 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onAdd: (data: { category: ExpenseCategory; description: string; amount: number; paidBy: string }) => void;
}) {
  const { currentTrip, currentUser } = useGroupTrips();
  const [formData, setFormData] = useState({
    category: 'activities' as ExpenseCategory,
    description: '',
    amount: '',
    paidBy: currentUser.id,
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen || !currentTrip) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.amount) return;
    
    setLoading(true);
    try {
      await onAdd({
        category: formData.category,
        description: formData.description,
        amount: parseFloat(formData.amount),
        paidBy: formData.paidBy,
      });
      setFormData({ category: 'activities', description: '', amount: '', paidBy: currentUser.id });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md border-0 shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Add Expense</CardTitle>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Category</Label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as ExpenseCategory }))}
                className="w-full mt-1 p-2 border rounded-lg bg-white"
              >
                {Object.keys(categoryIcons).map(cat => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <Label>Description</Label>
              <Input
                placeholder="e.g., Group dinner"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label>Amount ({currentTrip.budget.currency})</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label>Paid By</Label>
              <select
                value={formData.paidBy}
                onChange={(e) => setFormData(prev => ({ ...prev, paidBy: e.target.value }))}
                className="w-full mt-1 p-2 border rounded-lg bg-white"
              >
                {currentTrip.members.filter(m => m.status === 'confirmed').map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} {m.id === currentUser.id && '(You)'}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading || !formData.description || !formData.amount}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600"
              >
                {loading ? 'Adding...' : 'Add Expense'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// Propose Destination Modal
function ProposeDestinationModal({
  isOpen,
  onClose,
  onPropose,
}: {
  isOpen: boolean;
  onClose: () => void;
  onPropose: (data: { name: string; country: string; priceEstimate: number }) => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    country: '',
    priceEstimate: '',
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.country) return;
    
    setLoading(true);
    try {
      await onPropose({
        name: formData.name,
        country: formData.country,
        priceEstimate: parseFloat(formData.priceEstimate) || 0,
      });
      setFormData({ name: '', country: '', priceEstimate: '' });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md border-0 shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Propose Destination</CardTitle>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>City/Destination</Label>
              <Input
                placeholder="e.g., Rome, Barcelona, Tokyo"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label>Country</Label>
              <Input
                placeholder="e.g., Italy, Spain, Japan"
                value={formData.country}
                onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label>Estimated Price per Person (optional)</Label>
              <Input
                type="number"
                placeholder="0"
                value={formData.priceEstimate}
                onChange={(e) => setFormData(prev => ({ ...prev, priceEstimate: e.target.value }))}
                className="mt-1"
              />
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading || !formData.name || !formData.country}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600"
              >
                {loading ? 'Proposing...' : 'Propose Destination'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// Invite Member Modal
function InviteMemberModal({
  isOpen,
  onClose,
  onInvite,
}: {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (data: { name: string; email: string }) => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;
    
    setLoading(true);
    try {
      await onInvite({
        name: formData.name,
        email: formData.email,
      });
      setFormData({ name: '', email: '' });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md border-0 shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Invite Member</CardTitle>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                placeholder="e.g., John Doe"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="e.g., john@example.com"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="mt-1"
              />
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading || !formData.name || !formData.email}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600"
              >
                {loading ? 'Inviting...' : 'Send Invite'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// Main Trip Detail Content
function TripDetailContent() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;
  
  const {
    currentTrip,
    tripLoading,
    loadTrip,
    currentUser,
    balances,
    settlements,
    isOrganizer,
    canManage,
    getUserVotes,
    voteForDestination,
    proposeDestination,
    addExpense,
    deleteExpense,
    inviteMember,
    removeMember,
    finalizeDestination,
    error,
    clearError,
  } = useGroupTrips();

  const [activeTab, setActiveTab] = useState('overview');
  const [copiedCode, setCopiedCode] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showProposeDestination, setShowProposeDestination] = useState(false);
  const [showInviteMember, setShowInviteMember] = useState(false);

  useEffect(() => {
    if (tripId) {
      loadTrip(tripId);
    }
  }, [tripId, loadTrip]);

  const copyInviteCode = () => {
    if (currentTrip) {
      navigator.clipboard.writeText(currentTrip.inviteCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const userVotes = getUserVotes();

  if (tripLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-72 w-full rounded-lg mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        </div>
      </div>
    );
  }

  if (!currentTrip) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="border-0 shadow-lg p-8 text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Trip Not Found</h2>
          <p className="text-slate-500 mb-6">
            This trip doesn't exist or you don't have access to it.
          </p>
          <Link href="/group-trips">
            <Button className="bg-indigo-600">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to My Trips
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const confirmedMembers = currentTrip.members.filter(m => m.status === 'confirmed').length;
  const totalMembers = currentTrip.members.length;
  const budgetProgress = currentTrip.budget.total > 0
    ? (currentTrip.budget.collected / currentTrip.budget.total) * 100
    : 0;
  const totalExpenses = currentTrip.expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Error Toast */}
      {error && (
        <div className="fixed top-4 right-4 z-50 p-4 bg-red-50 border border-red-200 rounded-lg shadow-lg flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span className="text-red-700">{error}</span>
          <button onClick={clearError} className="text-red-500 hover:text-red-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Hero Section */}
      <div className="relative h-72 overflow-hidden">
        <img 
          src={currentTrip.coverImage} 
          alt={currentTrip.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        
        {/* Back Button */}
        <div className="absolute top-4 left-4">
          <Link href="/group-trips">
            <Button variant="outline" size="sm" className="bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>

        {/* Settings Button (for organizers) */}
        {isOrganizer && (
          <div className="absolute top-4 right-4">
            <Button variant="outline" size="sm" className="bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        )}
        
        <div className="absolute inset-0 flex flex-col justify-end p-8">
          <div className="max-w-7xl mx-auto w-full">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <Badge className="bg-indigo-500/80 text-white border-0 mb-3 backdrop-blur-sm">
                  <Users className="h-3 w-3 mr-1" />
                  Group Trip • {totalMembers} travelers
                </Badge>
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
                  {currentTrip.name}
                </h1>
                <div className="flex items-center gap-4 text-white/80">
                  {currentTrip.destination && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{currentTrip.destination}</span>
                    </div>
                  )}
                  {currentTrip.dates.startDate && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {new Date(currentTrip.dates.startDate).toLocaleDateString()}
                        {currentTrip.dates.endDate && ` - ${new Date(currentTrip.dates.endDate).toLocaleDateString()}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Member Avatars */}
              <div className="flex items-center gap-3">
                <div className="flex -space-x-3">
                  {currentTrip.members.slice(0, 4).map(member => (
                    <Avatar key={member.id} className="border-2 border-white h-10 w-10">
                      <AvatarImage src={member.avatar ?? ''} alt={member.name} />
                      <AvatarFallback className="bg-indigo-500 text-white text-sm">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {currentTrip.members.length > 4 && (
                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white flex items-center justify-center">
                      <span className="text-white text-sm font-medium">+{currentTrip.members.length - 4}</span>
                    </div>
                  )}
                </div>
                <Button 
                  className="bg-white/20 backdrop-blur-sm text-white border-0 hover:bg-white/30"
                  onClick={copyInviteCode}
                >
                  {copiedCode ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Share2 className="h-4 w-4 mr-2" />
                      Share ({currentTrip.inviteCode})
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-white shadow-md border-0 p-1 h-auto flex-wrap">
            <TabsTrigger value="overview" className="px-4 py-2">
              <Sparkles className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="voting" className="px-4 py-2">
              <Vote className="h-4 w-4 mr-2" />
              Voting
              {currentTrip.votingSettings.isOpen && currentTrip.destinationOptions.length > 0 && (
                <span className="ml-2 bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full">
                  {currentTrip.destinationOptions.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="expenses" className="px-4 py-2">
              <Calculator className="h-4 w-4 mr-2" />
              Expenses
              {currentTrip.expenses.length > 0 && (
                <span className="ml-2 bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full">
                  ${totalExpenses.toLocaleString()}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="members" className="px-4 py-2">
              <Users className="h-4 w-4 mr-2" />
              Members
              <span className="ml-2 bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded-full">
                {totalMembers}
              </span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Budget Card */}
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-slate-800">Trip Expenses</h3>
                    <DollarSign className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div className="text-3xl font-bold text-slate-800 mb-1">
                    ${totalExpenses.toLocaleString()}
                  </div>
                  <div className="text-sm text-slate-500 mb-4">
                    {currentTrip.budget.total > 0 
                      ? `of $${currentTrip.budget.total.toLocaleString()} budget`
                      : 'total spent'
                    }
                  </div>
                  {currentTrip.budget.total > 0 && (
                    <Progress value={budgetProgress} className="h-2 mb-2" />
                  )}
                  <div className="text-sm text-slate-600">
                    ~${Math.round(totalExpenses / confirmedMembers).toLocaleString()} per person
                  </div>
                </CardContent>
              </Card>

              {/* Confirmation Status */}
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-slate-800">Confirmations</h3>
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div className="text-3xl font-bold text-slate-800 mb-1">
                    {confirmedMembers}/{totalMembers}
                  </div>
                  <div className="text-sm text-slate-500 mb-4">
                    members confirmed
                  </div>
                  <div className="flex items-center gap-2">
                    {currentTrip.members.map(member => (
                      <div
                        key={member.id}
                        className={cn(
                          "w-3 h-3 rounded-full",
                          member.status === 'confirmed' ? "bg-emerald-500" : 
                          member.status === 'pending' ? "bg-amber-400" : "bg-red-400"
                        )}
                        title={`${member.name}: ${member.status}`}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Invite Card */}
              <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Invite Friends</h3>
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <div className="mb-4">
                    <label className="text-sm text-white/70 block mb-2">Invite Code</label>
                    <div className="flex items-center gap-2 bg-white/20 rounded-lg p-3">
                      <code className="text-lg font-mono font-bold flex-1">{currentTrip.inviteCode}</code>
                      <button 
                        onClick={copyInviteCode}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        {copiedCode ? (
                          <Check className="h-5 w-5 text-emerald-300" />
                        ) : (
                          <Copy className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                  <Button 
                    className="w-full bg-white text-indigo-600 hover:bg-slate-100"
                    onClick={() => setShowInviteMember(true)}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Send Invite
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: Vote, label: 'Vote on Destinations', tab: 'voting', color: 'bg-indigo-500' },
                { icon: Calculator, label: 'Split Expenses', tab: 'expenses', color: 'bg-emerald-500' },
                { icon: MessageSquare, label: 'Group Chat', href: '/messages', color: 'bg-purple-500' },
                { icon: Calendar, label: 'Plan Activities', tab: 'activities', color: 'bg-amber-500' },
              ].map((action) => {
                const Icon = action.icon;
                return (
                  <Card 
                    key={action.label} 
                    className="border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                    onClick={() => action.tab ? setActiveTab(action.tab) : undefined}
                  >
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", action.color)}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-800">{action.label}</h4>
                      </div>
                      <ChevronRight className="h-5 w-5 text-slate-400" />
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Description */}
            {currentTrip.description && (
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-slate-800 mb-2">About this Trip</h3>
                  <p className="text-slate-600">{currentTrip.description}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Voting Tab */}
          <TabsContent value="voting" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Destination Voting</h2>
                <p className="text-slate-500">
                  {currentTrip.votingSettings.isOpen 
                    ? 'Vote for your preferred destinations'
                    : currentTrip.destination 
                      ? `Destination finalized: ${currentTrip.destination}`
                      : 'Voting is closed'
                  }
                </p>
              </div>
              {currentTrip.votingSettings.isOpen && (
                <Button 
                  className="bg-gradient-to-r from-indigo-600 to-purple-600"
                  onClick={() => setShowProposeDestination(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Propose Destination
                </Button>
              )}
            </div>

            {currentTrip.destinationOptions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentTrip.destinationOptions.map((dest) => {
                  const voteCount = dest.votes.length;
                  const hasVoted = userVotes.has(dest.id);
                  const maxVotes = Math.max(...currentTrip.destinationOptions.map(d => d.votes.length));
                  const isWinning = voteCount === maxVotes && voteCount > 0;

                  return (
                    <Card key={dest.id} className={cn(
                      "border-0 shadow-lg overflow-hidden transition-all",
                      isWinning && "ring-2 ring-emerald-500"
                    )}>
                      <div className="relative h-40">
                        <img 
                          src={dest.image} 
                          alt={dest.name}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        {isWinning && (
                          <Badge className="absolute top-3 right-3 bg-emerald-500 text-white border-0">
                            <Star className="h-3 w-3 mr-1 fill-current" />
                            Leading
                          </Badge>
                        )}
                        <div className="absolute bottom-3 left-3 text-white">
                          <h3 className="text-xl font-bold">{dest.name}</h3>
                          <p className="text-sm text-white/80">
                            {dest.country}
                            {dest.priceEstimate > 0 && ` • $${dest.priceEstimate}/person`}
                          </p>
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className="flex -space-x-2">
                              {dest.votes.slice(0, 3).map((voterId) => {
                                const voter = currentTrip.members.find(m => m.id === voterId);
                                return voter ? (
                                  <Avatar key={voterId} className="border-2 border-white h-7 w-7">
                                    <AvatarImage src={voter.avatar ?? ''} alt={voter.name} />
                                    <AvatarFallback className="bg-indigo-500 text-white text-xs">
                                      {voter.name.split(' ').map(n => n[0]).join('')}
                                    </AvatarFallback>
                                  </Avatar>
                                ) : null;
                              })}
                            </div>
                            <span className="text-sm text-slate-600 font-medium">{voteCount} votes</span>
                          </div>
                          <span className="text-xs text-slate-500">by {dest.proposedByName}</span>
                        </div>
                        
                        {currentTrip.votingSettings.isOpen ? (
                          <div className="flex gap-2">
                            <Button 
                              className={cn(
                                "flex-1",
                                hasVoted 
                                  ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200" 
                                  : "bg-gradient-to-r from-indigo-600 to-purple-600"
                              )}
                              onClick={() => voteForDestination(dest.id)}
                            >
                              {hasVoted ? (
                                <>
                                  <Check className="h-4 w-4 mr-2" />
                                  Voted
                                </>
                              ) : (
                                <>
                                  <ThumbsUp className="h-4 w-4 mr-2" />
                                  Vote
                                </>
                              )}
                            </Button>
                            {canManage && isWinning && (
                              <Button 
                                variant="outline"
                                className="text-emerald-600 border-emerald-300"
                                onClick={() => finalizeDestination(dest.id)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="border-0 shadow-lg">
                <CardContent className="p-12 text-center">
                  <Globe className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">No Destinations Yet</h3>
                  <p className="text-slate-500 mb-6">Be the first to propose a destination for your group!</p>
                  <Button 
                    className="bg-gradient-to-r from-indigo-600 to-purple-600"
                    onClick={() => setShowProposeDestination(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Propose First Destination
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Expenses Tab */}
          <TabsContent value="expenses" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Group Expenses</h2>
                <p className="text-slate-500">Track and split costs with your travel group</p>
              </div>
              <Button 
                className="bg-gradient-to-r from-indigo-600 to-purple-600"
                onClick={() => setShowAddExpense(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Expenses List */}
              <div className="lg:col-span-2 space-y-4">
                {currentTrip.expenses.length > 0 ? (
                  currentTrip.expenses.map(expense => {
                    const Icon = categoryIcons[expense.category] || Ticket;
                    const colors = categoryColors[expense.category] ?? { bg: 'bg-gray-100', text: 'text-gray-600' };
                    const payer = currentTrip.members.find(m => m.id === expense.paidBy);
                    const perPerson = expense.amount / expense.splits.length;

                    return (
                      <Card key={expense.id} className="border-0 shadow-lg">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-12 h-12 rounded-xl flex items-center justify-center",
                              colors.bg, colors.text
                            )}>
                              <Icon className="h-6 w-6" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-slate-800">{expense.description}</h4>
                              <div className="flex items-center gap-2 text-sm text-slate-500">
                                <span>Paid by {payer?.name || 'Unknown'}</span>
                                <span>•</span>
                                <span>{new Date(expense.date).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xl font-bold text-slate-800">
                                ${expense.amount.toLocaleString()}
                              </div>
                              <div className="text-sm text-slate-500">
                                ${perPerson.toFixed(0)}/person
                              </div>
                            </div>
                            {canManage && (
                              <button 
                                onClick={() => deleteExpense(expense.id)}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <Card className="border-0 shadow-lg">
                    <CardContent className="p-12 text-center">
                      <Calculator className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-slate-800 mb-2">No Expenses Yet</h3>
                      <p className="text-slate-500 mb-6">Start tracking group expenses to split costs fairly.</p>
                      <Button 
                        className="bg-gradient-to-r from-indigo-600 to-purple-600"
                        onClick={() => setShowAddExpense(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add First Expense
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Balances Summary */}
              <Card className="border-0 shadow-lg h-fit">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-indigo-600" />
                    Who Owes Whom
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {balances.length > 0 ? (
                    <>
                      {balances.map(balance => {
                        const member = currentTrip.members.find(m => m.id === balance.memberId);
                        const isPositive = balance.balance > 0;
                        
                        return (
                          <div key={balance.memberId} className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={member?.avatar ?? ''} alt={balance.memberName} />
                              <AvatarFallback className="bg-indigo-100 text-indigo-600">
                                {balance.memberName.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="font-medium text-slate-800">{balance.memberName}</p>
                              <p className={cn(
                                "text-sm",
                                isPositive ? "text-emerald-600" : balance.balance < 0 ? "text-red-600" : "text-slate-500"
                              )}>
                                {isPositive ? `Gets back $${balance.balance.toFixed(0)}` :
                                 balance.balance < 0 ? `Owes $${Math.abs(balance.balance).toFixed(0)}` :
                                 'Settled up'}
                              </p>
                            </div>
                            {balance.balance !== 0 && (
                              <Badge className={cn(
                                isPositive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                              )}>
                                {isPositive ? '+' : ''}${balance.balance.toFixed(0)}
                              </Badge>
                            )}
                          </div>
                        );
                      })}

                      {settlements.length > 0 && (
                        <>
                          <div className="pt-4 border-t border-slate-200">
                            <h4 className="text-sm font-medium text-slate-600 mb-3">Suggested Settlements</h4>
                            {settlements.map((settlement, i) => (
                              <div key={i} className="flex items-center gap-2 text-sm py-2">
                                <span className="text-slate-700">{settlement.fromName}</span>
                                <ArrowRight className="h-4 w-4 text-slate-400" />
                                <span className="text-slate-700">{settlement.toName}</span>
                                <Badge className="ml-auto bg-slate-100 text-slate-700">
                                  ${settlement.amount.toFixed(0)}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </>
                      )}

                      <div className="pt-4 border-t border-slate-200">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">Total Expenses</span>
                          <span className="font-bold text-slate-800">
                            ${totalExpenses.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-slate-500 text-sm">Add expenses to see balances</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Group Members</h2>
                <p className="text-slate-500">{totalMembers} travelers in your group</p>
              </div>
              <Button 
                className="bg-gradient-to-r from-indigo-600 to-purple-600"
                onClick={() => setShowInviteMember(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Member
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentTrip.members.map(member => {
                const memberBalance = balances.find(b => b.memberId === member.id);
                const balance = memberBalance?.balance || 0;
                
                return (
                  <Card key={member.id} className={cn(
                    "border-0 shadow-lg",
                    member.role === 'organizer' && "ring-2 ring-amber-400"
                  )}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-16 w-16">
                            <AvatarImage src={member.avatar ?? ''} alt={member.name} />
                            <AvatarFallback className="bg-indigo-100 text-indigo-600 text-xl">
                              {member.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-slate-800">{member.name}</h3>
                              {member.role === 'organizer' && (
                                <Crown className="h-4 w-4 text-amber-500" />
                              )}
                              {member.id === currentUser.id && (
                                <Badge className="bg-indigo-100 text-indigo-700 border-0 text-xs">You</Badge>
                              )}
                            </div>
                            <Badge className={cn(
                              "mt-1",
                              member.status === 'confirmed' 
                                ? "bg-emerald-100 text-emerald-700" 
                                : member.status === 'pending'
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-red-100 text-red-700"
                            )}>
                              {member.status === 'confirmed' ? (
                                <>
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Confirmed
                                </>
                              ) : member.status === 'pending' ? (
                                <>
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Pending
                                </>
                              ) : (
                                <>
                                  <X className="h-3 w-3 mr-1" />
                                  Declined
                                </>
                              )}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Email</span>
                          <span className="font-medium text-slate-700 truncate max-w-[150px]">
                            {member.email}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Balance</span>
                          <span className={cn(
                            "font-medium",
                            balance > 0 ? "text-emerald-600" : balance < 0 ? "text-red-600" : "text-slate-600"
                          )}>
                            {balance > 0 ? '+' : ''}${balance.toFixed(0)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                        <Button variant="outline" size="sm" className="flex-1">
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Message
                        </Button>
                        {canManage && member.id !== currentUser.id && member.role !== 'organizer' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => removeMember(member.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {/* Add Member Card */}
              <Card 
                className="border-2 border-dashed border-slate-200 shadow-none hover:border-indigo-300 hover:bg-slate-50 transition-all cursor-pointer"
                onClick={() => setShowInviteMember(true)}
              >
                <CardContent className="p-6 flex flex-col items-center justify-center h-full min-h-[240px]">
                  <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
                    <UserPlus className="h-8 w-8 text-indigo-600" />
                  </div>
                  <h3 className="font-semibold text-slate-800 mb-1">Invite Someone</h3>
                  <p className="text-sm text-slate-500 text-center">
                    Share code: <code className="bg-slate-100 px-2 py-0.5 rounded font-mono">{currentTrip.inviteCode}</code>
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* CTA */}
        <Card className="border-0 shadow-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 mt-12">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Ready to Book?</h2>
            <p className="text-white/80 mb-6">Connect with a travel advisor to finalize your group trip</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/requests/new">
                <Button size="lg" className="bg-white text-indigo-600 hover:bg-slate-100">
                  <Sparkles className="h-5 w-5 mr-2" />
                  Get Group Quote
                </Button>
              </Link>
              <Link href="/travel-advisors">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                  Browse Travel Advisors
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <AddExpenseModal 
        isOpen={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        onAdd={async (data) => {
          await addExpense(data);
        }}
      />
      
      <ProposeDestinationModal
        isOpen={showProposeDestination}
        onClose={() => setShowProposeDestination(false)}
        onPropose={async (data) => {
          await proposeDestination(data);
        }}
      />
      
      <InviteMemberModal
        isOpen={showInviteMember}
        onClose={() => setShowInviteMember(false)}
        onInvite={async (data) => {
          await inviteMember(data);
        }}
      />
    </div>
  );
}

export default function GroupTripDetailPage() {
  const params = useParams();
  const tripId = params.id as string;
  
  return (
    <GroupTripsProvider tripId={tripId}>
      <TripDetailContent />
    </GroupTripsProvider>
  );
}
