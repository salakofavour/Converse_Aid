export default function About() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-4xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-custom p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">About Converse-Aid</h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-600 mb-6">
              Email Agents are too overreaching and usually too expensive for individuals and small businesses. 
              Converse-Aid is a solution to this problem. Instead of an agent that manages all your email, you can build an agent that only addresses a specific task, discussion, or issue with a specified list of members.
              Converse-Aid is also made to be easy to use, which is why it allows for the creation of agents in as little as 5 minutes.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mb-4">Example Use Cases:</h2>
            <ul className="space-y-4 mb-8">
              <li className="flex items-start">
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center mr-3 mt-1">
                  <span className="text-primary text-sm">1</span>
                </span>
                <div>
                  <h3 className="font-medium text-gray-900">University Teaching Assistants</h3>
                  <p className="text-gray-600">
                    Students can be listed as members & the curriculum & other semester details inputted as the knowledgebase. 
                    The agent addresses member&apos;s queries completely from the knowledgebase, reducing the questions professors & teaching assistants would have to address, allowing them to focus on other tasks.
                  </p>
                </div>
              </li>

              <li className="flex items-start">
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center mr-3 mt-1">
                  <span className="text-primary text-sm">2</span>
                </span>
                <div>
                  <h3 className="font-medium text-gray-900">Recruiting</h3>
                  <p className="text-gray-600">
                    Recruiting agents can be created for specific jobs. Potential candidates can be added as members, with the job qualification, 
                    requirement, benefits & other information provided as knowledgebase. The agent would maintain conversation with members to address 
                    any role related queries & gauge if they are interested in the role or not. This way recruiters can focus on other tasks instead of the repetitive questions 
                    several potential candidates would ask.
                  </p>
                </div>
              </li>

              <li className="flex items-start">
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center mr-3 mt-1">
                  <span className="text-primary text-sm">3</span>
                </span>
                <div>
                  <h3 className="font-medium text-gray-900">Customer Support & Sales</h3>
                  <p className="text-gray-600">
                    Customer support & sales agents can be created for specific products or services, allowing them to address customer queries more efficiently.
                  </p>
                </div>
              </li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mb-4">Ideal Use Cases for Converse-Aid agents are when:</h2>
            <ul className="space-y-4 mb-8">
              <li className="flex items-start">
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center mr-3 mt-1">
                  <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <p className="text-gray-600">The recipients (students, employees, clients, customers, etc.) are known</p>
              </li>

              <li className="flex items-start">
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center mr-3 mt-1">
                  <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <p className="text-gray-600">There is a knowledgebase the agent can use to create informed responses to queries</p>
              </li>

              <li className="flex items-start">
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center mr-3 mt-1">
                  <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <p className="text-gray-600">Better control over the agent is needed; the interval between responses, pausing, starting, and stopping the agent</p>
              </li>
            </ul>

            <div className="mt-12 text-center">
              <p className="text-lg font-medium text-primary">
                We want to provide agents that you can count on to be accurate, effective & specialized.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 