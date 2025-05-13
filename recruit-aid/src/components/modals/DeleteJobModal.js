import { Modal } from 'react-bootstrap';

export function DeleteJobModal({ isOpen, onClose, onConfirm, jobTitle }) {
  return (
    <Modal 
      show={isOpen} 
      onHide={onClose} 
      centered
      onEscapeKeyDown={onClose}
    >
      <Modal.Header closeButton>
        <Modal.Title>Delete Job</Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        <p className="text-gray-600 mb-4">
          Are you sure you want to delete {jobTitle ? `"${jobTitle}"` : 'this job'}? This action cannot be undone.
        </p>

        <div className="space-y-4">
          <button 
            onClick={onConfirm}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Delete Job
          </button>
          
          <button 
            onClick={onClose}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </Modal.Body>
    </Modal>
  );
} 