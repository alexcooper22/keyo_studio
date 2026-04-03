'use client';
import React, { useState } from 'react';
import Navbar from '../../components/Navbar';
import AuthModal from '../../components/AuthModal';

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const plans = [
    {
      name: 'Starter',
      description: 'For first-time AI content creators',
      monthlyPrice: 15,
      annualPrice: 10.5,
      credits: '200 credits/mo',
      buttonText: 'Get Plan',
      buttonBg: 'bg-white',
      buttonTextCol: 'text-black',
      accent: 'border-white/[0.08]'
    },
    {
      name: 'Plus',
      description: 'Scale your content production',
      monthlyPrice: 49,
      annualPrice: 34,
      credits: '1000 credits/mo',
      buttonText: 'Get Plus',
      buttonBg: 'bg-[#c8ff00]',
      buttonTextCol: 'text-black',
      accent: 'border-white/[0.08]'
    },
    {
      name: 'Ultra',
      highlight: 'MOST POPULAR',
      highlightBg: 'bg-[#ff3377]',
      description: 'Professional grade tools',
      monthlyPrice: 129,
      annualPrice: 90,
      credits: 'Unlimited credits*',
      buttonText: 'Get Ultra',
      buttonBg: 'bg-[#ff3377]',
      buttonTextCol: 'text-black',
      accent: 'border-[#ff3377]'
    },
    {
      name: 'Business',
      highlight: 'BEST VALUE',
      highlightBg: 'bg-[#378ADD]',
      description: 'For large creative teams',
      monthlyPrice: 89,
      annualPrice: 71,
      oldPrice: 89,
      credits: 'Custom credit limits',
      buttonText: 'Contact Sales',
      buttonBg: 'bg-[#378ADD]',
      buttonTextCol: 'text-black',
      accent: 'border-[#378ADD]'
    }
  ];

  const features = [
    'Access to all models',
    'Parallel generations',
    'Access to all features',
    'Early access to new AI features'
  ];

  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col relative overflow-x-hidden">
      <Navbar setShowModal={setShowModal} />
      
      <main className="flex-1 pt-[100px] pb-20 px-6 max-w-7xl mx-auto w-full">
        {/* PAGE HEADER */}
        <div className="text-center flex flex-col items-center">
          <h1 className="font-syne font-[800] text-[48px] tracking-tight text-white leading-tight">
            Pick your plan
          </h1>
          <p className="font-dm text-[14px] text-[#555] mt-2 max-w-[400px]">
            Scale creativity with higher limits and priority access
          </p>

          {/* MONTHLY/ANNUAL TOGGLE */}
          <div className="mt-10 flex items-center gap-4">
            <span className={`font-dm text-sm transition-colors ${!isAnnual ? 'text-white' : 'text-[#555]'}`}>Monthly</span>
            <button 
              onClick={() => setIsAnnual(!isAnnual)}
              className="w-[52px] h-[28px] bg-[#1a1a1a] border border-white/10 rounded-full relative transition-colors p-1"
            >
              <div className={`w-5 h-5 rounded-full transition-all duration-300 ${isAnnual ? 'translate-x-[24px] bg-[#ff3377]' : 'translate-x-0 bg-[#555]'}`}></div>
            </button>
            <div className="flex items-center gap-2">
              <span className={`font-dm text-sm transition-colors ${isAnnual ? 'text-white' : 'text-[#555]'}`}>Annual</span>
              <div className="bg-[#ff3377] text-black font-dm font-bold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider">
                30% OFF
              </div>
            </div>
          </div>
        </div>

        {/* PRICING CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-16">
          {plans.map((plan, idx) => (
            <div 
              key={idx} 
              className={`flex flex-col bg-[#0f0f0f] border ${plan.accent} rounded-2xl relative transition-transform hover:scale-[1.02] duration-300 shadow-2xl`}
            >
              {plan.highlight && (
                <div className={`${plan.highlightBg} text-white font-dm font-bold text-[11px] text-center py-2 absolute -top-[1px] left-[-1px] right-[-1px] rounded-t-2xl uppercase tracking-widest`}>
                  {plan.highlight}
                </div>
              )}
              
              <div className={`p-7 flex flex-col h-full ${plan.highlight ? 'pt-12' : ''}`}>
                <h3 className="font-syne font-[700] text-2xl text-white">{plan.name}</h3>
                <p className="font-dm text-[13px] text-[#555] mt-1 line-clamp-1">{plan.description}</p>
                
                <div className="mt-6 flex flex-col">
                  <span className="font-dm text-[13px] text-[#888]">{plan.credits}</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="font-syne font-[800] text-[40px] text-white">
                      ${isAnnual ? plan.annualPrice : plan.monthlyPrice}
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {plan.oldPrice && isAnnual && (
                        <span className="font-dm text-sm text-[#555] line-through">${plan.oldPrice}</span>
                      )}
                      <span className="font-dm text-[14px] text-[#555]">/mo</span>
                    </div>
                  </div>
                </div>

                <button className={`w-full h-12 ${plan.buttonBg} ${plan.buttonTextCol} font-dm font-[700] text-[15px] rounded-lg mt-8 hover:brightness-110 active:scale-95 transition-all`}>
                  {plan.buttonText}
                </button>

                <div className="mt-10 flex flex-col gap-4">
                  {features.map((feature, fIdx) => (
                    <div key={fIdx} className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-[#1D9E75]/10 flex items-center justify-center shrink-0">
                        <svg width="10" height="8" viewBox="0 0 12 9" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M1 4.5L4.5 8L11 1.5" stroke="#1D9E75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <span className="font-dm text-[13px] text-[#cccccc]">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {showModal && <AuthModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
