import { useEffect, useRef } from 'react';

const modalStateKey = '__tatuappModal';

export function useModalHistory(isOpen: boolean, onClose: () => void, modalId: string) {
  const pushedRef = useRef(false);
  const closingFromPopRef = useRef(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (isOpen && !pushedRef.current) {
      window.history.pushState(
        {
          ...(window.history.state || {}),
          [modalStateKey]: modalId,
        },
        '',
        window.location.href
      );
      pushedRef.current = true;
      return;
    }

    if (!isOpen && pushedRef.current) {
      const currentModal = window.history.state?.[modalStateKey];
      pushedRef.current = false;

      if (!closingFromPopRef.current && currentModal === modalId) {
        window.history.back();
      }

      closingFromPopRef.current = false;
    }
  }, [isOpen, modalId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = (event: PopStateEvent) => {
      const nextModal = event.state?.[modalStateKey];
      if (!pushedRef.current || !isOpen || nextModal === modalId) return;

      closingFromPopRef.current = true;
      pushedRef.current = false;
      onCloseRef.current();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isOpen, modalId]);
}
