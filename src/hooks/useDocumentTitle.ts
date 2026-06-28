import { useEffect } from 'react';

export function useDocumentTitle(title: string): void {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `[N] ${title} · Nook` : 'Nook';
    return () => { document.title = prev; };
  }, [title]);
}
