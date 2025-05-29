
export default function About() {
  return (
    <div className="max-w-3xl mx-auto py-20 px-4 text-center">
      <h1 className="text-4xl font-bold mb-6">About Converse-Aid</h1>
      <p className="text-lg text-gray-600 mb-4">This is a placeholder About page. Here you can describe your company, mission, and team.</p>
      <p className="text-lg text-gray-600 mb-4">Email Agents are too overeaching and usually too expensive for individuals and small businesses. 
        Converse-Aid is a solution to this problem. Converse-Aid allows for the creation of agents that deals with specific tasks not an agent for your email as a whole.
        Example use cases:
        <ul className="list-disc list-inside text-gray-600 mb-4">
          <li>University Teaching assistants : Students shool email are listed as the members & the curiculum & other semester details as the knowledgebase and the agent 
            addresses members queries specifically from the knowledgebase, reducing the work TA's have to do and allowing them to focus on other tasks.
          </li>
          <li>Recruiting : Recruiting agents can be created for specific jobs, potential candidates can be added as members, with the job qualification, requirement, benefits & other information provided as knowledgebase.
            The agent would maintain conversation with members to gauge if they are interested in the role or not. This way recruiters can focus on other tasks insted of the repetitive questions several potential candidates would ask.
          </li>
          <li>Customer Support : Customer support agents can be created for specific products or services.  allowing them to address customer queries more efficiently.
          </li>
          <li>Sales : Sales agents can be created for specific products or services.  allowing them to address customer queries more efficiently.
          </li>
        </ul>
         </p>
         <p className="text-lg text-gray-600 mb-4">The usecases for Converse-Aid are situations where the 
          <ul className="list-disc list-inside text-gray-600 mb-4">
            <li>
              The members / recipients are known
            </li>
            <li>
              There is a knowledgebase the agent can make informed reponses to queries from.
            </li>
            <li>
              You want better control over the agent; the interval between responses, pausing, starting, and stopping the agent.
            </li>
          </ul>
         </p>
      <div className="mt-8 text-gray-400">We want you to use agents that you can count on for being accurate, effective & sectioned.</div>
    </div>
  );
} 