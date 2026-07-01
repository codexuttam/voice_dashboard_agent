'use client';

import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Phone,
  Coins,
  Clock,
  TrendingUp,
  PhoneCall,
  CreditCard,
  History,
  Download,
  Lock,
  LogOut,
  CheckCircle,
  AlertCircle,
  Info,
  Sun,
  Moon,
  Eye,
  EyeOff,
  X
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Logo from '@/components/Logo';
import { supabase as sbClient } from '@/lib/supabase';

interface Stats {
  creditsRemaining: number;
  todayCalls: number;
  minutesUsedToday: number;
  totalCalls: number;
  activeCalls: number;
  todayCreditsUsed: number;
}

interface CallLog {
  id: string;
  call_id: string;
  customer_number: string;
  agent_name: string;
  duration: number;
  credits_used: number;
  status: string;
  recording_url: string | null;
  transcript: string | null;
  started_at: string;
  // enriched from call_analytics
  overall_sentiment?: string;
  interest_level?: string;
  buying_intent?: string;
  call_outcome?: string;
  sentiment_score?: number;
  summary?: string;
  analytics_id?: string;
}

interface ActiveCall {
  call_id: string;
  customer_number: string;
  agent_name: string;
  started_at: string;
  duration?: number;
  credits_used?: number;
  transcript_preview?: string;
  recording_url?: string | null;
}

interface PaymentLog {
  id: string;
  order_id: string;
  amount: number;
  gst: number;
  status: string;
  created_at: string;
}

export default function Home() {
  const [token, setToken] = useState<string>('');
  const [pageTheme, setPageTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' || 'dark';
      setPageTheme(savedTheme);
    }
  }, []);

  const togglePageTheme = () => {
    const newTheme = pageTheme === 'dark' ? 'light' : 'dark';
    setPageTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [mobile, setMobile] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [loggingIn, setLoggingIn] = useState<boolean>(false);
  const [agreedToTerms, setAgreedToTerms] = useState<boolean>(false);
  const [showTermsModal, setShowTermsModal] = useState<boolean>(false);
  const [showResendModal, setShowResendModal] = useState<boolean>(false);
  const [showVerificationModal, setShowVerificationModal] = useState<boolean>(false);
  const [resendEmailAddress, setResendEmailAddress] = useState<string>('');
  const [sendingResend, setSendingResend] = useState<boolean>(false);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);

  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState<boolean>(false);
  const [forgotEmail, setForgotEmail] = useState<string>('');
  const [sendingForgot, setSendingForgot] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [stats, setStats] = useState<Stats>({
    creditsRemaining: 0,
    todayCalls: 0,
    minutesUsedToday: 0,
    totalCalls: 0,
    activeCalls: 0,
    todayCreditsUsed: 0,
  });
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([]);
  const [callHistory, setCallHistory] = useState<CallLog[]>([]);
  const [payments, setPayments] = useState<PaymentLog[]>([]);
  const [selectedCall, setSelectedCall] = useState<CallLog | null>(null);
  const [error, setError] = useState<string>('');
  const [recharging, setRecharging] = useState<boolean>(false);
  const [rechargeAmount, setRechargeAmount] = useState<number>(1000);
  const [showRechargeModal, setShowRechargeModal] = useState<boolean>(false);

  // Call Trigger states
  const [showTriggerModal, setShowTriggerModal] = useState<boolean>(false);
  const [showInsufficientCreditsModal, setShowInsufficientCreditsModal] = useState<boolean>(false);
  const [triggerPhone, setTriggerPhone] = useState<string>('');
  const [triggerAgentId, setTriggerAgentId] = useState<string>(process.env.NEXT_PUBLIC_DEFAULT_AGENT_ID || '45b42390-369b-49b5-9a26-21a099dc843e');
  const [workflows, setWorkflows] = useState<{ workflow_id: string; workflow_name: string }[]>([]);
  const [triggering, setTriggering] = useState<boolean>(false);

  // Toast notifications state
  interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
  }
  const [toasts, setToasts] = useState<Toast[]>([]);
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001/api';
  const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

  // Restore session persistence for the current logged-in user
  useEffect(() => {
    const savedToken = sessionStorage.getItem('billing_auth_token');
    const savedEmail = sessionStorage.getItem('billing_user_email');
    if (savedToken) {
      setToken(savedToken);
      setIsLoggedIn(true);
      if (savedEmail) setUserEmail(savedEmail);
    }
  }, []);

  // Countdown timer for resend verification email cooldown
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  // Fetch Dashboard data
  const fetchData = async (authToken: string) => {
    try {
      const headers = { Authorization: `Bearer ${authToken}` };

      // Fetch stats
      const statsRes = await fetch(`${BACKEND_URL}/billing/stats`, { headers });
      const statsData = await statsRes.json();
      if (statsData.success) {
        setStats(statsData.stats);
      } else {
        throw new Error(statsData.error || 'Failed to fetch stats');
      }

      // Fetch active calls
      const activeRes = await fetch(`${BACKEND_URL}/billing/active-calls`, { headers });
      const activeData = await activeRes.json();
      if (activeData.success) {
        setActiveCalls(activeData.activeCalls);
      }

      // Fetch call history
      const historyRes = await fetch(`${BACKEND_URL}/billing/call-history?limit=20`, { headers });
      const historyData = await historyRes.json();
      if (historyData.success) {
        const calls: CallLog[] = historyData.calls;
        
        // Enrich with analytics from Supabase using customer phone numbers
        try {
          if (sbClient && calls.length > 0) {
            // Normalize: strip leading + and spaces for comparison
            const normalize = (p: string) => p.replace(/^\+/, '').replace(/\s/g, '');

            const phones = calls.map((c) => c.customer_number).filter(Boolean);
            const { data: analytics } = await sbClient
              .from('call_analytics')
              .select('id, customer_phone, overall_sentiment, interest_level, buying_intent, call_outcome, sentiment_score, summary');

            if (analytics && analytics.length > 0) {
              // Build map keyed by normalized phone
              const map: Record<string, any> = {};
              analytics.forEach((a: any) => {
                if (a.customer_phone) map[normalize(a.customer_phone)] = a;
              });

              calls.forEach((c) => {
                const a = map[normalize(c.customer_number)];
                if (a) {
                  c.overall_sentiment = a.overall_sentiment;
                  c.interest_level    = a.interest_level;
                  c.buying_intent     = a.buying_intent;
                  c.call_outcome      = a.call_outcome;
                  c.sentiment_score   = a.sentiment_score;
                  c.summary           = a.summary;
                  c.analytics_id      = a.id;
                }
              });
            }
          }
        } catch (e) {
          console.warn('Could not enrich call history with analytics:', e);
        }

        setCallHistory(calls);
      }

      // Fetch payments
      const paymentsRes = await fetch(`${BACKEND_URL}/billing/payment-history?limit=20`, { headers });
      const paymentsData = await paymentsRes.json();
      if (paymentsData.success) {
        setPayments(paymentsData.payments);
      }

      // Fetch user workflows
      try {
        const workflowsRes = await fetch(`${BACKEND_URL}/billing/workflows`, { headers });
        const workflowsData = await workflowsRes.json();
        if (workflowsData.success && workflowsData.workflows) {
          setWorkflows(workflowsData.workflows);
          // Auto-select the first workflow if available
          if (workflowsData.workflows.length > 0) {
            setTriggerAgentId(workflowsData.workflows[0].workflow_id);
          }
        }
      } catch (wfErr) {
        console.error('Failed to fetch user workflows:', wfErr);
      }

      setError('');
    } catch (err: any) {
      setError(err.message || 'Error loading dashboard data');
    }
  };

  // Socket.io integration for live updates
  useEffect(() => {
    if (!isLoggedIn || !token) return;

    fetchData(token);

    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('Connected to socket server');
      // Requesting room join for our org. Since this is single client dashboard,
      // the backend will auto-assign the client org.
      fetch(`${BACKEND_URL}/billing/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.organization) {
            socket.emit('join_org', data.organization.id);
          }
        });
    });

    socket.on('live_call_update', (data) => {
      if (data.event === 'call_started') {
        setActiveCalls(prev => [data.call, ...prev]);
        setStats(prev => ({ ...prev, activeCalls: prev.activeCalls + 1 }));
      } else if (data.event === 'call_progress') {
        setActiveCalls(prev => prev.map(c => {
          if (c.call_id === data.call.call_id) {
            return {
              ...c,
              duration: data.call.duration,
              credits_used: data.call.credits_used,
              transcript_preview: data.call.transcript_preview ?? c.transcript_preview,
              recording_url: data.call.recording_url ?? c.recording_url
            };
          }
          return c;
        }));
        if (data.call.balance !== undefined) {
          setStats(prev => ({ ...prev, creditsRemaining: data.call.balance }));
        }
      } else if (data.event === 'call_ended') {
        setActiveCalls(prev => prev.filter(c => c.call_id !== data.call_id));
        if (data.call) {
          setCallHistory(prev => [data.call, ...prev]);
          setStats(prev => ({
            ...prev,
            activeCalls: Math.max(0, prev.activeCalls - 1),
            totalCalls: prev.totalCalls + 1,
            todayCalls: prev.todayCalls + 1,
            todayCreditsUsed: prev.todayCreditsUsed + (data.call?.credits_used || 0)
          }));
        } else {
          setStats(prev => ({
            ...prev,
            activeCalls: Math.max(0, prev.activeCalls - 1)
          }));
          fetchData(token);
        }
      }
    });

    socket.on('wallet_update', (data) => {
      setStats(prev => ({ ...prev, creditsRemaining: data.balance }));
    });

    return () => {
      socket.disconnect();
    };
  }, [isLoggedIn, token]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required');
      return;
    }


    if (isSignUp) {
      if (!name.trim()) {
        setError('Name is required for sign up');
        return;
      }
      if (!mobile.trim()) {
        setError('Mobile number is required for sign up');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
    }
    setLoggingIn(true);
    try {
      const endpoint = isSignUp ? '/auth/signup' : '/auth/login';
      const body = isSignUp ? { email, password, name, mobile } : { email, password };
      
      const res = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      
      if (data.success) {
        if (data.token) {
          sessionStorage.setItem('billing_auth_token', data.token);
          sessionStorage.setItem('billing_user_email', data.user?.email || email);
          setToken(data.token);
          setUserEmail(data.user?.email || email);
          setIsLoggedIn(true);
          setError('');
          if (isSignUp) {
            showToast('Sign up successful! 10 credits added.', 'success');
          }
        } else if (isSignUp && data.message) {
          // If no token is returned on signup, it means email verification is required
          showToast(data.message, 'info');
          setError('');
          // Switch to login screen so they can log in after verifying
          setIsSignUp(false);
          // Pre-fill email for resend verification just in case
          setResendEmailAddress(email);
          // Show verification prompt popup
          setShowVerificationModal(true);
          // Set cooldown to 60 seconds
          setCooldownSeconds(60);
        } else {
          setError(isSignUp ? 'Signup failed' : 'Invalid credentials');
        }
      } else {
        setError(data.error || (isSignUp ? 'Signup failed' : 'Invalid credentials'));
      }
    } catch (err: any) {
      setError((isSignUp ? 'Signup failed: ' : 'Login failed: ') + err.message);
    } finally {
      setLoggingIn(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      showToast('Please enter your email address', 'error');
      return;
    }
    setSendingForgot(true);
    try {
      const res = await fetch(`${BACKEND_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('If your account exists, a reset link will be sent to your email.', 'success');
        setShowForgotPasswordModal(false);
        setForgotEmail('');
      } else {
        showToast(data.error || 'Failed to request password reset', 'error');
      }
    } catch (err: any) {
      showToast('Network error while requesting reset link', 'error');
    }
    setSendingForgot(false);
  };

  const handleResendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmailAddress.trim()) {
      showToast('Please enter your email address', 'error');
      return;
    }
    setSendingResend(true);
    try {
      const res = await fetch(`${BACKEND_URL}/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: resendEmailAddress })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Verification email resent!', 'success');
        setShowResendModal(false);
        setResendEmailAddress('');
        // Start 60 seconds cooldown
        setCooldownSeconds(60);
      } else {
        showToast(data.error || 'Failed to resend verification email', 'error');
      }
    } catch (err: any) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setSendingResend(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('billing_auth_token');
    sessionStorage.removeItem('billing_user_email');
    setIsLoggedIn(false);
    setToken('');
    setUserEmail('');
    setActiveCalls([]);
    setCallHistory([]);
    setPayments([]);
  };



  const handleRecharge = async () => {
    setRecharging(true);
    try {
      if (!(window as any).Razorpay) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
      }

      // 1. Create order on backend
      const res = await fetch(`${BACKEND_URL}/billing/razorpay/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: rechargeAmount
        })
      });

      const orderData = await res.json();
      if (!orderData.success) throw new Error(orderData.error);

      // 2. Open Razorpay Checkout modal
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Bitlance AI Billing',
        description: `Wallet Credits Recharge - ₹${rechargeAmount}`,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          // 3. Verify Payment
          const verifyRes = await fetch(`${BACKEND_URL}/billing/razorpay/verify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            })
          });

          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            showToast('Recharge Successful!', 'success');
            fetchData(token);
          } else {
            showToast('Verification Failed: ' + verifyData.error, 'error');
          }
        },
        prefill: {
          name: 'bitlanceai',
          email: 'bitlanceai@gmail.com'
        },
        theme: {
          color: '#3B82F6'
        },
        modal: {
          ondismiss: async function () {
            console.log('Payment modal closed');
            try {
              await fetch(`${BACKEND_URL}/billing/razorpay/fail`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                  order_id: orderData.orderId
                })
              });
              fetchData(token);
              showToast('Payment cancelled / failed.', 'error');
            } catch (err) {
              console.error('Error reporting payment failure:', err);
            }
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      showToast('Recharge Error: ' + err.message, 'error');
    } finally {
      setRecharging(false);
    }
  };

  const downloadInvoice = async (payment: PaymentLog) => {
    const doc = new jsPDF();
    
    // Load logo
    const img = new Image();
    img.src = '/logo2.jpg';
    await new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve; // proceed even if it fails
    });

    let textStartY = 20;
    
    if (img.complete && img.naturalWidth > 0) {
      // Adjust dimensions for the wider logo
      doc.addImage(img, 'JPEG', 14, 14, 45, 12);
      textStartY = 35; // Move text beneath the wide logo
    }

    // Header (Company Details)
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 58, 138); // Blue color
    doc.text("Bitlance Tech Hub", 14, textStartY);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Complete AI Solutions", 14, textStartY + 6);
    doc.text("Email: bitlanceai@gmail.com", 14, textStartY + 12);
    
    // Invoice Title
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("TAX INVOICE", 140, 20);
    
    // Invoice Details
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Invoice No: INV-${payment.order_id.substring(6, 14)}`, 140, 30);
    doc.text(`Date: ${new Date(payment.created_at).toLocaleDateString()}`, 140, 36);
    doc.text(`Order ID: ${payment.order_id}`, 140, 42);
    
    // Line separator
    const lineY = Math.max(textStartY + 20, 55);
    doc.setDrawColor(200, 200, 200);
    doc.line(14, lineY, 196, lineY);
    
    // Bill To
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Bill To:", 14, lineY + 10);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Customer Email: ${userEmail || 'Client'}`, 14, lineY + 16);
    doc.text("Bitlance Client", 14, lineY + 22);
    
    // Table
    const baseAmount = payment.amount;
    const taxAmount = Number((baseAmount * 0.18).toFixed(2));
    const totalAmount = baseAmount + taxAmount;
    
    autoTable(doc, {
      startY: lineY + 35,
      head: [['Description', 'Base Amount (INR)', 'GST (18%)', 'Total (INR)']],
      body: [
        ['Wallet Credits Recharge', `${baseAmount.toFixed(2)}`, `${taxAmount.toFixed(2)}`, `${totalAmount.toFixed(2)}`],
      ],
      headStyles: {
        fillColor: [30, 58, 138],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 10,
        cellPadding: 6,
      },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
      },
      theme: 'grid',
    });
    
    // Summary
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    doc.setFontSize(10);
    doc.text("Total Base Amount:", 130, finalY);
    doc.text(`Rs. ${baseAmount.toFixed(2)}`, 196, finalY, { align: 'right' });
    
    doc.text("Total GST (18%):", 130, finalY + 8);
    doc.text(`Rs. ${taxAmount.toFixed(2)}`, 196, finalY + 8, { align: 'right' });
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Total Amount:", 130, finalY + 18);
    doc.text(`Rs. ${totalAmount.toFixed(2)}`, 196, finalY + 18, { align: 'right' });
    
    // Footer
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150, 150, 150);
    doc.text("Thank you for your business!", 105, 280, { align: 'center' });
    doc.text("This is a computer generated invoice and requires no signature.", 105, 286, { align: 'center' });
    
    // Save PDF
    doc.save(`Bitlance-Invoice-${payment.order_id}.pdf`);
  };

  const handleTriggerCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!triggerPhone || !triggerAgentId) {
      showToast('Please fill in both the phone number and agent UUID.', 'error');
      return;
    }
    setTriggering(true);
    try {
      const res = await fetch(`${BACKEND_URL}/billing/trigger-call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          phoneNumber: triggerPhone,
          agentId: triggerAgentId
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Call initiated successfully! Call ID: ' + (data.call?.call_id || 'initiated'), 'success');
        setShowTriggerModal(false);
        setTriggerPhone('');
        fetchData(token);
      } else {
        if (data.error === 'INSUFFICIENT_CREDITS') {
          setShowTriggerModal(false);
          setShowInsufficientCreditsModal(true);
        } else {
          showToast('Failed to trigger call: ' + (data.message || data.error), 'error');
        }
      }
    } catch (err: any) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setTriggering(false);
    }
  };  // Render Login Screen if not logged in
  if (!isLoggedIn) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-4 relative transition-colors duration-300">
        {/* Background Gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-500/10 dark:from-blue-900/20 via-slate-50 dark:via-slate-950 to-slate-50 dark:to-slate-950 pointer-events-none transition-colors duration-300" />

        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-8 rounded-2xl shadow-2xl relative z-10 transition-colors duration-300">
          {/* Theme Toggle Button */}
          <button
            onClick={togglePageTheme}
            type="button"
            className="absolute top-6 right-6 p-2 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            title="Toggle theme"
          >
            {pageTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <div className="flex flex-col items-center mb-8">
            <div className="h-16 mb-4">
              <Logo theme={pageTheme} className="h-full w-auto" />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Single-Client Billing Dashboard</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-650 dark:text-red-400 p-3 rounded-lg flex items-center gap-2 mb-6 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {isSignUp && (
              <>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your Name"
                      className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 focus:border-cyan-500 rounded-lg py-3 px-4 text-sm text-slate-850 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    Mobile Number
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      required
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 focus:border-cyan-500 rounded-lg py-3 px-4 text-sm text-slate-850 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-colors"
                    />
                    <Phone className="absolute right-4 top-3.5 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                  </div>
                </div>
              </>
            )}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 focus:border-cyan-500 rounded-lg py-3 px-4 text-sm text-slate-850 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 focus:border-cyan-500 rounded-lg py-3 pl-4 pr-12 text-sm text-slate-850 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3.5 text-slate-400 dark:text-slate-500 hover:text-slate-650 dark:hover:text-slate-350 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {!isSignUp && (
              <div className="flex justify-end mt-1">
                <button
                  type="button"
                  onClick={() => setShowForgotPasswordModal(true)}
                  className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            {isSignUp && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 focus:border-cyan-500 rounded-lg py-3 pl-4 pr-12 text-sm text-slate-850 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-3.5 text-slate-400 dark:text-slate-500 hover:text-slate-650 dark:hover:text-slate-350 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {isSignUp && (
              <div className="flex items-start gap-2.5 mt-2">
                <input
                  type="checkbox"
                  id="agree-terms"
                  required
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-1 w-4 h-4 text-cyan-600 border-slate-300 dark:border-slate-800 rounded focus:ring-cyan-500 cursor-pointer"
                />
                <label htmlFor="agree-terms" className="text-xs text-slate-500 dark:text-slate-400 leading-normal select-none cursor-pointer">
                  I agree to the{' '}
                  <button
                    type="button"
                    onClick={() => setShowTermsModal(true)}
                    className="text-cyan-600 dark:text-cyan-400 hover:underline font-semibold"
                  >
                    Terms and Conditions of Service
                  </button>
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={loggingIn || (isSignUp && !agreedToTerms)}
              className="w-full bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 disabled:opacity-50 py-3 rounded-lg font-semibold text-sm transition-colors shadow-lg shadow-cyan-500/20 text-white"
            >
              {loggingIn ? (isSignUp ? 'Signing Up...' : 'Signing In...') : (isSignUp ? 'Sign Up' : 'Sign In to Dashboard')}
            </button>
          </form>

          <div className="mt-4 text-center space-y-2">
            <div>
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-xs text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 font-semibold"
              >
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </button>
            </div>
            {!isSignUp && (
              <div>
                <button
                  type="button"
                  disabled={cooldownSeconds > 0}
                  onClick={() => setShowResendModal(true)}
                  className="text-xs sm:text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cooldownSeconds > 0
                    ? `Didn't receive verification email? Resend in ${cooldownSeconds}s`
                    : "Didn't receive verification email? Resend"}
                </button>
              </div>
            )}
          </div>

        </div>

        {/* TERMS AND CONDITIONS MODAL */}
        {showTermsModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl relative transition-all duration-300">
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-3">
                  <div className="h-8">
                    <Logo theme={pageTheme} className="h-full w-auto" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Terms of Service</h3>
                </div>
                <button
                  onClick={() => setShowTermsModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-250 text-sm font-semibold transition-colors"
                >
                  Close
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-650 dark:text-slate-400 leading-relaxed font-sans scrollbar-thin">
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                  BITLANCE VOICE AI AGENT — Terms and Conditions of Service
                </h4>
                <p>
                  Please read these Terms and Conditions carefully before signing up for or using our Voice AI Agent Service. By creating an account or using the Service, you agree to be bound by these Terms. If you do not agree, do not use the Service.
                </p>

                <h5 className="font-bold text-slate-900 dark:text-slate-100 mt-3">1. Definitions</h5>
                <div className="pl-2">
                  <strong>"Service"</strong> means the Voice AI Agent platform, including all voice interaction capabilities, APIs, dashboards, and related tools provided by us.
                  <br />
                  <strong>"User"</strong> or <strong>"You"</strong> means any individual or entity that registers for or uses the Service.
                  <br />
                  <strong>"We," "Us,"</strong> or <strong>"Company"</strong> refers to the operator of the Voice AI Agent platform.
                  <br />
                  <strong>"Voice Data"</strong> means audio inputs, transcripts, and interaction logs generated during your use of the Service.
                </div>

                <h5 className="font-bold text-slate-900 dark:text-slate-100 mt-3">2. Eligibility & Account Registration</h5>
                <div className="pl-2">
                  To use the Service, you must:
                  <ul className="list-disc pl-5 space-y-1 mt-1">
                    <li>Be at least 18 years of age or the age of legal majority in your jurisdiction.</li>
                    <li>Provide accurate, complete, and current registration information.</li>
                    <li>Maintain the security of your account credentials.</li>
                    <li>Notify us immediately of any unauthorized access or breach of your account.</li>
                  </ul>
                  You are solely responsible for all activity that occurs under your account.
                </div>

                <h5 className="font-bold text-slate-900 dark:text-slate-100 mt-3">3. Use of the Voice AI Agent</h5>
                <div className="pl-2">
                  <strong>3.1 Permitted Use</strong>
                  <br />
                  The Service may only be used for lawful purposes and in accordance with these Terms. You agree to use the Service in a manner consistent with all applicable local, state, national, and international laws and regulations.
                  <br />
                  <strong>3.2 Prohibited Use</strong>
                  <br />
                  You must not use the Service to:
                  <ul className="list-disc pl-5 space-y-1 mt-1">
                    <li>Impersonate any person or entity, or falsely represent your affiliation with any person or entity.</li>
                    <li>Collect or harvest personal data of others without consent.</li>
                    <li>Transmit spam, unsolicited communications, or automated scripts not authorized by us.</li>
                    <li>Engage in fraudulent, abusive, or harmful interactions via voice prompts.</li>
                    <li>Attempt to reverse-engineer, decompile, or disassemble any component of the Service.</li>
                    <li>Use the Service to generate or distribute illegal, defamatory, or harmful content.</li>
                  </ul>
                </div>

                <h5 className="font-bold text-slate-900 dark:text-slate-100 mt-3">4. Voice Data & Privacy</h5>
                <div className="pl-2">
                  By using the Service, you acknowledge and agree that:
                  <ul className="list-disc pl-5 space-y-1 mt-1">
                    <li>Voice interactions may be recorded, processed, and stored to provide, improve, and personalize the Service.</li>
                    <li>Transcripts and metadata from interactions may be analyzed by automated systems and, in limited cases, reviewed by authorized personnel for quality assurance.</li>
                    <li>You will not transmit sensitive personal information (e.g., passwords, financial account numbers, health data) through voice interactions unless explicitly supported and secured by the platform.</li>
                  </ul>
                  Your use of Voice Data is governed by our Privacy Policy, which is incorporated into these Terms by reference.
                </div>

                <h5 className="font-bold text-slate-900 dark:text-slate-100 mt-3">5. Consent to Voice Recording</h5>
                <div className="pl-2">
                  Where applicable law requires consent before recording voice conversations, you hereby provide consent on behalf of yourself and agree to obtain consent from any third parties whose voice may be captured during your use of the Service. You are responsible for compliance with all applicable recording consent laws in your jurisdiction.
                </div>

                <h5 className="font-bold text-slate-900 dark:text-slate-100 mt-3">6. Intellectual Property</h5>
                <div className="pl-2">
                  <strong>6.1 Our IP</strong>
                  <br />
                  All content, features, software, and technology underlying the Service are the exclusive property of the Company or its licensors. These Terms do not grant you any rights to use our trademarks, logos, or proprietary technology.
                  <br />
                  <strong>6.2 Your Content</strong>
                  <br />
                  You retain ownership of any content you provide through the Service. By using the Service, you grant the Company a non-exclusive, worldwide, royalty-free license to use, process, and store your content solely for the purpose of providing and improving the Service.
                </div>

                <h5 className="font-bold text-slate-900 dark:text-slate-100 mt-3">7. Payment & Subscription</h5>
                <div className="pl-2">
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Access to certain features may require a paid subscription. All fees are stated at the time of purchase.</li>
                    <li>Subscriptions automatically renew unless cancelled before the renewal date.</li>
                    <li>All payments are non-refundable unless otherwise stated or required by applicable law.</li>
                    <li>We reserve the right to modify pricing with 30 days' advance notice.</li>
                  </ul>
                </div>

                <h5 className="font-bold text-slate-900 dark:text-slate-100 mt-3">8. Disclaimer of Warranties</h5>
                <div className="pl-2">
                  THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF HARMFUL COMPONENTS. YOUR USE OF THE SERVICE IS AT YOUR SOLE RISK.
                </div>

                <h5 className="font-bold text-slate-900 dark:text-slate-100 mt-3">9. Limitation of Liability</h5>
                <div className="pl-2">
                  TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE COMPANY SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF DATA, REVENUE, OR GOODWILL, ARISING FROM YOUR USE OF OR INABILITY TO USE THE SERVICE.
                </div>

                <h5 className="font-bold text-slate-900 dark:text-slate-100 mt-3">10. Termination</h5>
                <div className="pl-2">
                  We reserve the right to suspend or terminate your account at any time, with or without notice, if you violate these Terms or engage in conduct harmful to the Service or other users. Upon termination, your right to use the Service ceases immediately.
                </div>

                <h5 className="font-bold text-slate-900 dark:text-slate-100 mt-3">11. Governing Law & Dispute Resolution</h5>
                <div className="pl-2">
                  These Terms shall be governed by and construed in accordance with the laws of the applicable jurisdiction. Any disputes arising under these Terms shall be resolved through binding arbitration or in the courts of the applicable jurisdiction, as agreed upon at the time of signup.
                </div>

                <h5 className="font-bold text-slate-900 dark:text-slate-100 mt-3">12. Changes to These Terms</h5>
                <div className="pl-2">
                  We may update these Terms from time to time. We will notify you of material changes via email or in-app notice. Continued use of the Service after the effective date of any update constitutes acceptance of the revised Terms.
                </div>

                <h5 className="font-bold text-slate-900 dark:text-slate-100 mt-3">13. Contact Us</h5>
                <div className="pl-2 space-y-1">
                  <p><strong>Bitlance Voice AI Agent — Legal Team</strong></p>
                  <p>Email: <a href="mailto:ceo@bitlancetechhub.com" className="text-cyan-600 dark:text-cyan-400">ceo@bitlancetechhub.com</a></p>
                  <p>Website: <a href="https://www.bitlancetechub.com" target="_blank" rel="noopener noreferrer" className="text-cyan-600 dark:text-cyan-400">www.bitlancetechub.com</a></p>
                </div>

                <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col items-center gap-2">
                  <div className="h-10">
                    <Logo theme={pageTheme} className="h-full w-auto" />
                  </div>
                  <p className="text-[10px] text-slate-400">© 2026 Bitlance Voice AI Agent. All Rights Reserved.</p>
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setAgreedToTerms(true);
                    setShowTermsModal(false);
                  }}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold px-5 py-2.5 rounded-lg transition-colors"
                >
                  I Agree to Terms
                </button>
              </div>
            </div>
          </div>
        )}

        {/* RESEND VERIFICATION MODAL */}
        {showResendModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative transition-all duration-300">
              <form onSubmit={handleResendVerification} className="p-6 space-y-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Resend Verification Email</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Enter your email address below, and we will trigger a new verification link to your inbox.
                </p>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={resendEmailAddress}
                    onChange={(e) => setResendEmailAddress(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 focus:border-cyan-500 rounded-lg py-2.5 px-4 text-sm text-slate-850 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-colors"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowResendModal(false)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sendingResend}
                    className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
                  >
                    {sendingResend ? 'Sending...' : 'Send Link'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* SIGNUP SUCCESS VERIFICATION PROMPT MODAL */}
        {showVerificationModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 text-center space-y-4 relative transition-all duration-300">
              <div className="mx-auto w-12 h-12 bg-cyan-100 dark:bg-cyan-950/80 rounded-full flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                <CheckCircle className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Verification Email Sent! 🎙</h3>
              <p className="text-xs sm:text-sm text-slate-650 dark:text-slate-400 leading-relaxed">
                Thank you for signing up! We've sent a verification email to <strong className="text-slate-800 dark:text-slate-200">{resendEmailAddress || 'your email address'}</strong>.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-500 leading-relaxed bg-slate-50 dark:bg-slate-950/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                Please check your inbox (and spam folder), click the verification link to activate your account, and then log in.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowVerificationModal(false)}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors shadow-lg shadow-cyan-500/20"
                >
                  Got it, I will verify and login
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    );
  }

  const isAdmin = userEmail === 'bitlanceai@gmail.com';
  const displayCredits = stats.creditsRemaining !== undefined ? stats.creditsRemaining : 0;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6 pt-24 md:p-10 relative bg-slate-50 dark:bg-slate-950">
        {/* Background decoration */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

        {/* Load Razorpay SDK is now done dynamically */}

        <div className="max-w-7xl mx-auto space-y-8 relative z-10">

        {/* HEADER */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-900 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-400 via-sky-400 to-teal-400 bg-clip-text text-transparent">
              Client Voice Agent Portal
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Real-time calls tracking & billing analytics</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowTriggerModal(true)}
              className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-lg shadow-cyan-500/20"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              Trigger Call
            </button>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-xs flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-slate-500 dark:text-slate-400 font-medium">Live Feed Connected</span>
            </div>
            <button
              onClick={handleLogout}
              className="bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* STATS OVERVIEW */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

          <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 relative overflow-hidden backdrop-blur-md">
            <div className="flex justify-between items-start mb-4">
              <Coins className="w-6 h-6 text-cyan-400" />
              <button
                onClick={() => setShowRechargeModal(true)}
                className="text-xs bg-cyan-600/10 hover:bg-cyan-600/20 text-cyan-500 dark:text-cyan-400 border border-cyan-500/20 px-2.5 py-1 rounded-full font-semibold transition-colors"
              >
                Recharge
              </button>
            </div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Available Credits</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-3xl font-extrabold text-slate-900 dark:text-cyan-50">
                {displayCredits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs font-semibold text-emerald-400" title="1 Credit = ₹1.00">
                ≈ ₹{displayCredits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 relative overflow-hidden backdrop-blur-md">
            <div className="flex justify-between items-start mb-4">
              <PhoneCall className="w-6 h-6 text-emerald-400" />
              {stats.activeCalls > 0 && (
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping absolute right-6 top-6" />
              )}
            </div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Calls</p>
            <p className="text-3xl font-extrabold mt-1 text-slate-900 dark:text-emerald-50">{stats.activeCalls}</p>
          </div>

          <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 relative overflow-hidden backdrop-blur-md">
            <div className="flex justify-between items-start mb-4">
              <Clock className="w-6 h-6 text-purple-400" />
            </div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Minutes Used Today</p>
            <p className="text-3xl font-extrabold mt-1 text-slate-900 dark:text-purple-50">{stats.minutesUsedToday} min</p>
          </div>

          <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 relative overflow-hidden backdrop-blur-md">
            <div className="flex justify-between items-start mb-4">
              <TrendingUp className="w-6 h-6 text-indigo-400" />
            </div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Calls</p>
            <p className="text-3xl font-extrabold mt-1 text-slate-900 dark:text-indigo-50">{stats.totalCalls}</p>
          </div>
        </section>

        {/* PRICING & CREDIT INFO BANNER */}
        <section className="bg-gradient-to-r from-cyan-950/10 dark:from-cyan-950/20 via-white dark:via-slate-900/40 to-sky-950/10 dark:to-sky-950/20 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex gap-4">
            <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-500 dark:text-cyan-400 border border-cyan-500/20 flex-shrink-0 flex items-center justify-center">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-950 dark:text-slate-100 text-sm md:text-base">Credits & Billing Structure</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed max-w-2xl">
                1 Credit = ₹1.00 INR. Voice calls consume exactly <span className="font-semibold text-cyan-500 dark:text-cyan-400">5 credits per minute</span> (equivalent to ₹5.00/min), calculated proportionally based on seconds used. Balance is updated in real-time as calls start and finish.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <span className="text-xs font-semibold px-3 py-1.5 bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300">
              Rate: ₹5.00 / minute
            </span>
            <span className="text-xs font-semibold px-3 py-1.5 bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300">
              Value: 1 Credit = ₹1.00
            </span>
          </div>
        </section>

        {/* ACTIVE / LIVE CALLS SECTION */}
        <section className="bg-white dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800/50 rounded-2xl p-6 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-6">
            <Phone className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold">Current Active Calls</h2>
          </div>

          {activeCalls.length === 0 ? (
            <div className="border border-dashed border-slate-200 dark:border-slate-800/80 rounded-xl p-8 text-center text-slate-500">
              <p className="text-sm">No calls are currently active.</p>
              <p className="text-xs mt-1">Live active calls will appear here automatically.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {activeCalls.map((call) => (
                <div
                  key={call.call_id}
                  className="bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 flex items-center justify-between animate-pulse"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-200">{call.customer_number}</p>
                    <p className="text-xs text-slate-400">Agent: {call.agent_name}</p>
                    {call.duration !== undefined && (
                      <div className="flex gap-2 items-center mt-1 flex-wrap">
                        <span className="text-[10px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300">
                          {Math.floor(call.duration / 60)}m {call.duration % 60}s
                        </span>
                        {call.credits_used !== undefined && (
                          <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded font-medium">
                            {call.credits_used.toFixed(2)} cr
                          </span>
                        )}
                        {call.recording_url && (
                          <a
                            href={call.recording_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] bg-cyan-500/10 text-cyan-500 dark:text-cyan-400 border border-cyan-500/20 px-1.5 py-0.5 rounded font-medium"
                          >
                            Recording
                          </a>
                        )}
                      </div>
                    )}
                    {call.transcript_preview && (
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{call.transcript_preview}</p>
                    )}
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      In Progress
                    </span>
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch(`${BACKEND_URL}/billing/force-terminate/${call.call_id}`, {
                            method: 'POST',
                            headers: { Authorization: `Bearer ${token}` }
                          });
                          const data = await res.json();
                          if (data.success) {
                            showToast('Call forcefully terminated.', 'success');
                            fetchData(token);
                          } else {
                            showToast('Error terminating: ' + data.error, 'error');
                          }
                        } catch (err: any) {
                          showToast('Request failed', 'error');
                        }
                      }}
                      className="text-[10px] bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 px-2 py-1 rounded font-medium transition-colors"
                    >
                      End Call
                    </button>
                    <p className="text-xs text-slate-500">Started: {new Date(call.started_at).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* CALL HISTORY TABLE */}
        <section className="bg-white dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800/50 rounded-2xl p-6 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-6">
            <History className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold">Call History</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Credits</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Sentiment</th>
                  <th className="py-3 px-4">Interest</th>
                  <th className="py-3 px-4">Intent</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-850">
                {callHistory.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">
                      No call records found.
                    </td>
                  </tr>
                ) : (
                  callHistory.map((call) => {
                    const sentimentColor =
                      call.overall_sentiment === 'positive' ? 'text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30' :
                      call.overall_sentiment === 'negative' ? 'text-rose-500 dark:text-rose-400 bg-rose-500/10 border-rose-500/30' :
                      'text-slate-650 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700';
                    const levelColor = (v?: string) =>
                      v?.toLowerCase() === 'high'   ? 'text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/20' :
                      v?.toLowerCase() === 'medium' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20' :
                      'text-slate-650 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700';
                    return (
                      <tr key={call.id} className="hover:bg-slate-100 dark:hover:bg-slate-900/35 transition-colors">
                        <td className="py-4 px-4 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {new Date(call.started_at).toLocaleString()}
                        </td>
                        <td className="py-4 px-4 font-medium text-slate-900 dark:text-slate-100">{call.customer_number}</td>
                        <td className="py-4 px-4 text-slate-600 dark:text-slate-300">
                          {Math.floor(call.duration / 60)}m {call.duration % 60}s
                        </td>
                        <td className="py-4 px-4 font-semibold text-slate-900 dark:text-slate-200">
                          {call.credits_used}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${call.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-amber-500/10 text-amber-400'
                            }`}>
                            {call.status}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          {call.overall_sentiment ? (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border capitalize ${sentimentColor}`}>
                              {call.overall_sentiment}
                            </span>
                          ) : <span className="text-slate-600 text-xs">—</span>}
                        </td>
                        <td className="py-4 px-4">
                          {call.interest_level ? (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border capitalize ${levelColor(call.interest_level)}`}>
                              {call.interest_level}
                            </span>
                          ) : <span className="text-slate-600 text-xs">—</span>}
                        </td>
                        <td className="py-4 px-4">
                          {call.buying_intent ? (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border capitalize ${levelColor(call.buying_intent)}`}>
                              {call.buying_intent}
                            </span>
                          ) : <span className="text-slate-600 text-xs">—</span>}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedCall(call)}
                              className="text-xs text-cyan-500 dark:text-cyan-400 hover:text-cyan-600 dark:hover:text-cyan-300 font-semibold"
                            >
                              Transcript
                            </button>
                            {call.analytics_id && (
                              <a
                                href={`/dashboard?id=${call.analytics_id}`}
                                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
                              >
                                Analytics →
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* PAYMENTS HISTORY */}
        <section className="bg-white dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800/50 rounded-2xl p-6 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-6">
            <CreditCard className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-bold">Payments & Recharges</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">GST (18%)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-850">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No transaction records found.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-100 dark:hover:bg-slate-900/35 transition-colors">
                      <td className="py-4 px-4 font-mono text-xs text-slate-700 dark:text-slate-300">{p.order_id}</td>
                      <td className="py-4 px-4 text-xs text-slate-400">
                        {new Date(p.created_at).toLocaleString()}
                      </td>
                      <td className="py-4 px-4 font-medium text-slate-900 dark:text-slate-200">₹{p.amount}</td>
                      <td className="py-4 px-4 text-slate-400">₹{(p.amount * 0.18).toFixed(2)}</td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${p.status === 'PAID' || p.status === 'SUCCESS'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-red-500/10 text-red-400'
                          }`}>
                          {p.status === 'PAID' || p.status === 'SUCCESS' ? (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              Paid
                            </>
                          ) : (
                            'Pending'
                          )}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <button
                          onClick={() => {
                            showToast('Downloading Invoice for ' + p.order_id, 'info');
                            downloadInvoice(p);
                          }}
                          className="text-slate-400 hover:text-slate-200 transition-colors"
                          title="Download Invoice"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* CALL DETAIL MODAL */}
      {selectedCall && (() => {
        let parsedData = null;
        try {
          if (selectedCall.transcript && selectedCall.transcript.trim().startsWith('{')) {
            parsedData = JSON.parse(selectedCall.transcript);
          }
        } catch (e) {
          console.error(e);
        }

        const rawTranscript = parsedData ? parsedData.raw : selectedCall.transcript;
        const summary = parsedData ? parsedData.summary : null;
        const sentiment = parsedData ? parsedData.sentiment : null;
        const entities = parsedData ? parsedData.entities : null;

        // Split transcript lines into speakers
        const transcriptLines = (rawTranscript || '')
          .split('\n')
          .filter((line: string) => line.trim().length > 0)
          .map((line: string) => {
            // Match bracketed timestamp at start, e.g. [17:33:43.532+00:00] assistant: text
            const timestampMatch = line.match(/^\[([^\]]+)\]\s*(.*)$/);
            let timeStr = "";
            let remaining = line;
            if (timestampMatch) {
              timeStr = timestampMatch[1];
              remaining = timestampMatch[2];
            }
            
            const colonIndex = remaining.indexOf(':');
            if (colonIndex > -1) {
              const speaker = remaining.substring(0, colonIndex).trim();
              const text = remaining.substring(colonIndex + 1).trim();
              return {
                speaker,
                text,
                timestamp: timeStr
              };
            }
            
            return { speaker: 'System', text: line, timestamp: timeStr };
          });

        return (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Call Details</h3>
                  <div className="flex gap-4 mt-1">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Customer: <span className="text-slate-900 dark:text-slate-200 font-semibold">{selectedCall.customer_number}</span></p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Duration: <span className="text-slate-900 dark:text-slate-200 font-semibold">{Math.floor(selectedCall.duration / 60)}m {selectedCall.duration % 60}s</span></p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Credits: <span className="text-slate-900 dark:text-slate-200 font-bold">{selectedCall.credits_used}</span></p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCall(null)}
                  className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-semibold text-sm transition-colors"
                >
                  Close
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50 dark:bg-slate-900/50">
                {/* Custom Audio Player with Speed Control */}
                {selectedCall.recording_url && (
                  <div className="bg-white dark:bg-slate-955/50 border border-slate-200 dark:border-slate-850 p-4 rounded-xl space-y-3">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Audio Recording</h4>
                    <div className="flex items-center gap-4">
                      <audio id="call-audio-player" controls src={selectedCall.recording_url} className="w-full flex-1" />
                      <div className="flex flex-col gap-1 shrink-0">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Speed</label>
                        <select
                          onChange={(e) => {
                            const audio = document.getElementById('call-audio-player') as HTMLAudioElement | null;
                            if (audio) audio.playbackRate = parseFloat(e.target.value);
                          }}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs px-2 py-1.5 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                          defaultValue="1"
                        >
                          <option value="0.75">0.75x</option>
                          <option value="1">1.0x</option>
                          <option value="1.25">1.25x</option>
                          <option value="1.5">1.5x</option>
                          <option value="2">2.0x</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Grid for Transcript & AI Info */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  {/* Left: Transcript bubbles (3 columns) */}
                  <div className="lg:col-span-3 space-y-4">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Conversation Transcript</h4>
                    <div className="bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 p-4 rounded-xl text-sm max-h-[45vh] overflow-y-auto space-y-4 font-sans">
                      {transcriptLines.length > 0 ? (
                        transcriptLines.map((line: { speaker: string; text: string; timestamp?: string }, idx: number) => {
                          const isAI = ['ai', 'system', 'assistant', 'agent'].includes(line.speaker.toLowerCase());
                          const cleanSpeaker = line.speaker.toLowerCase() === 'assistant' ? 'AI Agent' : (line.speaker.toLowerCase() === 'user' ? 'Customer' : line.speaker);
                          return (
                            <div key={idx} className={`flex flex-col ${isAI ? 'items-start' : 'items-end'}`}>
                              <span className="text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wider">
                                {cleanSpeaker} {line.timestamp && `• ${line.timestamp}`}
                              </span>
                              <div className={`p-3 rounded-2xl max-w-[85%] text-sm leading-relaxed ${
                                isAI 
                                  ? 'bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none shadow-sm' 
                                  : 'bg-cyan-600 text-white rounded-tr-none shadow-sm'
                              }`}>
                                {line.text}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-slate-500 text-center py-6">No transcript available for this call.</p>
                      )}
                    </div>
                  </div>

                  {/* Right: AI Insights (2 columns) */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Summary */}
                    {summary && (
                      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4 rounded-xl space-y-2">
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">AI Summary</h4>
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{summary}</p>
                      </div>
                    )}

                    {/* Sentiment */}
                    {sentiment && (
                      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4 rounded-xl space-y-2">
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sentiment & Response</h4>
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{sentiment}</p>
                      </div>
                    )}

                    {/* Extracted Entities */}
                    {entities && Object.values(entities).some(val => val !== null && val !== '') && (
                      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4 rounded-xl space-y-3">
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">AI Extracted Information</h4>
                        <div className="space-y-2.5">
                          {(entities.client_name || entities.patient_name) && (
                            <div className="flex justify-between items-center text-xs py-1 border-b border-slate-200 dark:border-slate-800/40">
                              <span className="text-slate-500 dark:text-slate-400">Client Name</span>
                              <span className="text-slate-800 dark:text-slate-200 font-semibold">{entities.client_name || entities.patient_name}</span>
                            </div>
                          )}
                          {entities.department && (
                            <div className="flex justify-between items-center text-xs py-1 border-b border-slate-200 dark:border-slate-800/40">
                              <span className="text-slate-500 dark:text-slate-400">Requested Department</span>
                              <span className="text-slate-800 dark:text-slate-200 font-semibold">{entities.department}</span>
                            </div>
                          )}
                          {entities.appointment_date && (
                            <div className="flex justify-between items-center text-xs py-1 border-b border-slate-200 dark:border-slate-800/40">
                              <span className="text-slate-500 dark:text-slate-400">Appointment Date</span>
                              <span className="text-slate-800 dark:text-slate-200 font-semibold">{entities.appointment_date}</span>
                            </div>
                          )}
                          {entities.mobile && (
                            <div className="flex justify-between items-center text-xs py-1 border-b border-slate-200 dark:border-slate-800/40">
                              <span className="text-slate-500 dark:text-slate-400">Mobile</span>
                              <span className="text-slate-800 dark:text-slate-200 font-semibold">{entities.mobile}</span>
                            </div>
                          )}
                          {entities.email && (
                            <div className="flex justify-between items-center text-xs py-1">
                              <span className="text-slate-500 dark:text-slate-400">Email</span>
                              <span className="text-slate-800 dark:text-slate-200 font-semibold">{entities.email}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TRIGGER OUTBOUND CALL MODAL */}
      {showTriggerModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Trigger Outbound Call</h3>
              <button
                onClick={() => setShowTriggerModal(false)}
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-semibold text-sm"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleTriggerCall} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Customer Phone Number
                </label>
                <input
                  type="text"
                  required
                  value={triggerPhone}
                  onChange={(e) => setTriggerPhone(e.target.value)}
                  placeholder="e.g. +919876543210"
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-cyan-500 rounded-lg py-2.5 px-3.5 text-sm text-slate-850 dark:text-slate-100 placeholder-slate-400 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Voice Agent / Workflow
                </label>
                {workflows.length > 0 ? (
                  <>
                    <select
                      value={workflows.some(w => w.workflow_id === triggerAgentId) ? triggerAgentId : 'custom'}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'custom') {
                          setTriggerAgentId('');
                        } else {
                          setTriggerAgentId(val);
                        }
                      }}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-cyan-500 rounded-lg py-2.5 px-3.5 text-sm text-slate-850 dark:text-slate-100 focus:outline-none transition-colors mb-3"
                    >
                      {workflows.map((wf) => (
                        <option key={wf.workflow_id} value={wf.workflow_id}>
                          {wf.workflow_name}
                        </option>
                      ))}
                      <option value="custom">-- Enter Custom Workflow ID --</option>
                    </select>

                    {/* Show custom input if they selected 'custom' or the ID is not in the list */}
                    {!workflows.some(w => w.workflow_id === triggerAgentId) && (
                      <input
                        type="text"
                        required
                        value={triggerAgentId}
                        onChange={(e) => setTriggerAgentId(e.target.value)}
                        placeholder="Enter your custom voice agent UUID"
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-cyan-500 rounded-lg py-2.5 px-3.5 text-sm text-slate-850 dark:text-slate-100 placeholder-slate-400 focus:outline-none transition-colors"
                      />
                    )}
                  </>
                ) : (
                  <input
                    type="text"
                    required
                    value={triggerAgentId}
                    onChange={(e) => setTriggerAgentId(e.target.value)}
                    placeholder="Enter your voice agent UUID"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-cyan-500 rounded-lg py-2.5 px-3.5 text-sm text-slate-850 dark:text-slate-100 placeholder-slate-400 focus:outline-none transition-colors"
                  />
                )}
              </div>

              <button
                type="submit"
                disabled={triggering}
                className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-800 py-3 rounded-lg font-semibold text-sm transition-colors shadow-lg shadow-cyan-500/20 text-white"
              >
                {triggering ? 'Initiating Call...' : 'Call Customer Now'}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* RECHARGE MODAL */}
      {showRechargeModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-bold">Recharge Wallet Credits</h3>
              <button
                onClick={() => setShowRechargeModal(false)}
                className="text-slate-400 hover:text-slate-200 font-semibold text-sm"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              setShowRechargeModal(false);
              handleRecharge();
            }} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Amount to Recharge (INR)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(parseInt(e.target.value) || 0)}
                  placeholder="e.g. 1000"
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500 rounded-lg py-2.5 px-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
                />
                <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                  Min amount is ₹1. Credits will be automatically synchronized with your main Supabase account upon successful payment.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                {[500, 1000, 2000, 5000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRechargeAmount(preset)}
                    className={`flex-1 py-1.5 text-xs font-semibold border rounded-lg transition-all ${rechargeAmount === preset
                        ? 'bg-cyan-600/10 border-cyan-500 text-cyan-500 dark:text-cyan-400 shadow-md shadow-cyan-500/5'
                        : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                  >
                    ₹{preset}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={recharging}
                className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-800 py-3 rounded-lg font-semibold text-sm transition-colors shadow-lg shadow-cyan-500/20 mt-4 flex items-center justify-center gap-1.5"
              >
                {recharging ? 'Processing Payment...' : 'Proceed with Razorpay'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* INSUFFICIENT CREDITS MODAL */}
      {showInsufficientCreditsModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 text-center space-y-6">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center text-red-650 dark:text-red-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Insufficient Credits</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                You do not have enough credits to initiate a call. Please recharge your wallet to continue.
              </p>
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <button
                type="button"
                onClick={() => setShowInsufficientCreditsModal(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowInsufficientCreditsModal(false);
                  setShowRechargeModal(true);
                }}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-cyan-500/20"
              >
                Recharge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FORGOT PASSWORD MODAL */}
      {showForgotPasswordModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800/60">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Forgot Password</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Enter your email to receive a password reset link.
                </p>
              </div>
              <button
                onClick={() => setShowForgotPasswordModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors bg-slate-50 dark:bg-slate-800 p-2 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleForgotPassword} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 focus:border-cyan-500 rounded-lg py-3 px-4 text-sm text-slate-850 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-colors"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={sendingForgot || !forgotEmail}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-800 py-3 rounded-lg font-semibold text-sm transition-colors shadow-lg shadow-cyan-500/20 text-white flex items-center justify-center"
                >
                  {sendingForgot ? 'Sending Link...' : 'Send Verification Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATIONS */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 p-4 rounded-xl shadow-lg border backdrop-blur-md transition-all duration-300 transform translate-y-0 animate-in fade-in slide-in-from-bottom-2 ${toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-800/50 text-emerald-300'
                : toast.type === 'error'
                  ? 'bg-rose-950/90 border-rose-800/50 text-rose-300'
                  : 'bg-slate-900/90 border-slate-800 text-slate-300'
              }`}
          >
            {toast.type === 'success' && <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-400" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />}
            {toast.type === 'info' && <Info className="w-5 h-5 flex-shrink-0 text-blue-400" />}
            <span className="text-sm font-medium leading-relaxed">{toast.message}</span>
          </div>
        ))}
      </div>
    </main>
  </div>
  );
}
