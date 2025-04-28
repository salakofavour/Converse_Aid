'use client'
import Link from 'next/link';
import { useState } from 'react';

export default function Home() {
  const [contact, setContact] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleContactChange = (e) => {
    setContact({ ...contact, [e.target.name]: e.target.value });
  };

  const handleContactSubmit = (e) => {
    e.preventDefault();
    if (!contact.name || !contact.email || !contact.message) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setSubmitted(true);
    // Here you would send the form data to your backend or email service
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <span className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#3b82f6] to-blue-300 tracking-tight">Converse-Aid</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/signin" className="btn btn-outline-primary">
              Sign In
            </Link>
            <Link href="/signup" className="btn btn-primary">
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 md:py-32 bg-gradient-to-b from-[#3b82f6]/10 to-white">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center">
          <div className="md:w-1/2 mb-10 md:mb-0">
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6 leading-tight">
              Conversational AI Agents for Any Industry
            </h1>
            <p className="text-lg text-gray-600 mb-8 max-w-lg">
              Create AI-powered Agents ("Jobs") to automate, personalize, and scale your communication—whether for sales, support, recruiting, or any workflow that needs a human touch, all via Gmail.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/signup" className="btn btn-primary btn-lg bg-gradient-to-r from-[#3b82f6] to-blue-400 border-0 shadow-lg">
                Try Converse-Aid Free
              </Link>
              <a href="#how-it-works" className="btn btn-outline-primary btn-lg">
                See How It Works
              </a>
            </div>
          </div>
          <div className="md:w-1/2 flex justify-center">
            <div className="relative w-full max-w-lg h-80 md:h-96 flex items-center justify-center">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tr from-[#3b82f6]/30 to-blue-200/30 rounded-lg blur-xl"></div>
              <div className="relative z-10 bg-white shadow-xl rounded-lg p-8 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#3b82f6] to-blue-400 flex items-center justify-center mb-4">
                  <span className="text-white text-3xl font-bold">AI</span>
                </div>
                <div className="text-lg font-semibold text-gray-700 mb-2">Your Agent</div>
                <div className="w-64 h-8 bg-gray-100 rounded mb-2"></div>
                <div className="w-48 h-4 bg-gray-100 rounded mb-1"></div>
                <div className="w-56 h-4 bg-gray-100 rounded mb-1"></div>
                <div className="w-40 h-4 bg-gray-100 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Why Converse-Aid?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-blue-50 p-6 rounded-lg shadow-custom">
              <div className="w-12 h-12 bg-gradient-to-br from-[#3b82f6] to-blue-400 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 01-8 0" />
                  <circle cx="12" cy="12" r="10" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">AI-Powered Gmail Conversations</h3>
              <p className="text-gray-600">
                Let your Agents handle repetitive emails, follow-ups, and smart replies—directly in your Gmail threads.
              </p>
            </div>
            {/* Feature 2 */}
            <div className="bg-blue-50 p-6 rounded-lg shadow-custom">
              <div className="w-12 h-12 bg-gradient-to-br from-[#3b82f6] to-blue-400 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" />
                  <circle cx="12" cy="12" r="10" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Create Custom Agents ("Jobs")</h3>
              <p className="text-gray-600">
                Spin up an Agent for any workflow—sales, support, recruiting, or more. Each "Job" is a unique AI instance tailored to your needs.
              </p>
            </div>
            {/* Feature 3 */}
            <div className="bg-blue-50 p-6 rounded-lg shadow-custom">
              <div className="w-12 h-12 bg-gradient-to-br from-[#3b82f6] to-blue-400 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6" />
                  <circle cx="12" cy="12" r="10" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Automated Analytics & Insights</h3>
              <p className="text-gray-600">
                Track conversations, measure engagement, and optimize your outreach with built-in analytics.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16 bg-gradient-to-b from-white to-blue-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 bg-gradient-to-br from-[#3b82f6] to-blue-400 rounded-full flex items-center justify-center mb-4 text-white text-2xl font-bold">1</div>
              <h4 className="font-semibold mb-2">Connect Gmail</h4>
              <p className="text-gray-600 text-center">Securely link your Gmail account in seconds.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 bg-gradient-to-br from-[#3b82f6] to-blue-400 rounded-full flex items-center justify-center mb-4 text-white text-2xl font-bold">2</div>
              <h4 className="font-semibold mb-2">Create an Agent</h4>
              <p className="text-gray-600 text-center">Set up a "Job"—an AI Agent for your workflow or use case.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 bg-gradient-to-br from-[#3b82f6] to-blue-400 rounded-full flex items-center justify-center mb-4 text-white text-2xl font-bold">3</div>
              <h4 className="font-semibold mb-2">Start Conversations</h4>
              <p className="text-gray-600 text-center">Let your Agent send, reply, and manage conversations automatically.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 bg-gradient-to-br from-[#3b82f6] to-blue-400 rounded-full flex items-center justify-center mb-4 text-white text-2xl font-bold">4</div>
              <h4 className="font-semibold mb-2">Track & Optimize</h4>
              <p className="text-gray-600 text-center">See analytics, tweak your Agent, and scale your results.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-[#3b82f6] to-blue-400 text-white text-center">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-6">Ready to Supercharge Your Conversations?</h2>
          <p className="text-lg mb-8 max-w-2xl mx-auto">
            Start for free and see how easy it is to automate, personalize, and scale your communication with Converse-Aid.
          </p>
          <Link href="/signup" className="btn btn-white btn-lg text-[#3b82f6] font-bold shadow-lg">
            Get Started for Free
          </Link>
        </div>
      </section>

      {/* Contact Us Section */}
      <section className="py-16 bg-white" id="contact">
        <div className="container mx-auto px-4 max-w-2xl">
          <h2 className="text-3xl font-bold text-center mb-8">Contact Us</h2>
          {submitted ? (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-center">
              Thank you for reaching out! We'll get back to you soon.
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleContactSubmit}>
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={contact.name}
                  onChange={handleContactChange}
                  className="form-input mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#3b82f6] focus:ring focus:ring-[#3b82f6]/30 focus:ring-opacity-50"
                  required
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={contact.email}
                  onChange={handleContactChange}
                  className="form-input mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#3b82f6] focus:ring focus:ring-[#3b82f6]/30 focus:ring-opacity-50"
                  required
                />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700">Message</label>
                <textarea
                  id="message"
                  name="message"
                  rows={4}
                  value={contact.message}
                  onChange={handleContactChange}
                  className="form-textarea mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#3b82f6] focus:ring focus:ring-[#3b82f6]/30 focus:ring-opacity-50"
                  required
                ></textarea>
              </div>
              {error && <div className="text-red-500 text-sm">{error}</div>}
              <button
                type="submit"
                className="btn btn-primary bg-gradient-to-r from-[#3b82f6] to-blue-400 border-0 text-white font-bold btn-lg w-full shadow-lg hover:scale-105 transition-transform"
              >
                Send Message
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-8 border-t border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <span className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#3b82f6] to-blue-300 tracking-tight">Converse-Aid</span>
              <p className="text-sm text-gray-600 mt-1">
                © {new Date().getFullYear()} Converse-Aid. All rights reserved.
              </p>
              <p className="text-xs text-gray-400 mt-1 max-w-xs">
                Converse-Aid is a conversational AI platform for any industry. Create AI Agents ("Jobs") to automate and personalize your communication via Gmail.
              </p>
            </div>
            <div className="flex space-x-6">
              <a href="#contact" className="text-gray-600 hover:text-[#3b82f6]">
                Contact Us
              </a>
              <a href="#" className="text-gray-600 hover:text-[#3b82f6]">
                Privacy Policy
              </a>
              <a href="#" className="text-gray-600 hover:text-[#3b82f6]">
                Terms of Service
              </a>
              <a href="https://twitter.com/" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-[#3b82f6]">
                <span className="sr-only">Twitter</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557a9.93 9.93 0 01-2.828.775 4.932 4.932 0 002.165-2.724c-.951.564-2.005.974-3.127 1.195A4.92 4.92 0 0016.616 3c-2.73 0-4.942 2.21-4.942 4.932 0 .386.045.762.127 1.124C7.728 8.807 4.1 6.884 1.671 3.965c-.423.722-.666 1.561-.666 2.475 0 1.708.87 3.216 2.188 4.099a4.904 4.904 0 01-2.237-.616c-.054 2.281 1.581 4.415 3.949 4.89a4.936 4.936 0 01-2.224.084c.627 1.956 2.444 3.377 4.6 3.417A9.867 9.867 0 010 21.543a13.94 13.94 0 007.548 2.209c9.057 0 14.009-7.496 14.009-13.986 0-.213-.005-.425-.014-.636A9.936 9.936 0 0024 4.557z"/></svg>
              </a>
              <a href="https://linkedin.com/" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-[#3b82f6]">
                <span className="sr-only">LinkedIn</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.76 0-5 2.24-5 5v14c0 2.76 2.24 5 5 5h14c2.76 0 5-2.24 5-5v-14c0-2.76-2.24-5-5-5zm-11 19h-3v-9h3v9zm-1.5-10.29c-.966 0-1.75-.79-1.75-1.75s.784-1.75 1.75-1.75 1.75.79 1.75 1.75-.784 1.75-1.75 1.75zm13.5 10.29h-3v-4.5c0-1.08-.02-2.47-1.5-2.47-1.5 0-1.73 1.17-1.73 2.38v4.59h-3v-9h2.89v1.23h.04c.4-.76 1.38-1.56 2.84-1.56 3.04 0 3.6 2 3.6 4.59v4.74z"/></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
