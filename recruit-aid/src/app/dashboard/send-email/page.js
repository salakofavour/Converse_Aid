'use client';

import { useState } from 'react';
import ContinueThread from './components/ContinueThread';
import NewMessage from './components/NewMessage';

export default function SendEmail() {
  const [activeTab, setActiveTab] = useState('new'); // 'new' or 'continue'

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold">Send Email</h1>

      {/* Tabs */}
      <div className="flex justify-center border-b border-gray-200">
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
  );
} 