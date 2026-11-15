import { useEffect, useRef } from 'react';

function LogoutModal({ isOpen, onCancel, onConfirm }) {
  const modalRef = useRef(null);
  const cancelButtonRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previouslyFocusedElement = document.activeElement;
    cancelButtonRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onCancel();
        return;
      }

      if (event.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll('button');
        if (!focusableElements?.length) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocusedElement?.focus();
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) onCancel();
  }

  return (
    <div className="modal-backdrop" onMouseDown={handleBackdropClick}>
      <section
        ref={modalRef}
        className="logout-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-modal-title"
        aria-describedby="logout-modal-description"
      >
        <div className="logout-modal-icon" aria-hidden="true">↗</div>
        <h2 id="logout-modal-title">Log out of InterviewPrep?</h2>
        <p id="logout-modal-description">
          Are you sure you want to log out? You can always sign back in.
        </p>
        <div className="logout-modal-actions">
          <button ref={cancelButtonRef} type="button" className="modal-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="modal-confirm" onClick={onConfirm}>
            Yes, log out
          </button>
        </div>
      </section>
    </div>
  );
}

export default LogoutModal;
