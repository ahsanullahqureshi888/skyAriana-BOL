import React from 'react';
import { useCmr } from './context/CmrContext';
import { LoginScreen } from './components/LoginScreen';
import { Header } from './components/Header';
import { CmrPad1 } from './components/CmrPad1';
import { CmrPad2 } from './components/CmrPad2';
import { CommercialInvoice } from './components/CommercialInvoice';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { ZoomControls } from './components/ZoomControls';
import { AutoFillModal } from './components/AutoFillModal';
import { SavedDocsModal } from './components/SavedDocsModal';
import { PartiesModal } from './components/PartiesModal';
import { ToastContainer } from './components/ToastContainer';
import { MobileQuickEditor } from './components/MobileQuickEditor';

export const App = () => {
  const { activePad, isAuthenticated } = useCmr();

  if (!isAuthenticated && typeof isAuthenticated !== 'undefined' && isAuthenticated === false) {
    return (
      <>
        <LoginScreen />
        <ToastContainer />
      </>
    );
  }

  return (
    <>
      <Header />
      {activePad === 4 ? (
        <main className="analytics-workspace">
          <AnalyticsDashboard />
        </main>
      ) : (
        <main className="workspace-canvas" id="workspaceCanvas">
          {activePad === 1 && <CmrPad1 />}
          {activePad === 2 && <CmrPad2 />}
          {activePad === 3 && <CommercialInvoice />}
        </main>
      )}
      {activePad !== 4 && <ZoomControls />}
      {activePad !== 4 && <MobileQuickEditor />}
      <AutoFillModal />
      <SavedDocsModal />
      <PartiesModal />
      <ToastContainer />
    </>
  );
};

