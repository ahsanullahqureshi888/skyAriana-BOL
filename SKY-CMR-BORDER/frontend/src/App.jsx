import React from 'react';
import { useCmr } from './context/CmrContext';
import { Header } from './components/Header';
import { CmrPad1 } from './components/CmrPad1';
import { CmrPad2 } from './components/CmrPad2';
import { CommercialInvoice } from './components/CommercialInvoice';
import { ZoomControls } from './components/ZoomControls';
import { AutoFillModal } from './components/AutoFillModal';
import { SavedDocsModal } from './components/SavedDocsModal';
import { ToastContainer } from './components/ToastContainer';
import { MobileQuickEditor } from './components/MobileQuickEditor';

export const App = () => {
  const { activePad } = useCmr();

  return (
    <>
      <Header />
      <main className="workspace-canvas" id="workspaceCanvas">
        {activePad === 1 && <CmrPad1 />}
        {activePad === 2 && <CmrPad2 />}
        {activePad === 3 && <CommercialInvoice />}
      </main>
      <ZoomControls />
      <MobileQuickEditor />
      <AutoFillModal />
      <SavedDocsModal />
      <ToastContainer />
    </>
  );
};

