'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SettingsModalContextType {
  isOpen: boolean;
  openModal: (section?: 'userInfo' | 'subscription' | 'paymentHistory' | 'voiceProfile' | 'preferences') => void;
  closeModal: () => void;
  initialSection?: 'userInfo' | 'subscription' | 'paymentHistory' | 'voiceProfile' | 'preferences';
}

const SettingsModalContext = createContext<SettingsModalContextType | undefined>(undefined);

export function SettingsModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialSection, setInitialSection] = useState<'userInfo' | 'subscription' | 'paymentHistory' | 'voiceProfile' | 'preferences' | undefined>(undefined);

  const openModal = (section?: 'userInfo' | 'subscription' | 'paymentHistory' | 'voiceProfile' | 'preferences') => {
    setInitialSection(section);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setInitialSection(undefined);
  };

  return (
    <SettingsModalContext.Provider value={{ isOpen, openModal, closeModal, initialSection }}>
      {children}
    </SettingsModalContext.Provider>
  );
}

export function useSettingsModal() {
  const context = useContext(SettingsModalContext);
  if (context === undefined) {
    throw new Error('useSettingsModal must be used within a SettingsModalProvider');
  }
  return context;
}


