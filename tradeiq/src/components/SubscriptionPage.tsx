import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Zap, Shield, Star, Crown, CreditCard, Smartphone, ArrowRight, Loader2 } from 'lucide-react';

interface SubscriptionPageProps {
  onUpgrade: (plan: 'Pro' | 'Elite') => void;
  onDowngrade: () => void;
  currentPlan: 'Starter' | 'Pro' | 'Elite';
  isLoading?: boolean;
  userId: string;
  userEmail: string;
  userName?: string;
}

export default function SubscriptionPage({ onUpgrade, onDowngrade, currentPlan, isLoading, userId, userEmail, userName }: SubscriptionPageProps) {
  const [selectedPlan, setSelectedPlan] = useState<'Pro' | 'Elite' | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'mobile_money' | 'manual' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [mmProvider, setMmProvider] = useState('MTN Mobile Money');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Handle ZynlePay verification on return
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const reference = urlParams.get('reference');

    if (reference) {
      verifyPayment(reference);
    }
  }, []);

  const verifyPayment = async (reference: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/payment/zynlepay/verify?reference=${reference}`);
      const data = await response.json();
      if (data.status === 'success') {
        setSuccessMessage(`Successfully upgraded to ${data.plan}!`);
        onUpgrade(data.plan);
        // Clear URL params
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        setError(data.message || 'Payment verification failed.');
      }
    } catch (err) {
      setError('An error occurred during verification.');
    } finally {
      setIsProcessing(false);
    }
  };

  const plans = [
    {
      name: 'Starter',
      id: 'Starter',
      price: 'Free',
      description: 'Perfect for beginners starting their trading journey.',
      features: [
        '3 AI Analyses per day',
        'Basic Trading Journal',
        'Standard Market Insights',
        'Community Support',
        'Light Mode Experience'
      ],
      icon: Star,
      color: 'bg-slate-50 text-slate-400 border border-slate-100',
      buttonText: currentPlan === 'Starter' ? 'Current Plan' : 'Downgrade',
      isCurrent: currentPlan === 'Starter',
      onClick: onDowngrade
    },
    {
      name: 'Pro Trader',
      id: 'Pro',
      price: '$19.99',
      period: '/MONTH',
      description: 'Advanced tools for professional traders who want an edge.',
      features: [
        'Unlimited AI Analyses',
        'Advanced Journaling with Charts',
        'Priority Market Sentiment AI',
        'Institutional Order Flow Data',
        'Priority 24/7 Support',
        'Custom Risk Management Tools'
      ],
      icon: Zap,
      color: 'bg-slate-900 text-white shadow-xl shadow-slate-200',
      buttonText: currentPlan === 'Pro' ? 'Current Plan' : 'Upgrade to Pro',
      isCurrent: currentPlan === 'Pro',
      isPopular: true,
      onClick: () => setSelectedPlan('Pro')
    },
    {
      name: 'Elite Institutional',
      id: 'Elite',
      price: '$49.99',
      period: '/MONTH',
      description: 'The ultimate toolkit for serious institutional-grade trading.',
      features: [
        'Everything in Pro Plan',
        '1-on-1 AI Strategy Coaching',
        'Custom Indicator Development',
        'Direct API Access for Bots',
        'Exclusive Elite Community',
        'Early Access to New Features'
      ],
      icon: Crown,
      color: 'bg-emerald-600 text-white shadow-xl shadow-emerald-200',
      buttonText: currentPlan === 'Elite' ? 'Current Plan' : 'Upgrade to Elite',
      isCurrent: currentPlan === 'Elite',
      onClick: () => setSelectedPlan('Elite')
    }
  ];

  const handlePayment = async () => {
    if (!selectedPlan || !paymentMethod) return;
    
    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (paymentMethod === 'card') {
        const response = await fetch('/api/payment/zynlepay/initiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: selectedPlan, userId, userEmail, userName })
        });
        
        const responseText = await response.text();
        let data: any;
        try {
          data = JSON.parse(responseText);
        } catch (e) {
          console.error('Failed to parse JSON response from backend:', responseText);
          throw new Error('Server returned invalid response. Please try again later.');
        }

        if (data.url) {
          window.location.href = data.url;
        } else {
          throw new Error(data.error || 'Failed to initiate ZynlePay payment');
        }
      } else if (paymentMethod === 'manual') {
        if (!receiptUrl) {
          throw new Error('Please provide a receipt URL or proof of payment.');
        }
        const response = await fetch('/api/payment/manual/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId, 
            plan: selectedPlan, 
            receiptUrl, 
            notes: manualNotes 
          })
        });
        const data = await response.json();
        if (data.status === 'success') {
          setSuccessMessage(data.message);
          setTimeout(() => setSelectedPlan(null), 3000);
        } else {
          throw new Error(data.error || 'Failed to submit receipt');
        }
      } else {
        if (!phoneNumber) {
          throw new Error('Please enter your phone number for Mobile Money');
        }
        // Basic phone number validation (at least 7 digits)
        const phoneRegex = /^\+?[\d\s-]{7,15}$/;
        if (!phoneRegex.test(phoneNumber)) {
          throw new Error('Please enter a valid phone number');
        }
        const response = await fetch('/api/payment/mobile-money/initiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            plan: selectedPlan, 
            userId, 
            phoneNumber, 
            provider: mmProvider 
          })
        });
        
        const responseText = await response.text();
        let data: any;
        try {
          data = JSON.parse(responseText);
        } catch (e) {
          console.error('Failed to parse JSON response from backend:', responseText);
          throw new Error('Server returned invalid response. Please try again later.');
        }

        if (data.status === 'pending') {
          setSuccessMessage(data.message);
          // In a real app, you'd poll for status here.
          // For now, we'll let the user know it's being processed.
          setIsProcessing(false);
        } else {
          throw new Error(data.error || 'Failed to initiate Mobile Money payment');
        }
      }
    } catch (err: any) {
      setError(err.message);
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-12 max-w-6xl mx-auto">
      <div className="text-center space-y-4">
        <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase italic">
          Choose Your Trading Edge
        </h2>
        <p className="text-slate-500 max-w-2xl mx-auto text-base md:text-lg font-medium">
          Unlock advanced AI capabilities and institutional-grade data to elevate your trading performance.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative card-base p-8 flex flex-col transition-all duration-300 ${
              plan.isPopular ? 'ring-2 ring-slate-900 lg:scale-105 z-10 shadow-2xl shadow-slate-200' : 'hover:scale-[1.02] shadow-xl shadow-slate-100'
            } ${plan.isCurrent ? 'opacity-75' : ''} ${plan.isPopular && 'md:col-span-2 lg:col-span-1'}`}
          >
            {plan.isPopular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                Most Popular
              </div>
            )}

            <div className="flex items-center gap-4 mb-6">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${plan.color}`}>
                <plan.icon size={28} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">{plan.name}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{plan.description}</p>
              </div>
            </div>

            <div className="mb-8">
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-black text-slate-900 tracking-tighter">{plan.price}</span>
                {plan.period && <span className="text-slate-400 font-black uppercase text-[10px] tracking-widest">{plan.period}</span>}
              </div>
            </div>

            <div className="flex-1 space-y-4 mb-10">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Features list</p>
              {plan.features.map((feature) => (
                <div key={feature} className="flex items-start gap-3 group">
                  <div className="mt-1 w-5 h-5 rounded-full bg-slate-50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Check size={12} className="text-slate-900" />
                  </div>
                  <span className="text-slate-600 text-sm font-bold tracking-tight">{feature}</span>
                </div>
              ))}
            </div>

            <button
              onClick={plan.onClick}
              disabled={plan.isCurrent || isLoading}
              className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 ${
                plan.isCurrent
                  ? 'bg-slate-50 text-slate-300 cursor-default'
                  : plan.id === 'Elite'
                    ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-xl shadow-emerald-200'
                    : 'bg-slate-900 text-white hover:bg-black shadow-xl shadow-slate-300'
              } active:scale-95 disabled:opacity-50`}
            >
              {isLoading && !plan.isCurrent ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : null}
              {plan.buttonText}
            </button>
          </motion.div>
        ))}
      </div>

      {/* Payment Selection Modal */}
      <AnimatePresence>
        {selectedPlan && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPlan(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-[2.5rem] shadow-2xl p-6 md:p-10 border border-slate-50 scrollbar-hide"
            >
              <div className="text-center space-y-2 mb-8">
                <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                  <Shield className="w-8 h-8 text-slate-900" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight italic">Secure Checkout</h3>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
                  Upgrading to <span className="text-slate-900">{selectedPlan}</span>
                </p>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center italic">Selection</p>
                
                <button
                  onClick={() => setPaymentMethod('card')}
                  className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${
                    paymentMethod === 'card'
                      ? 'border-slate-900 bg-slate-50'
                      : 'border-slate-50 hover:border-slate-100'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    paymentMethod === 'card' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400'
                  }`}>
                    <CreditCard size={24} />
                  </div>
                  <div className="text-left">
                    <p className="font-black text-slate-900 uppercase tracking-tight">Card / ZynlePay</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Supports Zambia & Int.</p>
                  </div>
                  {paymentMethod === 'card' && <div className="ml-auto w-6 h-6 bg-slate-900 rounded-full flex items-center justify-center"><Check size={14} className="text-white" /></div>}
                </button>

                <button
                  onClick={() => setPaymentMethod('manual')}
                  className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${
                    paymentMethod === 'manual'
                      ? 'border-slate-900 bg-slate-50'
                      : 'border-slate-50 hover:border-slate-100'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    paymentMethod === 'manual' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400'
                  }`}>
                    <Shield size={24} />
                  </div>
                  <div className="text-left">
                    <p className="font-black text-slate-900 uppercase tracking-tight">Manual Transfer</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Instant Proof</p>
                  </div>
                  {paymentMethod === 'manual' && <div className="ml-auto w-6 h-6 bg-slate-900 rounded-full flex items-center justify-center"><Check size={14} className="text-white" /></div>}
                </button>

                {paymentMethod === 'manual' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4 pt-2 p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200"
                  >
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Bank Information</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                          <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Bank</p>
                          <p className="text-[10px] font-black text-slate-900">TradeIQ Global</p>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                          <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Account</p>
                          <p className="text-[10px] font-black text-slate-900">1234567890</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Receipt Link</label>
                      <input
                        type="text"
                        placeholder="Link to screenshot"
                        value={receiptUrl}
                        onChange={(e) => setReceiptUrl(e.target.value)}
                        className="w-full p-4 rounded-xl bg-white border border-slate-100 focus:border-slate-900 outline-none text-xs font-bold"
                      />
                    </div>
                  </motion.div>
                )}

                <button
                  onClick={() => setPaymentMethod('mobile_money')}
                  className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${
                    paymentMethod === 'mobile_money'
                      ? 'border-slate-900 bg-slate-50'
                      : 'border-slate-50 hover:border-slate-100'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    paymentMethod === 'mobile_money' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400'
                  }`}>
                    <Smartphone size={24} />
                  </div>
                  <div className="text-left">
                    <p className="font-black text-slate-900 uppercase tracking-tight">Mobile Money</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">MTN, Airtel, Zamtel</p>
                  </div>
                  {paymentMethod === 'mobile_money' && <div className="ml-auto w-6 h-6 bg-slate-900 rounded-full flex items-center justify-center"><Check size={14} className="text-white" /></div>}
                </button>

                {paymentMethod === 'mobile_money' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4 pt-2"
                  >
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Provider</label>
                      <select
                        value={mmProvider}
                        onChange={(e) => setMmProvider(e.target.value)}
                        className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-slate-900 outline-none font-black text-slate-900 uppercase text-xs"
                      >
                        <option>MTN Mobile Money</option>
                        <option>Airtel Money</option>
                        <option>Zamtel Kwacha</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                      <input
                        type="tel"
                        placeholder="e.g. 260 971..."
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-slate-900 outline-none font-black text-slate-900 text-sm"
                      />
                    </div>
                  </motion.div>
                )}
              </div>

              {error && (
                <div className="mt-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-500 text-[10px] font-black uppercase tracking-widest text-center italic">
                  {error}
                </div>
              )}

              <div className="mt-8 space-y-4">
                <button
                  onClick={handlePayment}
                  disabled={!paymentMethod || isProcessing}
                  className="w-full py-5 bg-slate-900 hover:bg-black disabled:opacity-50 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-slate-200 flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  {isProcessing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Confirm Payment
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
                <button
                  onClick={() => setSelectedPlan(null)}
                  className="w-full py-2 text-slate-400 hover:text-slate-600 text-[10px] font-black uppercase tracking-widest transition-colors"
                >
                  Back to Plans
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 pb-12">
        {[
          { icon: Zap, title: 'Instant Access', desc: 'No waiting time' },
          { icon: Shield, title: 'Secure Payment', desc: 'Encrypted channel' },
          { icon: Star, title: 'Cancel Anytime', desc: 'Full flexibility' }
        ].map((item) => (
          <div key={item.title} className="flex items-center gap-4 p-6 bg-white rounded-3xl border border-slate-50 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 shadow-inner">
              <item.icon size={20} />
            </div>
            <div>
              <h4 className="font-black text-slate-900 text-[10px] uppercase tracking-widest italic">{item.title}</h4>
              <p className="text-xs text-slate-500 font-medium">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
