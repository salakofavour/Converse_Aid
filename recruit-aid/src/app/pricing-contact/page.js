'use client';
import Link from 'next/link';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export default function PricingContact() {
  const searchParams = useSearchParams();
  const section = searchParams.get('section');

  useEffect(() => {
    if (section) {
      const element = document.getElementById(section);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [section]);

  return (
    <div className="max-w-7xl mx-auto py-16 px-4">
      {/* Pricing Section */}
      <section id="pricing" className="mb-20">
        <h1 className="text-4xl font-bold text-center mb-12">Pricing Plans</h1>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white rounded-lg shadow-lg p-8 border-t-4 border-blue-500 transform transition-all hover:scale-105">
            <h2 className="text-2xl font-semibold mb-4 text-blue-500">Basic</h2>
            <p className="text-4xl font-bold mb-6">Free<span className="text-lg text-gray-500">/month</span></p>
            <ul className="space-y-4 mb-8">
              <li className="flex items-start">
                <svg className="w-6 h-6 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span className="text-gray-600">Up to 5 jobs</span>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span className="text-gray-600">Basic email templates</span>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span className="text-gray-600">Standard support</span>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span className="text-gray-600">Store knowledgebase and member information</span>
              </li>
            </ul>
            <Link href="/signup">
              <button className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors">
                Get Started
              </button>
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8 border-t-4 border-blue-500 transform transition-all hover:scale-105">
            <h2 className="text-2xl font-semibold mb-4 text-blue-500">Professional</h2>
            <p className="text-4xl font-bold mb-6">$40<span className="text-lg text-gray-500">/month</span></p>
            <ul className="space-y-4 mb-8">
              <li className="flex items-start">
                <svg className="w-6 h-6 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span className="text-gray-600">Everything in Basic</span>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span className="text-gray-600">Unlimited jobs</span>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span className="text-gray-600">Agent creation & management</span>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span className="text-gray-600">Priority support</span>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span className="text-gray-600">More features (coming soon)</span>
              </li>
            </ul>
            <Link href="/signup">
              <button className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors">
                Get Started
              </button>
            </Link>
          </div>

          <div className="bg-gray-100 rounded-lg shadow-lg p-8 border-t-4 border-gray-400 transform transition-all hover:scale-105 opacity-75">
            <h2 className="text-2xl font-semibold mb-4 text-gray-500">Professional (Coming Soon)</h2>
            {/* <p className="text-4xl font-bold mb-6 text-gray-500">$??<span className="text-lg text-gray-400">/month</span></p> */}
            <ul className="space-y-4 mb-8">
              <li className="flex items-start">
                <svg className="w-6 h-6 text-gray-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span className="text-gray-600">Current Professional</span>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-gray-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span className="text-gray-600">Unlimited jobs</span>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-gray-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span className="text-gray-600">Advanced customization</span>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-gray-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span className="text-gray-600">Dynamic pricing </span>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-gray-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span className="text-gray-600">Reporting and analytics</span>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-gray-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span className="text-gray-600">24/7 dedicated support</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="mb-20">
        <h1 className="text-4xl font-bold text-center mb-12">Contact Us</h1>
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center border-t-4 border-blue-500 transform transition-all hover:scale-105">
            <h2 className="text-lg font-semibold mb-2 text-blue-500">Sales</h2>
            <p className="text-gray-600 mb-2">sales@example.com</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center border-t-4 border-blue-500 transform transition-all hover:scale-105">
            <h2 className="text-lg font-semibold mb-2 text-blue-500">General Inquiries</h2>
            <p className="text-gray-600 mb-2">info@example.com</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center border-t-4 border-blue-500 transform transition-all hover:scale-105">
            <h2 className="text-lg font-semibold mb-2 text-blue-500">Phone</h2>
            <p className="text-gray-600 mb-2">+1 (863) 337-9535</p>
          </div>
        </div>
        <div className="text-center text-gray-500">We promise to reach back within 24 hours.</div>
      </section>
    </div>
  );
} 