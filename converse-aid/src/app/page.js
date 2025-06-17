'use client'
import Image from 'next/image';
import logo from '../../public/logo.png';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="flex flex-col items-center w-full">
        {/* Hero Section */}
        <section className="w-full flex flex-col items-center justify-center py-20 text-center">
          <div className="max-w-2xl mx-auto">
            <div className="flex justify-center mb-6">
              <Image src={logo} alt="Converse-Aid Logo" width={72} height={72} />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Empower Your Team with Targeted AI Agents</h1>
            <p className="text-lg md:text-xl text-gray-600 mb-8">More control, more security, and seamless human intervention for complex questions. Converse-Aid gives you the power to manage AI agents like never before.</p>
            <a href="/signup" className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-semibold px-8 py-3 rounded-lg shadow transition-all text-lg">Try for Free</a>
          </div>
        </section>

        {/* Features Section */}
        <section className="w-full max-w-5xl mx-auto py-16 grid md:grid-cols-3 gap-8">
          <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center text-center border-t-4 border-blue-500">
            <h3 className="font-semibold text-xl mb-2 text-blue-500">Total Control</h3>
            <p className="text-gray-600">Set response intervals, control knowledgebase, and manage members for each agent. No risk of replying to the wrong thread or person.</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center text-center border-t-4 border-blue-500">
            <h3 className="font-semibold text-xl mb-2 text-blue-500">Human-in-the-Loop</h3>
            <p className="text-gray-600">Easily intervene for complex questions. Start the conversation and even reply through Gmail app and the agent will continue seamlessly.</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center text-center border-t-4 border-blue-500">
            <h3 className="font-semibold text-xl mb-2 text-blue-500">Knowledgebase-Driven</h3>
            <p className="text-gray-600">Agents only respond based on your curated knowledgebase, ensuring accuracy and compliance every time.</p>
          </div>
        </section>

        {/* Testimonial Section */}
        <section className="w-full max-w-4xl mx-auto py-16">
          <h2 className="text-2xl font-bold text-center mb-8">What Our Users Say</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <p className="text-gray-600 italic">&quot;Converse-Aid gives us more control than any other platform we&apos;ve tried!&quot;</p>
              <div className="mt-4 text-blue-500 font-semibold">- Placeholder User</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <p className="text-gray-600 italic">&quot;The human-in-the-loop feature is a game changer for our support team.&quot;</p>
              <div className="mt-4 text-blue-500 font-semibold">- Placeholder User</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <p className="text-gray-600 italic">&quot;Seamless integration with Gmail makes our workflow effortless.&quot;</p>
              <div className="mt-4 text-blue-500 font-semibold">- Placeholder User</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
