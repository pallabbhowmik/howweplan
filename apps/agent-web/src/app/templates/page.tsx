'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus } from 'lucide-react';
import { TemplateList } from '@/components/templates';
import { ItineraryTemplate } from '@/lib/data/templates';

export default function TemplatesPage() {
  const router = useRouter();
  const [selectedTemplate, setSelectedTemplate] = useState<ItineraryTemplate | null>(null);

  const handleSelect = (template: ItineraryTemplate) => {
    setSelectedTemplate(template);
    // Navigate to edit page or show details
    router.push(`/templates/${template.id}`);
  };

  const handleCreateNew = () => {
    router.push('/templates/new');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Itinerary Templates</h1>
                <p className="text-sm text-gray-500">Reusable templates for faster itinerary creation</p>
              </div>
            </div>
            <button
              onClick={handleCreateNew}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              New Template
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <TemplateList 
          onSelect={handleSelect}
          onCreateNew={handleCreateNew}
        />
      </div>
    </div>
  );
}
