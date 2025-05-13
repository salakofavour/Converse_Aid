'use client';

import { fetchWithCSRF } from '@/lib/fetchWithCSRF';
import Link from 'next/link';
import { useState } from 'react';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [acceptTerms, setAcceptTerms] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: '', text: '' });

    if (!acceptTerms) {
      setMessage({
        type: 'error',
        text: 'You must accept the Terms of Service and Privacy Policy.'
      });
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetchWithCSRF('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'An error occurred during sign up.');
      }
      
      setMessage({
        type: 'success',
        text: 'Check your email for the magic link to sign up and sign in!'
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'An error occurred during sign up.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <Link href="/" className="text-2xl font-bold text-primary">
            Converse-Aid
          </Link>
        </div>
      </nav>
      
      {/* Sign Up Form */}
      <div className="flex-grow flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-custom p-8 w-full max-w-md">
          <h2 className="text-2xl font-bold mb-6 text-center">Create Your Account</h2>
          
          {message.text && (
            <div className={`mb-4 p-3 rounded ${
              message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {message.text}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="email" className="block text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>
            
            <div className="mb-4">
              <div className="form-check">
                <input
                  id="acceptTerms"
                  type="checkbox"
                  className="form-check-input"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                />
                <label htmlFor="acceptTerms" className="form-check-label text-gray-600 ms-2">
                  I accept the <a href="#" className="text-primary hover:underline">Terms of Service</a> and <a href="#" className="text-primary hover:underline">Privacy Policy</a>
                </label>
              </div>
            </div>
            
            <button
              type="submit"
              className="btn btn-primary w-full mb-4"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>
          
          <div className="text-center mt-4">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link href="/signin" className="text-primary hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="bg-white py-4 border-t border-gray-200">
        <div className="container mx-auto px-4 text-center text-gray-600 text-sm">
          © {new Date().getFullYear()} Converse-Aid. All rights reserved.
        </div>
      </footer>
    </div>
  );
} 