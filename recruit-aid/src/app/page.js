import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-primary">RecruitAid</h1>
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
      <section className="py-16 md:py-24 bg-gradient-to-b from-blue-50 to-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 mb-10 md:mb-0">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Streamline Your Recruitment Process
              </h1>
              <p className="text-lg text-gray-600 mb-8 max-w-lg">
                RecruitAid helps you manage your recruitment pipeline efficiently, 
                from job posting to candidate selection, all in one place.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/signup" className="btn btn-primary btn-lg">
                  Get Started
                </Link>
                <Link href="#features" className="btn btn-outline-primary btn-lg">
                  Learn More
                </Link>
              </div>
            </div>
            <div className="md:w-1/2 flex justify-center">
              <div className="relative w-full max-w-lg h-80 md:h-96">
                <div className="absolute top-0 left-0 w-full h-full bg-primary opacity-10 rounded-lg transform rotate-3"></div>
                <div className="absolute top-0 left-0 w-full h-full bg-white shadow-custom rounded-lg">
                  <div className="p-6">
                    <div className="h-8 bg-primary rounded-md mb-4"></div>
                    <div className="space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    </div>
                    <div className="mt-6 grid grid-cols-2 gap-4">
                      <div className="h-20 bg-blue-50 rounded"></div>
                      <div className="h-20 bg-blue-50 rounded"></div>
                      <div className="h-20 bg-blue-50 rounded"></div>
                      <div className="h-20 bg-blue-50 rounded"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-secondary p-6 rounded-lg shadow-custom">
              <div className="w-12 h-12 bg-primary-light rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Job Management</h3>
              <p className="text-gray-600">
                Create and manage job postings with customizable templates and application tracking.
              </p>
            </div>
            
            {/* Feature 2 */}
            <div className="bg-secondary p-6 rounded-lg shadow-custom">
              <div className="w-12 h-12 bg-primary-light rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Candidate Tracking</h3>
              <p className="text-gray-600">
                Track candidate progress through your recruitment pipeline with intuitive dashboards.
              </p>
            </div>
            
            {/* Feature 3 */}
            <div className="bg-secondary p-6 rounded-lg shadow-custom">
              <div className="w-12 h-12 bg-primary-light rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Analytics & Reporting</h3>
              <p className="text-gray-600">
                Gain insights into your recruitment process with detailed analytics and customizable reports.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary-light">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Transform Your Recruitment Process?</h2>
          <p className="text-lg mb-8 max-w-2xl mx-auto">
            Join thousands of recruiters who have streamlined their hiring process with RecruitAid.
          </p>
          <Link href="/signup" className="btn btn-primary btn-lg">
            Get Started for Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-8 border-t border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h2 className="text-xl font-bold text-primary">RecruitAid</h2>
              <p className="text-sm text-gray-600 mt-1">
                © {new Date().getFullYear()} RecruitAid. All rights reserved.
              </p>
            </div>
            <div className="flex space-x-6">
              <a href="#" className="text-gray-600 hover:text-primary">
                Privacy Policy
              </a>
              <a href="#" className="text-gray-600 hover:text-primary">
                Terms of Service
              </a>
              <a href="#" className="text-gray-600 hover:text-primary">
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
