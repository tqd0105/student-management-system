'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Mail, ArrowLeft, Shield, CheckCircle, AlertCircle, GraduationCap } from 'lucide-react';
import Link from 'next/link';

const VerifyEmailPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);
  
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://192.168.88.175:3001/api/auth/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          verificationCode,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/');
        }, 2000);
      } else {
        setError(data.message || 'Verification failed');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setResending(true);
    setError('');

    try {
      const response = await fetch('http://192.168.88.175:3001/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setError('');
        alert('Verification code sent successfully!');
      } else {
        setError(data.message || 'Failed to resend verification code');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setResending(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="mb-6">
              <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Email Verified!</h1>
              <p className="text-gray-600">
                Your email has been successfully verified. You can now sign in to your account.
              </p>
            </div>
            
            <div className="space-y-4">
              <Link
                href="/"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 inline-block text-center"
              >
                Continue to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left side - Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          {/* Logo and Title */}
          <div className="flex items-center mb-8">
            <div className="h-12 w-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <GraduationCap className="h-7 w-7 text-white" />
            </div>
            <div className="ml-4">
              <h2 className="text-2xl font-bold text-gray-900">DashStack</h2>
              <p className="text-sm text-gray-600">Student Management System</p>
            </div>
          </div>

          <div>
            <div className="mb-6">
              <Link
                href="/login"
                className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to sign in
              </Link>
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-2">Verify your email</h1>
            <p className="text-gray-600 mb-8">
              We&apos;ve sent a 6-digit verification code to your email. Please enter it below to verify your account.
            </p>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400 mr-3 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-red-800">Verification failed</h3>
                    <div className="mt-1 text-sm text-red-700">{error}</div>
                  </div>
                </div>
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              {/* Verification Code Field */}
              <div>
                <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700 mb-2">
                  Verification Code
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Shield className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="verificationCode"
                    name="verificationCode"
                    type="text"
                    required
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 text-center text-lg font-mono tracking-widest"
                    placeholder="Enter code from email"
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Enter the 6-digit code sent to your email
                </p>
              </div>

              {/* Submit Button */}
              <div>
                <button
                  type="submit"
                  disabled={loading || !email || !verificationCode || verificationCode.length !== 6}
                  className="group relative w-full rounded-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5  text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Verifying...
                    </div>
                  ) : (
                    'Verify Email'
                  )}
                </button>
              </div>

              {/* Resend Code */}
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Didn&apos;t receive the code?{' '}
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={resending}
                    className="font-medium text-blue-600 hover:text-blue-500 transition-colors duration-200 disabled:opacity-50"
                  >
                    {resending ? 'Sending...' : 'Resend code'}
                  </button>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Right side - Decorative */}
      <div className="hidden lg:block relative w-0 flex-1">
        <div className="absolute inset-0 bg-gradient-to-br from-green-600 via-blue-600 to-purple-700">
          <div className="absolute inset-0 bg-black opacity-10"></div>
          
          {/* Decorative Elements */}
          <div className="relative h-full flex items-center justify-center p-12">
            <div className="max-w-md text-center">
              <div className="mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-white bg-opacity-20 rounded-full mb-6">
                  <Shield className="h-10 w-10 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-4">
                  Secure Verification
                </h2>
                <p className="text-blue-100 text-lg leading-relaxed">
                  We use advanced security measures to protect your account and ensure only authorized access.
                </p>
              </div>
              
              {/* Security Features */}
              <div className="space-y-4 text-left">
                <div className="flex items-center text-white">
                  <div className="w-2 h-2 bg-green-300 rounded-full mr-3"></div>
                  <span className="text-blue-100">6-digit verification codes</span>
                </div>
                <div className="flex items-center text-white">
                  <div className="w-2 h-2 bg-green-300 rounded-full mr-3"></div>
                  <span className="text-blue-100">Time-limited for security</span>
                </div>
                <div className="flex items-center text-white">
                  <div className="w-2 h-2 bg-green-300 rounded-full mr-3"></div>
                  <span className="text-blue-100">Encrypted email delivery</span>
                </div>
              </div>
            </div>
          </div>

          {/* Background Pattern */}
          <div className="absolute bottom-0 left-0 right-0">
            <svg className="w-full h-24 text-purple-500 opacity-20" viewBox="0 0 1200 120" preserveAspectRatio="none">
              <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" fill="currentColor"></path>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
