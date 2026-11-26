import { useState } from 'react';
import { todayTokyo } from './lib/date';
import InputTab from './tabs/InputTab';
import WeightTab from './tabs/WeightTab';
import SleepTab from './tabs/SleepTab';
import CalorieTab from './tabs/CalorieTab';
import CareTab from './tabs/CareTab';
import BeautyTab from './tabs/BeautyTab';
import Settings from './settings/Settings';

export type Tab = 'input' | 'weight' | 'calorie' | 'sleep' | 'beauty' | 'care';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'input', label: '入力', icon: 'M12 5v14M5 12h14' },
  { id: 'weight', label: '体重', icon: 'M4 18l5-6 4 3 7-9' },
  { id: 'calorie', label: 'カロリー', icon: 'M12 2c1 4 5 6 5 11a5 5 0 01-10 0c0-3 2-4 2-7 1.5 1 2 2.5 2 4 1-2 1-5 1-8z' },
  { id: 'sleep', label: '睡眠', icon: 'M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z' },
  { id: 'beauty', label: '美容', icon: 'M4 7h16M4 12h16M4 17h16M8 4v3M16 4v3' },
  { id: 'care', label: 'ケア', icon: 'M9 3h6v4l2 3v10a1 1 0 01-1 1H8a1 1 0 01-1-1V10l2-3zM9 7h6M10 14h4' },
];

const TITLE: Record<Tab, string> = { input: '入力する', weight: '体重', calorie: 'カロリー', sleep: '睡眠時間', beauty: '美容', care: 'ケア' };

export default function App() {
  const [tab, setTab] = useState<Tab>('input');
  const [inputDate, setInputDate] = useState(todayTokyo());
  const [settingsOpen, setSettingsOpen] = useState(false);

  const openInput = (date: string) => {
    setInputDate(date);
    setTab('input');
    window.scrollTo(0, 0);
  };

  if (settingsOpen) return <Settings onClose={() => setSettingsOpen(false)} />;

  return (
    <div className="mx-auto flex min-h-full max-w-lg flex-col">
      <header
        className="sticky top-0 z-10 flex items-center justify-center bg-white px-4 shadow-[0_1px_6px_rgba(120,60,70,0.06)]"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <h1 className="py-3.5 text-lg font-bold text-stone-700">{TITLE[tab]}</h1>
        <button
          aria-label="設定"
          onClick={() => setSettingsOpen(true)}
          className="absolute right-2 flex h-11 w-11 items-center justify-center text-stone-500"
          style={{ top: 'env(safe-area-inset-top)' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </button>
      </header>

      <main className="flex-1 px-4 pt-4" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
        {tab === 'input' && <InputTab date={inputDate} setDate={setInputDate} />}
        {tab === 'weight' && <WeightTab openInput={openInput} />}
        {tab === 'calorie' && <CalorieTab />}
        {tab === 'sleep' && <SleepTab openInput={openInput} />}
        {tab === 'beauty' && <BeautyTab openInput={openInput} />}
        {tab === 'care' && <CareTab />}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-10 bg-white shadow-[0_-1px_8px_rgba(120,60,70,0.08)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto flex max-w-lg">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                if (t.id === 'input' && tab !== 'input') setInputDate(todayTokyo());
                setTab(t.id);
                window.scrollTo(0, 0);
              }}
              className={`flex flex-1 flex-col items-center gap-1 pt-2.5 pb-2 text-[11px] ${tab === t.id ? 'font-bold text-brand-500' : 'text-stone-400'}`}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d={t.icon} />
              </svg>
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
