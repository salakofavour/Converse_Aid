import { useRouter } from 'next/navigation';
import { Modal } from 'react-bootstrap';
//this is the modal that pops up when the user tries to create a 6th job while on the free plan
export function JobLimitModal({ isOpen, onClose }) {
  const router = useRouter();

  const handleUpgrade = () => {
    router.push('/dashboard/settings/subscription');
  };

  return (
    <Modal 
      show={isOpen} 
      onHide={onClose} 
      centered
      className="d-flex align-items-center justify-content-center"
      dialogClassName="my-0"
      onEscapeKeyDown={onClose}
    >
      <Modal.Header closeButton>
        <Modal.Title>Job Limit Reached</Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        <p className="text-gray-600 mb-4">
          You've reached the limit of 5 jobs on the free plan. 
          Upgrade to Pro to create unlimited jobs and access premium features.
        </p>

        <div className="space-y-4">
          <button 
            onClick={handleUpgrade}
            className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            Upgrade to Pro
          </button>
          
          <button 
            onClick={onClose}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Maybe Later
          </button>
        </div>
      </Modal.Body>
    </Modal>
  );
} 