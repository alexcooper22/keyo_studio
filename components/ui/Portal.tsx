'use client';
import ReactDOM from 'react-dom';
import type { ReactNode } from 'react';

export default function Portal({ children }: { children: ReactNode }) {
  if (typeof window === 'undefined') return null;
  return ReactDOM.createPortal(children, document.body);
}
