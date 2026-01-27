import React, { useState, useEffect, useCallback } from 'react';
import { IncomeType, HeldItem } from './types.ts';
import { calculateHourlyRate, calculateTimeCost, generateICS, formatNumberWithCommas, stripNonNumeric } from './utils/helpers.ts';

const LOCAL_STORAGE_ITEMS_KEY = 'cost_in_hours_held_items';
const LOCAL_STORAGE_THEME_KEY = 'cost_in_hours_theme';

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

export default function App() {
  // Theme State
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_THEME_KEY);
    if (saved !== null) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Calculator States
  const [itemName, setItemName] = useState('');
  const [price, setPrice] = useState<string>('');
  const [income, setIncome] = useState<string>('');
  const [incomeType, setIncomeType] = useState<IncomeType>(IncomeType.MONTHLY);
  const [weeklyHours, setWeeklyHours] = useState<string>('40');
  const [showWorkHours, setShowWorkHours] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Interaction States
  const [result, setResult] = useState<number | null>(null);
  const [showDecision, setShowDecision] = useState(false);
  const [showWaitOptions, setShowWaitOptions] = useState(false);
  const [waitValue, setWaitValue] = useState<string>('');
  const [waitUnit, setWaitUnit] = useState<'days' | 'hours'>('days');
  const [waitDate, setWaitDate] = useState<string>('');

  // Privacy State
  const [showPrivacy, setShowPrivacy] = useState(false);

  // Persistence State
  const [heldItems, setHeldItems] = useState<HeldItem[]>([]);

  // Theme effect: Apply class to HTML element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem(LOCAL_STORAGE_THEME_KEY, darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Initialize from Local Storage
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_ITEMS_KEY);
    if (saved) {
      try {
        setHeldItems(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse local storage", e);
      }
    }
  }, []);

  const saveToLocalStorage = useCallback((items: HeldItem[]) => {
    localStorage.setItem(LOCAL_STORAGE_ITEMS_KEY, JSON.stringify(items));
    setHeldItems(items);
  }, []);

  const handleCalculate = () => {
    setErrorMsg(null);
    const rawPrice = stripNonNumeric(price);
    const rawIncome = stripNonNumeric(income);
    const rawHours = stripNonNumeric(weeklyHours);
    
    const p = parseFloat(rawPrice);
    const inc = parseFloat(rawIncome);
    const h = parseFloat(rawHours);
    
    if (!rawPrice || isNaN(p) || p <= 0) {
      setErrorMsg("Please enter a valid price.");
      return;
    }
    if (!rawIncome || isNaN(inc) || inc <= 0) {
      setErrorMsg("Please enter a valid income.");
      return;
    }
    if (!rawHours || isNaN(h) || h <= 0) {
      setErrorMsg("Please enter valid work hours.");
      if (!showWorkHours) setShowWorkHours(true);
      return;
    }

    const rate = calculateHourlyRate(inc, incomeType, h);
    const cost = calculateTimeCost(p, rate);
    setResult(cost);
    setShowDecision(true);
    setShowWaitOptions(false);
  };

  const handleSkip = () => resetCalculator();
  const handleBuy = () => resetCalculator();
  const handleWaitClick = () => setShowWaitOptions(true);

  const handleSaveWait = () => {
    if (result === null) return;
    setErrorMsg(null);

    let revisitTimestamp: number | undefined;
    if (waitValue) {
      const val = parseInt(waitValue);
      if (isNaN(val) || val <= 0) {
        setErrorMsg("Please enter a valid wait duration.");
        return;
      }
      const d = new Date();
      if (waitUnit === 'days') {
        d.setDate(d.getDate() + val);
      } else {
        d.setHours(d.getHours() + val);
      }
      revisitTimestamp = d.getTime();
    } else if (waitDate) {
      revisitTimestamp = new Date(waitDate).getTime();
      if (isNaN(revisitTimestamp) || revisitTimestamp <= Date.now()) {
        setErrorMsg("Please pick a future date.");
        return;
      }
    } else {
      setErrorMsg("Please specify how long you want to wait.");
      return;
    }

    const newItem: HeldItem = {
      id: generateId(),
      name: itemName || 'Unnamed Item',
      price: parseFloat(stripNonNumeric(price)),
      calculatedHours: result,
      revisitTimestamp,
      createdTimestamp: Date.now(),
    };

    const updated = [...heldItems, newItem];
    saveToLocalStorage(updated);
    resetCalculator();
  };

  const resetCalculator = () => {
    setItemName('');
    setPrice('');
    setResult(null);
    setErrorMsg(null);
    setShowDecision(false);
    setShowWaitOptions(false);
    setWaitValue('');
    setWaitDate('');
  };

  const openItem = (item: HeldItem) => {
    setItemName(item.name);
    setPrice(formatNumberWithCommas(item.price.toString()));
    setResult(item.calculatedHours);
    setErrorMsg(null);
    setShowDecision(true);
    setShowWaitOptions(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteItem = (id: string) => {
    const updated = heldItems.filter(i => i.id !== id);
    saveToLocalStorage(updated);
  };

  const toggleDarkMode = () => setDarkMode(!darkMode);

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = stripNonNumeric(e.target.value);
    setPrice(formatNumberWithCommas(rawValue));
    if (errorMsg) setErrorMsg(null);
  };

  const handleIncomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = stripNonNumeric(e.target.value);
    setIncome(formatNumberWithCommas(rawValue));
    if (errorMsg) setErrorMsg(null);
  };

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = stripNonNumeric(e.target.value);
    setWeeklyHours(rawValue);
    if (errorMsg) setErrorMsg(null);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 transition-colors duration-300 pb-[56px]">
      <main className="flex-1 max-w-xl mx-auto w-full px-6 pt-12">
        {/* Header */}
        <header className="mb-12 text-center relative">
          <button 
            onClick={toggleDarkMode}
            className="absolute right-0 top-0 p-2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:ring-2 hover:ring-slate-300 dark:hover:ring-slate-700 transition-all focus:outline-none"
            aria-label="Toggle dark mode"
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
          
          <h1 className="text-3xl font-light tracking-tight text-slate-900 dark:text-white mb-2" aria-label="Cost in Hours">🕓 Cost in Hours</h1>
          
          <h2 className="text-slate-500 dark:text-slate-400 text-lg mb-4">Is it worth buying this?</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto leading-relaxed mb-8">
            Convert a price into time to see what a purchase really costs you.
            No advice, no tracking — just a moment to pause and decide.
          </p>
        </header>

        {/* Calculator Section */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-slate-100 dark:border-slate-800 space-y-8 mb-12 transition-all">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Item</label>
              <input
                type="text"
                placeholder="What are you thinking of buying?"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-600 transition-all text-lg text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Price</label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={price}
                onChange={handlePriceChange}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-600 transition-all text-lg text-slate-900 dark:text-white"
              />
            </div>

            <div className="pt-2 border-t border-slate-50 dark:border-slate-800">
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-4">Your Income</label>
              <div className="flex gap-2 mb-4 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-full">
                {Object.values(IncomeType).map((type) => (
                  <button
                    key={type}
                    onClick={() => setIncomeType(type)}
                    className={`flex-1 py-1.5 text-sm rounded-md transition-all ${
                      incomeType === type 
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              <input
                type="text"
                inputMode="decimal"
                placeholder={`Your ${incomeType.toLowerCase()} income`}
                value={income}
                onChange={handleIncomeChange}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-600 transition-all text-lg text-slate-900 dark:text-white"
              />
            </div>

            <div className="border-t border-slate-50 dark:border-slate-800 pt-2">
              <button
                onClick={() => setShowWorkHours(!showWorkHours)}
                className="text-slate-500 dark:text-slate-400 text-sm font-medium flex items-center hover:text-slate-700 dark:hover:text-slate-200 focus:outline-none"
              >
                <span className={`mr-2 transition-transform ${showWorkHours ? 'rotate-90' : ''}`}>▶</span>
                Adjust weekly work hours
              </button>
              {showWorkHours && (
                <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={weeklyHours}
                    onChange={handleHoursChange}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 focus:outline-none text-sm text-slate-900 dark:text-white"
                  />
                </div>
              )}
            </div>

            {errorMsg && (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-lg p-3 text-sm text-red-600 dark:text-red-400">
                {errorMsg}
              </div>
            )}

            <button
              onClick={handleCalculate}
              className="w-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl py-4 font-medium text-lg hover:bg-slate-800 dark:hover:bg-white transition-colors shadow-sm active:scale-[0.98] transform"
            >
              Calculate time cost
            </button>
          </div>

          {result !== null && (
            <div className="pt-8 border-t border-slate-100 dark:border-slate-800 text-center animate-in zoom-in-95 duration-300">
              <div className="mb-8">
                <p className="text-slate-500 dark:text-slate-400 text-lg mb-1">This represents</p>
                <p className="text-5xl font-light text-slate-900 dark:text-white">
                  {result.toFixed(1)} <span className="text-2xl text-slate-400 dark:text-slate-600">hours</span>
                </p>
                <p className="text-slate-400 dark:text-slate-500 text-s mt-3 italic">Based on {weeklyHours} hours/week.</p>
              </div>

              {showDecision && !showWaitOptions && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 leading-relaxed">
                    After seeing the time cost, choose what feels right:
                  </p>
                  <ul className="text-slate-500 dark:text-slate-400 text-xs mb-4 space-y-1 text-left max-w-xs mx-auto">
                    <li>• <strong>Buy</strong> — you're comfortable with the trade</li>
                    <li>• <strong>Wait</strong> — revisit the decision later</li>
                    <li>• <strong>Skip</strong> — not worth it for you</li>
                  </ul>
                  <p className="text-slate-400 dark:text-slate-500 text-xs italic mb-4">
                    The tool does not recommend an option.
                  </p>
                  <p className="text-slate-400 dark:text-slate-500 text-xs italic">
                    Only items you choose to wait on will be saved.
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <button onClick={handleBuy} className="py-3 px-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300">Buy</button>
                    <button onClick={handleWaitClick} className="py-3 px-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300 font-medium">Wait</button>
                    <button onClick={handleSkip} className="py-3 px-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300">Skip</button>
                  </div>
                </div>
              )}

              {showWaitOptions && (
                <div className="space-y-6 text-left p-6 bg-slate-50 dark:bg-slate-800 rounded-xl animate-in fade-in slide-in-from-bottom-2">
                  <h3 className="font-medium text-slate-700 dark:text-slate-300">Choose how long to wait</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1.5">Wait for duration</label>
                      <div className="flex gap-2 items-stretch">
                        <input
                          type="number"
                          min="1"
                          placeholder="Amount"
                          value={waitValue}
                          onChange={(e) => {
                            setWaitValue(e.target.value);
                            setWaitDate('');
                            if (errorMsg) setErrorMsg(null);
                          }}
                          className="flex-grow min-w-0 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-4 py-2 focus:outline-none text-slate-900 dark:text-white"
                        />
                        <div className="relative group">
                          <select
                            value={waitUnit}
                            onChange={(e) => setWaitUnit(e.target.value as 'days' | 'hours')}
                            className="h-full bg-slate-100 dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-lg pl-4 pr-10 py-2 focus:outline-none appearance-none cursor-pointer text-sm font-medium transition-colors hover:bg-slate-200 dark:hover:bg-slate-500"
                          >
                            <option value="days">Days</option>
                            <option value="hours">Hours</option>
                          </select>
                          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-300">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="relative flex items-center py-2">
                      <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
                      <span className="flex-shrink mx-4 text-slate-300 dark:text-slate-600 text-[10px] uppercase tracking-widest">or</span>
                      <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1.5">Pick a specific date & time</label>
                      <input
                        type="datetime-local"
                        value={waitDate}
                        onChange={(e) => {
                          setWaitDate(e.target.value);
                          setWaitValue('');
                          if (errorMsg) setErrorMsg(null);
                        }}
                        className="w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-4 py-2 focus:outline-none text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-3 pt-2">
                    <div className="flex gap-2">
                      <button onClick={handleSaveWait} className="flex-1 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg py-3 font-medium hover:bg-slate-800 dark:hover:bg-white transition-colors">Save to list</button>
                      {(waitValue || waitDate) && (
                        <button
                          onClick={() => {
                            const date = waitDate ? new Date(waitDate) : new Date();
                            if (waitValue) {
                              const val = parseInt(waitValue);
                              if (!isNaN(val)) {
                                if (waitUnit === 'days') date.setDate(date.getDate() + val);
                                else date.setHours(date.getHours() + val);
                              }
                            }
                            generateICS(itemName, date);
                          }}
                          className="px-4 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-white dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300"
                        >
                          📅
                        </button>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setShowWaitOptions(false)} className="w-full text-slate-400 dark:text-slate-500 text-sm hover:text-slate-600 dark:hover:text-slate-300 py-1">Cancel</button>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="mb-12">
          <details className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <summary className="px-6 py-4 cursor-pointer text-slate-600 dark:text-slate-400 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              About this tool
            </summary>
            <div className="px-6 pb-6 pt-2 text-slate-500 dark:text-slate-400 text-sm leading-relaxed space-y-3 border-t border-slate-100 dark:border-slate-800">
              <p>
                Cost in Hours is a simple web tool that helps you think about purchases in terms of time, not just money.
              </p>
              <p>
                Instead of focusing only on price, the tool shows how many hours of work a purchase represents based on your income. For many people, seeing cost expressed as time makes trade-offs easier to understand.
              </p>
              <p>
                This tool does not tell you what you should buy or avoid. It does not track spending, set budgets, or judge decisions. It simply converts price into time and gives you space to decide.
              </p>
              <p>
                Only items you choose to wait on are stored, and they are saved locally on your device. There are no accounts, no analytics, and no notifications.
              </p>
              <p>
                Cost in Hours is designed to be calm and lightweight — a pause for reflection, not a financial system.
              </p>
            </div>
          </details>
        </section>

        {heldItems.length > 0 && (
          <section className="animate-in fade-in duration-700 mb-12">
            <div className="flex items-center justify-between mb-6 border-b border-slate-200 dark:border-slate-800 pb-2">
              <h2 className="text-xl font-light text-slate-700 dark:text-slate-300">Waiting items</h2>
              <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">{heldItems.length}</span>
            </div>
            <div className="space-y-3">
              {[...heldItems].sort((a,b) => (a.revisitTimestamp || Infinity) - (b.revisitTimestamp || Infinity)).map((item) => {
                const isReady = item.revisitTimestamp ? Date.now() >= item.revisitTimestamp : false;
                const revisitDate = item.revisitTimestamp ? new Date(item.revisitTimestamp) : null;
                return (
                  <div key={item.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-all group">
                    <div className="flex-1 min-w-0 mr-4">
                      <h3 className="font-medium text-slate-900 dark:text-slate-100 truncate">{item.name}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-slate-500 dark:text-slate-400 text-sm">{item.calculatedHours.toFixed(1)} hours</span>
                        {revisitDate && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${isReady ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                            {isReady ? 'Ready' : `Until ${revisitDate.toLocaleDateString()}`}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openItem(item)} className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700">Open</button>
                      <button onClick={() => deleteItem(item.id)} className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-500 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="mb-12 max-w-xl mx-auto px-6">
          <h3 className="text-xl font-light text-slate-700 dark:text-slate-300 mb-4">
            Is this purchase worth the time it costs?
          </h3>
          <div className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed space-y-3">
            <p>
              When deciding whether to buy something, it's easy to focus only on the price. But money is often earned by trading time and effort, which can make the true cost harder to see.
            </p>
            <p>
              Cost in Hours helps by translating a purchase price into time worked. An item that feels affordable at first may represent several hours — or days — of work. Seeing that time cost can naturally prompt reflection.
            </p>
            <p>
              Some people use this tool to pause before impulse purchases, compare options using time rather than money, or decide whether to buy now, wait, or skip. Others simply use it to gain clarity.
            </p>
            <p>
              There's no right or wrong outcome. The tool exists to create space, not pressure.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-xl mx-auto px-6 text-center text-slate-400 dark:text-slate-500 text-sm leading-relaxed">
          <p className="mb-2">All data is saved locally on your device.</p>
          <p className="mb-2 text-xs">Your data stays on your device. No accounts. No tracking.</p>
          
          <div className="inline-block text-left max-w-md mx-auto">
            <button 
              onClick={() => setShowPrivacy(!showPrivacy)}
              className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 underline underline-offset-4 transition-colors text-xs font-medium focus:outline-none"
            >
              Privacy
            </button>
            
            {showPrivacy && (
              <div className="mt-4 p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                <h4 className="font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">Privacy Policy</h4>
                <p>This app does not require an account and does not collect personal information.</p>
                <p>All items you enter are stored locally on your device only. They are never sent to a server and can be removed at any time by clearing your browser data.</p>
                <p>This site may display third-party advertisements (such as Google AdSense). These services may use cookies or similar technologies to show ads based on general browsing context, not on information from this app.</p>
                <p>This app does not use analytics or tracking tools.</p>
                <p>By using this site, you agree to this limited use of cookies for advertising purposes.</p>
              </div>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
