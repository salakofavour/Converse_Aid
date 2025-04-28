import { Modal } from 'react-bootstrap';
//this is the modal that pops up when the user tries to cancel their subscription
export function CancellationWarningModal({ isOpen, onClose, onConfirm, jobCount }) {
  const jobsOverLimit = jobCount - 5;

  return (
    <Modal 
      show={isOpen} 
      onHide={onClose} 
      centered
      onEscapeKeyDown={onClose}
    >
      <Modal.Header closeButton>
        <Modal.Title>Warning: Job Limit</Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        <div className="text-red-600 mb-4">
          ⚠️ Important: You currently have {jobCount} jobs.
        </div>
        
        <p className="text-gray-700 mb-4">
          Canceling your subscription will downgrade you to the free plan, which has a limit of 5 jobs.
          {jobsOverLimit > 0 && (
            <> Your {jobsOverLimit} most recent jobs exceeding this limit will be automatically deleted by the end of the day.</>
          )}
        </p>

        <p className="text-gray-700 mb-4">
          To prevent job loss:
          <ul className="list-disc ml-6 mt-2">
            <li>Delete specific jobs manually before canceling</li>
            <li>Or keep your subscription active</li>
          </ul>
        </p>

        <p className="text-sm text-gray-600 mb-4">
          Note: You can reactivate your subscription at any time before the end of the day to prevent job deletion.
        </p>

        <div className="flex justify-end space-x-4">
          <button 
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Keep Subscription
          </button>
          
          <button 
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Cancel Anyway
          </button>
        </div>
      </Modal.Body>
    </Modal>
  );
} 