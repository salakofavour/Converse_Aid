'use client';

import { useState } from 'react';
import ContinueThread from './components/ContinueThread';
import InitialMessage from './components/InitialMessage';
import NewMessage from './components/NewMessage';

export default function SendEmail() {
  const [activeTab, setActiveTab] = useState('new'); // 'new' or 'continue'

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <InitialMessage />

      {/* Tabs and Content Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-2xl text-center font-semibold mb-4">Send Email</h2>
        {/* Tabs */}
        <div className="flex justify-center border-b border-gray-200 mb-6">
          <div className="text-center px-8 py-2">
            <button
              onClick={() => setActiveTab('new')}
              className={`${
                activeTab === 'new'
                  ? 'text-primary font-medium'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              New Message
            </button>
            <span className="mx-3 text-gray-300">|</span>
            <button
              onClick={() => setActiveTab('continue')}
              className={`${
                activeTab === 'continue'
                  ? 'text-primary font-medium'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Continue Thread
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'new' ? <NewMessage /> : <ContinueThread />}
      </div>
    </div>
  );
} 