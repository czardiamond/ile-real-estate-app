
import React, { useState, useEffect, useMemo } from 'react';
import { X, Calculator, Info, TrendingUp, DollarSign, Calendar, Percent, PieChart as PieChartIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface MortgageCalculatorProps {
  initialPrice?: number;
  propertyTitle?: string;
  onClose: () => void;
}

const MortgageCalculator: React.FC<MortgageCalculatorProps> = ({ initialPrice = 50000000, propertyTitle, onClose }) => {
  const [price, setPrice] = useState(initialPrice);
  const [downPayment, setDownPayment] = useState(initialPrice * 0.2);
  const [interestRate, setInterestRate] = useState(15); // Typical Nigerian mortgage rate is high
  const [loanTerm, setLoanTerm] = useState(20); // Years

  // Sync down payment if price changes from outside (though usually it won't after mount)
  useEffect(() => {
    setPrice(initialPrice);
    setDownPayment(initialPrice * 0.2);
  }, [initialPrice]);

  const calculation = useMemo(() => {
    const principal = price - downPayment;
    const monthlyRate = interestRate / 100 / 12;
    const numberOfPayments = loanTerm * 12;

    if (monthlyRate === 0) {
      const monthly = principal / numberOfPayments;
      return {
        monthlyPayment: monthly,
        totalPayment: principal,
        totalInterest: 0,
        principal
      };
    }

    const monthlyPayment = 
      (principal * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / 
      (Math.pow(1 + monthlyRate, numberOfPayments) - 1);

    const totalPayment = monthlyPayment * numberOfPayments;
    const totalInterest = totalPayment - principal;

    return {
      monthlyPayment,
      totalPayment,
      totalInterest,
      principal
    };
  }, [price, downPayment, interestRate, loanTerm]);

  const chartData = [
    { name: 'Principal', value: calculation.principal, color: '#166534' }, // Primary green
    { name: 'Total Interest', value: calculation.totalInterest, color: '#fbbf24' }, // Amber
  ];

  const formatCurrency = (val: number) => {
    return '₦' + Math.round(val).toLocaleString();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-4xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] animate-in zoom-in-95 duration-300">
        
        {/* Left Side: Inputs */}
        <div className="w-full md:w-1/2 p-6 md:p-8 border-b md:border-b-0 md:border-r border-gray-100 overflow-y-auto no-scrollbar">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <Calculator size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Mortgage Calculator</h2>
                {propertyTitle && (
                  <p className="text-xs text-primary font-medium truncate max-w-[240px]">
                    {propertyTitle}
                  </p>
                )}
              </div>
            </div>
            <button onClick={onClose} className="md:hidden p-2 hover:bg-gray-100 rounded-full">
              <X size={24} />
            </button>
          </div>

          <div className="space-y-6">
            {/* Property Price */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <DollarSign size={16} className="text-primary" /> Property Price (₦)
              </label>
              <input 
                type="number" 
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
              <input 
                type="range" 
                min={1000000} 
                max={500000000} 
                step={1000000}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full mt-4 accent-primary"
              />
            </div>

            {/* Down Payment */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <TrendingUp size={16} className="text-primary" /> Down Payment (₦)
              </label>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  value={downPayment}
                  onChange={(e) => setDownPayment(Number(e.target.value))}
                  className="flex-1 p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
                <div className="bg-gray-100 px-4 flex items-center rounded-2xl font-bold text-gray-500">
                  {Math.round((downPayment / price) * 100)}%
                </div>
              </div>
              <input 
                type="range" 
                min={0} 
                max={price} 
                step={100000}
                value={downPayment}
                onChange={(e) => setDownPayment(Number(e.target.value))}
                className="w-full mt-4 accent-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Interest Rate */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <Percent size={16} className="text-primary" /> Interest Rate (%)
                </label>
                <input 
                  type="number" 
                  value={interestRate}
                  step={0.1}
                  onChange={(e) => setInterestRate(Number(e.target.value))}
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>

              {/* Loan Term */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <Calendar size={16} className="text-primary" /> Term (Years)
                </label>
                <select 
                  value={loanTerm}
                  onChange={(e) => setLoanTerm(Number(e.target.value))}
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none"
                >
                  {[5, 10, 15, 20, 25, 30].map(yr => (
                    <option key={yr} value={yr}>{yr} Years</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-3">
            <Info className="text-blue-500 shrink-0" size={20} />
            <p className="text-xs text-blue-700 leading-relaxed">
              Mortgage rates in Nigeria typically range from 15% to 25% for commercial banks. 
              NHF (National Housing Fund) loans can be as low as 6% for eligible contributors.
            </p>
          </div>
        </div>

        {/* Right Side: Results */}
        <div className="w-full md:w-1/2 bg-gray-50 p-6 md:p-8 flex flex-col relative">
          <button onClick={onClose} className="hidden md:block absolute top-6 right-6 p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={24} />
          </button>

          <div className="mb-8">
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Estimated Monthly Payment</p>
            <h3 className="text-4xl font-black text-primary">{formatCurrency(calculation.monthlyPayment)}</h3>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-8">
              <div className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Principal Amount</p>
                <p className="text-sm font-bold text-gray-900">{formatCurrency(calculation.principal)}</p>
              </div>
              <div className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Total Interest</p>
                <p className="text-sm font-bold text-gray-900">{formatCurrency(calculation.totalInterest)}</p>
              </div>
              <div className="col-span-2 p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Total Cost of Loan</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(calculation.totalPayment)}</p>
              </div>
            </div>
          </div>

          <button 
            onClick={() => window.print()}
            className="mt-8 w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black transition-all flex items-center justify-center gap-2"
          >
            <PieChartIcon size={18} /> Download Amortization Schedule
          </button>
        </div>
      </div>
    </div>
  );
};

export default MortgageCalculator;
