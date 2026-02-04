'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Users,
  UserPlus,
  Mail,
  Copy,
  Check,
  Crown,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Calendar,
  MapPin,
  DollarSign,
  Calculator,
  Sparkles,
  Share2,
  Settings,
  ChevronRight,
  ArrowRight,
  Plane,
  Hotel,
  Utensils,
  Ticket,
  Car,
  Plus,
  X,
  Star,
  Lock,
  Unlock,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Vote,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

// Types
type Expense = {
  id: string;
  category: string;
  description: string;
  amount: number;
  paidBy: string;
  splitAmong: string[];
  date: string;
};

type Member = {
  id: string;
  name: string;
  avatar: string | null;
  role: string;
  confirmed: boolean;
};

// Sample group trip data
const sampleGroupTrip = {
  id: 'group-1',
  name: 'European Adventure 2025',
  destination: 'Italy & France',
  dates: 'June 15-29, 2025',
  status: 'planning',
  coverImage: 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=800',
  organizer: {
    id: 'user-1',
    name: 'Sarah Chen',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
  },
  members: [
    { id: 'user-1', name: 'Sarah Chen', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200', role: 'organizer', confirmed: true },
    { id: 'user-2', name: 'Mike Johnson', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200', role: 'member', confirmed: true },
    { id: 'user-3', name: 'Emily Davis', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200', role: 'member', confirmed: true },
    { id: 'user-4', name: 'Alex Kim', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200', role: 'member', confirmed: false },
    { id: 'user-5', name: 'Jordan Taylor', avatar: null, role: 'member', confirmed: false },
  ] as Member[],
  inviteCode: 'EURO2025',
  budget: {
    total: 12000,
    collected: 8400,
    perPerson: 2400,
  },
};

// Sample destination voting
const destinationOptions = [
  {
    id: 'dest-1',
    name: 'Rome, Italy',
    image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600',
    votes: ['user-1', 'user-2', 'user-3'],
    proposedBy: 'Sarah Chen',
    priceEstimate: '$2,800/person',
  },
  {
    id: 'dest-2',
    name: 'Paris, France',
    image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600',
    votes: ['user-1', 'user-4'],
    proposedBy: 'Mike Johnson',
    priceEstimate: '$3,200/person',
  },
  {
    id: 'dest-3',
    name: 'Barcelona, Spain',
    image: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=600',
    votes: ['user-2', 'user-5'],
    proposedBy: 'Emily Davis',
    priceEstimate: '$2,400/person',
  },
];

// Sample expenses
const expensesData: Expense[] = [
  { id: 'exp-1', category: 'flights', description: 'Group flight booking', amount: 4800, paidBy: 'user-1', splitAmong: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5'], date: '2025-01-15' },
  { id: 'exp-2', category: 'accommodation', description: 'Airbnb Rome (5 nights)', amount: 1500, paidBy: 'user-2', splitAmong: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5'], date: '2025-01-20' },
  { id: 'exp-3', category: 'activities', description: 'Colosseum group tour', amount: 250, paidBy: 'user-3', splitAmong: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5'], date: '2025-02-01' },
];

const categoryIcons: Record<string, typeof Plane> = {
  flights: Plane,
  accommodation: Hotel,
  food: Utensils,
  activities: Ticket,
  transport: Car,
};

// Calculate balances
function calculateBalances(expenses: Expense[], members: Member[]) {
  const balances: Record<string, number> = {};
  
  members.forEach(m => {
    balances[m.id] = 0;
  });

  expenses.forEach(exp => {
    const share = exp.amount / exp.splitAmong.length;
    balances[exp.paidBy] = (balances[exp.paidBy] || 0) + exp.amount;
    exp.splitAmong.forEach((memberId: string) => {
      balances[memberId] = (balances[memberId] || 0) - share;
    });
  });

  return balances;
}

export default function GroupTripPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [inviteEmail, setInviteEmail] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [userVotes, setUserVotes] = useState<Set<string>>(new Set(['dest-1']));
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: '',
    category: 'activities',
  });

  const balances = calculateBalances(expensesData, sampleGroupTrip.members);
  const currentUserId = 'user-1'; // Simulated current user

  const copyInviteCode = () => {
    navigator.clipboard.writeText(sampleGroupTrip.inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const toggleVote = (destId: string) => {
    setUserVotes(prev => {
      const next = new Set(prev);
      if (next.has(destId)) {
        next.delete(destId);
      } else {
        next.add(destId);
      }
      return next;
    });
  };

  const confirmedMembers = sampleGroupTrip.members.filter(m => m.confirmed).length;
  const totalMembers = sampleGroupTrip.members.length;
  const budgetProgress = (sampleGroupTrip.budget.collected / sampleGroupTrip.budget.total) * 100;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <div className="relative h-72 overflow-hidden">
        <img 
          src={sampleGroupTrip.coverImage} 
          alt={sampleGroupTrip.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        
        <div className="absolute inset-0 flex flex-col justify-end p-8">
          <div className="max-w-7xl mx-auto w-full">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <Badge className="bg-indigo-500/80 text-white border-0 mb-3 backdrop-blur-sm">
                  <Users className="h-3 w-3 mr-1" />
                  Group Trip • {totalMembers} travelers
                </Badge>
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
                  {sampleGroupTrip.name}
                </h1>
                <div className="flex items-center gap-4 text-white/80">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>{sampleGroupTrip.destination}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{sampleGroupTrip.dates}</span>
                  </div>
                </div>
              </div>

              {/* Member Avatars */}
              <div className="flex items-center gap-3">
                <div className="flex -space-x-3">
                  {sampleGroupTrip.members.slice(0, 4).map(member => (
                    <Avatar key={member.id} className="border-2 border-white h-10 w-10">
                      <AvatarImage src={member.avatar ?? ''} alt={member.name} />
                      <AvatarFallback className="bg-indigo-500 text-white text-sm">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {sampleGroupTrip.members.length > 4 && (
                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white flex items-center justify-center">
                      <span className="text-white text-sm font-medium">+{sampleGroupTrip.members.length - 4}</span>
                    </div>
                  )}
                </div>
                <Button className="bg-white/20 backdrop-blur-sm text-white border-0 hover:bg-white/30">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Trip
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-white shadow-md border-0 p-1 h-auto">
            <TabsTrigger value="overview" className="px-6 py-3">
              <Sparkles className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="voting" className="px-6 py-3">
              <Vote className="h-4 w-4 mr-2" />
              Voting
            </TabsTrigger>
            <TabsTrigger value="expenses" className="px-6 py-3">
              <Calculator className="h-4 w-4 mr-2" />
              Expenses
            </TabsTrigger>
            <TabsTrigger value="members" className="px-6 py-3">
              <Users className="h-4 w-4 mr-2" />
              Members
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Budget Card */}
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-slate-800">Trip Budget</h3>
                    <DollarSign className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div className="text-3xl font-bold text-slate-800 mb-1">
                    ${sampleGroupTrip.budget.collected.toLocaleString()}
                  </div>
                  <div className="text-sm text-slate-500 mb-4">
                    of ${sampleGroupTrip.budget.total.toLocaleString()} collected
                  </div>
                  <Progress value={budgetProgress} className="h-2 mb-2" />
                  <div className="text-sm text-slate-600">
                    ${sampleGroupTrip.budget.perPerson.toLocaleString()} per person
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
                    {sampleGroupTrip.members.map(member => (
                      <div
                        key={member.id}
                        className={cn(
                          "w-3 h-3 rounded-full",
                          member.confirmed ? "bg-emerald-500" : "bg-amber-400"
                        )}
                        title={`${member.name}: ${member.confirmed ? 'Confirmed' : 'Pending'}`}
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
                      <code className="text-lg font-mono font-bold flex-1">{sampleGroupTrip.inviteCode}</code>
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
                  <Button className="w-full bg-white text-indigo-600 hover:bg-slate-100">
                    <Mail className="h-4 w-4 mr-2" />
                    Send Invite
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: Vote, label: 'Vote on Destinations', href: '#voting', color: 'bg-indigo-500' },
                { icon: Calculator, label: 'Split Expenses', href: '#expenses', color: 'bg-emerald-500' },
                { icon: MessageSquare, label: 'Group Chat', href: '/messages', color: 'bg-purple-500' },
                { icon: Calendar, label: 'Plan Itinerary', href: '/itinerary', color: 'bg-amber-500' },
              ].map((action) => {
                const Icon = action.icon;
                return (
                  <Card key={action.label} className="border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
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
          </TabsContent>

          {/* Voting Tab */}
          <TabsContent value="voting" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Destination Voting</h2>
                <p className="text-slate-500">Vote for your preferred destinations</p>
              </div>
              <Button className="bg-gradient-to-r from-indigo-600 to-purple-600">
                <Plus className="h-4 w-4 mr-2" />
                Propose Destination
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {destinationOptions.map((dest) => {
                const voteCount = dest.votes.length;
                const hasVoted = userVotes.has(dest.id);
                const isWinning = voteCount === Math.max(...destinationOptions.map(d => d.votes.length));

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
                        <p className="text-sm text-white/80">{dest.priceEstimate}</p>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-2">
                            {dest.votes.slice(0, 3).map((voterId, idx) => {
                              const voter = sampleGroupTrip.members.find(m => m.id === voterId);
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
                        <span className="text-xs text-slate-500">by {dest.proposedBy}</span>
                      </div>
                      <Button 
                        className={cn(
                          "w-full",
                          hasVoted 
                            ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200" 
                            : "bg-gradient-to-r from-indigo-600 to-purple-600"
                        )}
                        onClick={() => toggleVote(dest.id)}
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
                    </CardContent>
                  </Card>
                );
              })}
            </div>
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
                {expensesData.map(expense => {
                  const Icon = categoryIcons[expense.category] || Ticket;
                  const payer = sampleGroupTrip.members.find(m => m.id === expense.paidBy);
                  const perPerson = expense.amount / expense.splitAmong.length;

                  return (
                    <Card key={expense.id} className="border-0 shadow-lg">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center",
                            expense.category === 'flights' ? 'bg-blue-100 text-blue-600' :
                            expense.category === 'accommodation' ? 'bg-purple-100 text-purple-600' :
                            'bg-emerald-100 text-emerald-600'
                          )}>
                            <Icon className="h-6 w-6" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-slate-800">{expense.description}</h4>
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                              <span>Paid by {payer?.name}</span>
                              <span>•</span>
                              <span>{new Date(expense.date).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-slate-800">${expense.amount.toLocaleString()}</div>
                            <div className="text-sm text-slate-500">${perPerson.toFixed(0)}/person</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
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
                  {sampleGroupTrip.members.map(member => {
                    const balance = balances[member.id] || 0;
                    const isPositive = balance > 0;
                    
                    return (
                      <div key={member.id} className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.avatar ?? ''} alt={member.name} />
                          <AvatarFallback className="bg-indigo-100 text-indigo-600">
                            {member.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium text-slate-800">{member.name}</p>
                          <p className={cn(
                            "text-sm",
                            isPositive ? "text-emerald-600" : balance < 0 ? "text-red-600" : "text-slate-500"
                          )}>
                            {isPositive ? `Gets back $${balance.toFixed(0)}` :
                             balance < 0 ? `Owes $${Math.abs(balance).toFixed(0)}` :
                             'Settled up'}
                          </p>
                        </div>
                        {balance !== 0 && (
                          <Badge className={cn(
                            isPositive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                          )}>
                            {isPositive ? '+' : ''}{balance > 0 ? '+' : ''}${balance.toFixed(0)}
                          </Badge>
                        )}
                      </div>
                    );
                  })}

                  <div className="pt-4 border-t border-slate-200">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Total Expenses</span>
                      <span className="font-bold text-slate-800">
                        ${expensesData.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <Button className="w-full bg-gradient-to-r from-emerald-500 to-teal-500">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Settle Up
                  </Button>
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
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-white rounded-lg shadow-md p-2">
                  <Input
                    placeholder="Email address"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="border-0 focus-visible:ring-0 w-64"
                  />
                  <Button className="bg-gradient-to-r from-indigo-600 to-purple-600">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sampleGroupTrip.members.map(member => (
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
                          </div>
                          <Badge className={cn(
                            "mt-1",
                            member.confirmed 
                              ? "bg-emerald-100 text-emerald-700" 
                              : "bg-amber-100 text-amber-700"
                          )}>
                            {member.confirmed ? (
                              <>
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Confirmed
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Pending
                              </>
                            )}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Contribution</span>
                        <span className="font-medium text-slate-800">
                          ${(sampleGroupTrip.budget.perPerson * (member.confirmed ? 1 : 0)).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Balance</span>
                        <span className={cn(
                          "font-medium",
                          (balances[member.id] || 0) >= 0 ? "text-emerald-600" : "text-red-600"
                        )}>
                          {(balances[member.id] || 0) >= 0 ? '+' : ''}${(balances[member.id] || 0).toFixed(0)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                      <Button variant="outline" size="sm" className="flex-1">
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Message
                      </Button>
                      {member.id !== currentUserId && (
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Add Member Card */}
              <Card className="border-2 border-dashed border-slate-200 shadow-none hover:border-indigo-300 hover:bg-slate-50 transition-all cursor-pointer">
                <CardContent className="p-6 flex flex-col items-center justify-center h-full min-h-[240px]">
                  <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
                    <UserPlus className="h-8 w-8 text-indigo-600" />
                  </div>
                  <h3 className="font-semibold text-slate-800 mb-1">Invite Someone</h3>
                  <p className="text-sm text-slate-500 text-center">
                    Share the invite code: <code className="bg-slate-100 px-2 py-0.5 rounded font-mono">{sampleGroupTrip.inviteCode}</code>
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
    </div>
  );
}
