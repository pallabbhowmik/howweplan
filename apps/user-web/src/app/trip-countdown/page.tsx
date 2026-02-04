'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  Plane,
  MapPin,
  Sun,
  CloudRain,
  Thermometer,
  Luggage,
  FileText,
  CreditCard,
  Pill,
  Camera,
  Shirt,
  Smartphone,
  Book,
  Briefcase,
  Shield,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  PartyPopper,
  AlertCircle,
  Bell,
  Settings,
  Share2,
  Download,
  Printer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

// Sample trip data
const sampleTrip = {
  id: 'trip-1',
  destination: 'Bali, Indonesia',
  departureDate: '2025-03-15',
  returnDate: '2025-03-25',
  coverImage: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800',
  weather: {
    temp: '28°C',
    condition: 'Partly Cloudy',
    humidity: '75%',
  },
  flight: {
    departure: {
      airline: 'Singapore Airlines',
      flightNo: 'SQ 946',
      from: 'SFO',
      to: 'DPS',
      time: '11:30 PM',
    },
    return: {
      airline: 'Singapore Airlines',
      flightNo: 'SQ 947',
      from: 'DPS',
      to: 'SFO',
      time: '8:45 AM',
    },
  },
  hotel: 'The Mulia Resort & Villas',
};

// Default checklist categories
const defaultChecklists: ChecklistCategory[] = [
  {
    id: 'documents',
    name: 'Documents',
    icon: 'FileText',
    color: 'bg-blue-500',
    items: [
      { id: 'd1', text: 'Passport (valid for 6+ months)', checked: false, priority: 'high' },
      { id: 'd2', text: 'Visa (if required)', checked: false, priority: 'high' },
      { id: 'd3', text: 'Flight tickets / boarding passes', checked: false, priority: 'high' },
      { id: 'd4', text: 'Hotel confirmations', checked: false, priority: 'high' },
      { id: 'd5', text: 'Travel insurance documents', checked: false, priority: 'high' },
      { id: 'd6', text: 'Emergency contact list', checked: false, priority: 'medium' },
      { id: 'd7', text: "Driver's license / International Driving Permit", checked: false, priority: 'low' },
      { id: 'd8', text: 'Copies of important documents', checked: false, priority: 'medium' },
    ],
  },
  {
    id: 'money',
    name: 'Money & Cards',
    icon: 'CreditCard',
    color: 'bg-emerald-500',
    items: [
      { id: 'm1', text: 'Credit/debit cards', checked: false, priority: 'high' },
      { id: 'm2', text: 'Local currency', checked: false, priority: 'medium' },
      { id: 'm3', text: 'Notify bank of travel dates', checked: false, priority: 'high' },
      { id: 'm4', text: 'Travel money card', checked: false, priority: 'low' },
      { id: 'm5', text: 'Small bills for tips', checked: false, priority: 'low' },
    ],
  },
  {
    id: 'health',
    name: 'Health & Medicine',
    icon: 'Pill',
    color: 'bg-red-500',
    items: [
      { id: 'h1', text: 'Prescription medications', checked: false, priority: 'high' },
      { id: 'h2', text: 'First aid kit', checked: false, priority: 'medium' },
      { id: 'h3', text: 'Sunscreen & insect repellent', checked: false, priority: 'medium' },
      { id: 'h4', text: 'Hand sanitizer & masks', checked: false, priority: 'medium' },
      { id: 'h5', text: 'Motion sickness medication', checked: false, priority: 'low' },
      { id: 'h6', text: 'Vaccination records', checked: false, priority: 'high' },
    ],
  },
  {
    id: 'clothing',
    name: 'Clothing',
    icon: 'Shirt',
    color: 'bg-purple-500',
    items: [
      { id: 'c1', text: 'Underwear & socks (7+ days)', checked: false, priority: 'high' },
      { id: 'c2', text: 'T-shirts / casual tops', checked: false, priority: 'high' },
      { id: 'c3', text: 'Pants / shorts', checked: false, priority: 'high' },
      { id: 'c4', text: 'Comfortable walking shoes', checked: false, priority: 'high' },
      { id: 'c5', text: 'Flip flops / sandals', checked: false, priority: 'medium' },
      { id: 'c6', text: 'Swimwear', checked: false, priority: 'medium' },
      { id: 'c7', text: 'Light jacket / sweater', checked: false, priority: 'medium' },
      { id: 'c8', text: 'Hat / sunglasses', checked: false, priority: 'medium' },
      { id: 'c9', text: 'Formal outfit (if needed)', checked: false, priority: 'low' },
    ],
  },
  {
    id: 'electronics',
    name: 'Electronics',
    icon: 'Smartphone',
    color: 'bg-amber-500',
    items: [
      { id: 'e1', text: 'Phone & charger', checked: false, priority: 'high' },
      { id: 'e2', text: 'Power bank', checked: false, priority: 'high' },
      { id: 'e3', text: 'Travel adapter', checked: false, priority: 'high' },
      { id: 'e4', text: 'Camera & accessories', checked: false, priority: 'medium' },
      { id: 'e5', text: 'Headphones / earbuds', checked: false, priority: 'medium' },
      { id: 'e6', text: 'Laptop / tablet', checked: false, priority: 'low' },
      { id: 'e7', text: 'E-reader', checked: false, priority: 'low' },
    ],
  },
  {
    id: 'toiletries',
    name: 'Toiletries',
    icon: 'Briefcase',
    color: 'bg-pink-500',
    items: [
      { id: 't1', text: 'Toothbrush & toothpaste', checked: false, priority: 'high' },
      { id: 't2', text: 'Shampoo & conditioner', checked: false, priority: 'medium' },
      { id: 't3', text: 'Deodorant', checked: false, priority: 'high' },
      { id: 't4', text: 'Razor & shaving cream', checked: false, priority: 'medium' },
      { id: 't5', text: 'Skincare products', checked: false, priority: 'medium' },
      { id: 't6', text: 'Makeup (if needed)', checked: false, priority: 'low' },
      { id: 't7', text: 'Hair styling products', checked: false, priority: 'low' },
    ],
  },
];

type ChecklistItem = {
  id: string;
  text: string;
  checked: boolean;
  priority: 'high' | 'medium' | 'low';
};

type ChecklistCategory = {
  id: string;
  name: string;
  icon: string;
  color: string;
  items: ChecklistItem[];
};

const iconMap: Record<string, typeof FileText> = {
  FileText,
  CreditCard,
  Pill,
  Shirt,
  Smartphone,
  Briefcase,
  Camera,
  Book,
};

function calculateDaysUntil(dateString: string): number {
  const targetDate = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);
  const diffTime = targetDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function TripCountdownPage() {
  const [checklists, setChecklists] = useState<ChecklistCategory[]>(defaultChecklists);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['documents']));
  const [newItemText, setNewItemText] = useState('');
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [showReminders, setShowReminders] = useState(false);
  
  const daysUntilTrip = calculateDaysUntil(sampleTrip.departureDate);
  const tripDuration = calculateDaysUntil(sampleTrip.returnDate) - daysUntil(sampleTrip.departureDate);
  
  // Calculate progress
  const totalItems = checklists.reduce((sum, cat) => sum + cat.items.length, 0);
  const checkedItems = checklists.reduce(
    (sum, cat) => sum + cat.items.filter(item => item.checked).length, 
    0
  );
  const progressPercent = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

  // Calculate high priority incomplete
  const highPriorityIncomplete = checklists.reduce(
    (sum, cat) => sum + cat.items.filter(item => !item.checked && item.priority === 'high').length,
    0
  );

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const toggleItem = (categoryId: string, itemId: string) => {
    setChecklists(prev => 
      prev.map(cat => 
        cat.id === categoryId 
          ? {
              ...cat,
              items: cat.items.map(item =>
                item.id === itemId ? { ...item, checked: !item.checked } : item
              ),
            }
          : cat
      )
    );
  };

  const addItem = (categoryId: string) => {
    if (!newItemText.trim()) return;
    
    setChecklists(prev =>
      prev.map(cat =>
        cat.id === categoryId
          ? {
              ...cat,
              items: [
                ...cat.items,
                {
                  id: `custom-${Date.now()}`,
                  text: newItemText.trim(),
                  checked: false,
                  priority: 'medium' as const,
                },
              ],
            }
          : cat
      )
    );
    setNewItemText('');
  };

  const deleteItem = (categoryId: string, itemId: string) => {
    setChecklists(prev =>
      prev.map(cat =>
        cat.id === categoryId
          ? { ...cat, items: cat.items.filter(item => item.id !== itemId) }
          : cat
      )
    );
  };

  function daysUntil(dateString: string): number {
    return calculateDaysUntil(dateString);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section with Countdown */}
      <div className="relative h-80 overflow-hidden">
        <img 
          src={sampleTrip.coverImage} 
          alt={sampleTrip.destination}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        
        <div className="absolute inset-0 flex flex-col justify-end p-8">
          <div className="max-w-7xl mx-auto w-full">
            <Badge className="bg-white/20 text-white border-0 mb-4 backdrop-blur-sm">
              <Plane className="h-3 w-3 mr-1" />
              Upcoming Trip
            </Badge>
            
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
                  {sampleTrip.destination}
                </h1>
                <div className="flex items-center gap-4 text-white/80">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(sampleTrip.departureDate)}</span>
                  </div>
                  <span>→</span>
                  <span>{formatDate(sampleTrip.returnDate)}</span>
                </div>
              </div>

              {/* Countdown Display */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                {daysUntilTrip > 0 ? (
                  <div className="text-center">
                    <div className="text-6xl font-bold text-white mb-1">{daysUntilTrip}</div>
                    <div className="text-white/80 text-sm uppercase tracking-wide">
                      Days Until Departure
                    </div>
                  </div>
                ) : daysUntilTrip === 0 ? (
                  <div className="text-center">
                    <PartyPopper className="h-12 w-12 text-amber-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">Today's the day!</div>
                    <div className="text-white/80 text-sm">Have an amazing trip!</div>
                  </div>
                ) : (
                  <div className="text-center">
                    <Sun className="h-12 w-12 text-amber-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">You're on your trip!</div>
                    <div className="text-white/80 text-sm">Enjoy your adventure</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Progress & Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Packing Progress */}
          <Card className="border-0 shadow-lg col-span-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Packing Progress</h2>
                  <p className="text-slate-500 text-sm">{checkedItems} of {totalItems} items packed</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Share2 className="h-4 w-4 mr-1" />
                    Share
                  </Button>
                  <Button variant="outline" size="sm">
                    <Printer className="h-4 w-4 mr-1" />
                    Print
                  </Button>
                </div>
              </div>
              
              <Progress value={progressPercent} className="h-4 mb-3" />
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">{progressPercent}% Complete</span>
                {progressPercent === 100 ? (
                  <Badge className="bg-emerald-100 text-emerald-700">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    All packed!
                  </Badge>
                ) : highPriorityIncomplete > 0 ? (
                  <Badge className="bg-amber-100 text-amber-700">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {highPriorityIncomplete} essential items remaining
                  </Badge>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {/* Weather Widget */}
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <Sun className="h-5 w-5 text-amber-500" />
                <h3 className="font-semibold text-slate-800">Weather Forecast</h3>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-4xl font-bold text-slate-800">{sampleTrip.weather.temp}</div>
                <div>
                  <p className="text-slate-600">{sampleTrip.weather.condition}</p>
                  <p className="text-sm text-slate-500">Humidity: {sampleTrip.weather.humidity}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Flight & Hotel Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Plane className="h-5 w-5 text-indigo-600" />
                Flight Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="text-xs">Outbound</Badge>
                  <span className="text-xs text-slate-500">{sampleTrip.flight.departure.flightNo}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-800">{sampleTrip.flight.departure.from}</div>
                    <div className="text-sm text-slate-500">{sampleTrip.flight.departure.time}</div>
                  </div>
                  <div className="flex-1 relative">
                    <div className="h-px bg-slate-300" />
                    <Plane className="h-4 w-4 text-indigo-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-50 rotate-90" />
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-800">{sampleTrip.flight.departure.to}</div>
                    <div className="text-sm text-slate-500">{sampleTrip.flight.departure.airline}</div>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="text-xs">Return</Badge>
                  <span className="text-xs text-slate-500">{sampleTrip.flight.return.flightNo}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-800">{sampleTrip.flight.return.from}</div>
                    <div className="text-sm text-slate-500">{sampleTrip.flight.return.time}</div>
                  </div>
                  <div className="flex-1 relative">
                    <div className="h-px bg-slate-300" />
                    <Plane className="h-4 w-4 text-indigo-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-50 rotate-90" />
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-800">{sampleTrip.flight.return.to}</div>
                    <div className="text-sm text-slate-500">{sampleTrip.flight.return.airline}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="h-5 w-5 text-indigo-600" />
                Accommodation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl">
                <h3 className="text-xl font-bold text-slate-800 mb-2">{sampleTrip.hotel}</h3>
                <div className="flex items-center gap-2 text-slate-600 mb-4">
                  <MapPin className="h-4 w-4" />
                  <span>{sampleTrip.destination}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Check-in:</span>
                    <span className="ml-2 font-medium">{formatDate(sampleTrip.departureDate)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Check-out:</span>
                    <span className="ml-2 font-medium">{formatDate(sampleTrip.returnDate)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Checklist Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Packing Checklist</h2>
              <p className="text-slate-500">Stay organized with this comprehensive travel checklist</p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant={showReminders ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setShowReminders(!showReminders)}
              >
                <Bell className="h-4 w-4 mr-1" />
                Reminders
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {checklists.map(category => {
              const Icon = iconMap[category.icon] || FileText;
              const isExpanded = expandedCategories.has(category.id);
              const categoryChecked = category.items.filter(i => i.checked).length;
              const categoryTotal = category.items.length;
              const categoryProgress = categoryTotal > 0 ? Math.round((categoryChecked / categoryTotal) * 100) : 0;

              return (
                <Card key={category.id} className="border-0 shadow-lg overflow-hidden">
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="w-full p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      category.color
                    )}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-slate-800">{category.name}</h3>
                        <span className="text-sm text-slate-500">{categoryChecked}/{categoryTotal}</span>
                      </div>
                      <Progress value={categoryProgress} className="h-1.5 mt-2" />
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-slate-400" />
                    )}
                  </button>

                  {isExpanded && (
                    <CardContent className="pt-0 pb-4 px-4">
                      <div className="space-y-2 mb-4">
                        {category.items.map(item => (
                          <div 
                            key={item.id}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-lg transition-all",
                              item.checked ? "bg-emerald-50" : "bg-slate-50 hover:bg-slate-100"
                            )}
                          >
                            <Checkbox
                              checked={item.checked}
                              onCheckedChange={() => toggleItem(category.id, item.id)}
                              className="h-5 w-5"
                            />
                            <span className={cn(
                              "flex-1 text-sm",
                              item.checked ? "text-slate-400 line-through" : "text-slate-700"
                            )}>
                              {item.text}
                            </span>
                            {!item.checked && item.priority === 'high' && (
                              <Badge className="bg-red-100 text-red-700 text-xs">Essential</Badge>
                            )}
                            <button
                              onClick={() => deleteItem(category.id, item.id)}
                              className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Add custom item..."
                          value={newItemText}
                          onChange={(e) => setNewItemText(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addItem(category.id)}
                          className="flex-1"
                        />
                        <Button 
                          size="sm" 
                          onClick={() => addItem(category.id)}
                          disabled={!newItemText.trim()}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </div>

        {/* Pre-Trip Reminders */}
        {showReminders && (
          <Card className="border-0 shadow-lg mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-indigo-600" />
                Pre-Trip Reminders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { days: 14, text: 'Check passport expiration date', done: true },
                  { days: 7, text: 'Confirm flight and hotel reservations', done: true },
                  { days: 5, text: 'Check in online for flights', done: false },
                  { days: 3, text: 'Notify bank of travel dates', done: false },
                  { days: 2, text: 'Download offline maps', done: false },
                  { days: 1, text: 'Charge all devices', done: false },
                  { days: 1, text: 'Set out-of-office email', done: false },
                ].map((reminder, idx) => (
                  <div 
                    key={idx}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-xl",
                      reminder.done ? "bg-emerald-50" : daysUntilTrip <= reminder.days ? "bg-amber-50" : "bg-slate-50"
                    )}
                  >
                    {reminder.done ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <Circle className="h-5 w-5 text-slate-400" />
                    )}
                    <div className="flex-1">
                      <p className={cn(
                        "font-medium",
                        reminder.done ? "text-emerald-700 line-through" : "text-slate-800"
                      )}>
                        {reminder.text}
                      </p>
                      <p className="text-sm text-slate-500">{reminder.days} days before departure</p>
                    </div>
                    {!reminder.done && daysUntilTrip <= reminder.days && (
                      <Badge className="bg-amber-100 text-amber-700">Due now</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* CTA */}
        <Card className="border-0 shadow-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Need Help Planning?</h2>
            <p className="text-white/80 mb-6">Our travel advisors can help you make the most of your trip</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/requests/new">
                <Button size="lg" className="bg-white text-indigo-600 hover:bg-slate-100">
                  <Sparkles className="h-5 w-5 mr-2" />
                  Get Trip Recommendations
                </Button>
              </Link>
              <Link href="/travel-advisors">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                  Find a Travel Advisor
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
