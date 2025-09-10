/**
 * Register Component
 * Student Management System 
 * Giao diện đăng ký với email verification
 */

"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import ApiService from "@/services/ApiService";
import { Input } from "../ui/input";
import { Eye, EyeOff } from "lucide-react";

interface RegisterFormProps {
  onSwitchToLogin?: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "STUDENT" as const, // Luôn cố định là STUDENT để bảo mật
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [step, setStep] = useState<"personal" | "security" | "verify">("personal");
  const [verificationCode, setVerificationCode] = useState("");
  const [currentFormStep, setCurrentFormStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password validation functions
  const validatePassword = (password: string) => {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };
    return requirements;
  };

  const isPasswordValid = (password: string) => {
    const reqs = validatePassword(password);
    return Object.values(reqs).every(Boolean);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (step === "personal") {
      // Validate personal info and move to security step
      if (!formData.name || !formData.email) {
        setError("Please fill in all required fields");
        return;
      }
      setError("");
      setStep("security");
      setCurrentFormStep(2);
      return;
    }

    if (step === "security") {
      // Validate passwords and submit registration
      setLoading(true);
      setError("");

      // Validation
      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match");
        setLoading(false);
        return;
      }

      if (!isPasswordValid(formData.password)) {
        setError("Password does not meet the requirements below");
        setLoading(false);
        return;
      }

      try {
        const response = await ApiService.register({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
        });

        if (response.success) {
          setSuccess(
            "Please check your email for verification code."
          );
          setStep("verify");
          setCurrentFormStep(3);
        }
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Registration failed. Please try again.";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Real API call for email verification
      const response = await fetch("http://192.168.88.175:3001/api/auth/verify-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          verificationCode: verificationCode,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess("Email verified successfully! You can now login.");
        setTimeout(() => {
          onSwitchToLogin?.();
        }, 2000);
      } else {
        setError(data.message || "Invalid verification code. Please try again.");
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Verification failed. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resendVerificationCode = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    
    try {
      const response = await fetch("http://192.168.88.175:3001/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          email: formData.email 
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess("Verification email resent! Please check your inbox.");
      } else {
        setError(data.message || "Failed to resend verification email");
      }
    } catch (error) {
      console.error("Resend verification error:", error);
      setError("An error occurred while resending verification email");
    } finally {
      setLoading(false);
    }
  };

  if (step === "verify") {
    return (
      <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto h-12 w-12 bg-green-500 rounded-full flex items-center justify-center">
            <svg
              className="h-8 w-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 className="mt-4 text-2xl font-bold text-gray-900">
            Verify Your Email
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            We&apos;ve sent a verification code to{" "}
            <strong>{formData.email}</strong>
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <div className="flex items-center">
              <svg
                className="h-5 w-5 text-red-400 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              {error}
            </div>
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            <div className="flex items-center">
              <svg
                className="h-5 w-5 text-green-400 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              {success}
            </div>
          </div>
        )}

        {/* Verification Form */}
        <form onSubmit={handleVerification} className="space-y-6">
          <div>
            <label htmlFor="verificationCode" className="block text-sm font-bold text-gray-900 mb-2">
              Verification Code
            </label>
            <Input
              id="verificationCode"
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter 6-digit code"
              className="w-full px-4 py-3 text-center text-2xl tracking-wider border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              maxLength={6}
              required
            />
          </div>

          <Button
            type="submit"
            disabled={loading || verificationCode.length !== 6}
            className="w-full rounded-full shadow-xl text-white font-bold py-3 cursor-pointer"
            style={{backgroundImage: "linear-gradient(to right, #4f46e5 0%, #7c3aed 50%, #db2777 100%)"}}
          >
            {loading ? "Verifying..." : "Verify Email"}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={resendVerificationCode}
              disabled={loading}
              className="text-sm text-blue-600 hover:text-blue-500 disabled:opacity-50 cursor-pointer"
            >
              Didn&apos;t receive the code? Resend
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setStep("personal")}
              className="text-sm text-gray-600 hover:text-gray-500 cursor-pointer"
            >
              ← Back to registration
            </button>
          </div>
        </form>

       
      </div>
    );
  }

  return (
    <div className=" py-8 md:py-10 lg:py-6 px-4 md:px-10 lg:px-12 shadow-2xl sm:rounded-lg sm:px-10 max-w-md md:max-w-4xl lg:max-w-md xl:max-w-xl mx-4 rounded-xl" style={{backgroundImage: "linear-gradient(to top, rgb(255, 229, 251) 0%, rgb(255, 255, 255) 99%)"}}>
      {/* Header */}
      <div className="text-center mb-6 md:mb-8 lg:mb-8">
        <h2 className="text-2xl md:text-3xl lg:text-3xl xl:text-2xl font-extrabold text-gray-900 uppercase">Create Account</h2>
        <p className="mt-2 text-sm md:text-lg lg:text-base xl:text-sm text-gray-600">
          Join Student Management System
        </p>
      </div>

      {/* Step Progress Indicator */}
      <div className="mb-8 md:mb-8 lg:mb-8">
        <div className="flex items-center justify-center">
          <div className="flex items-center space-x-1 sm:space-x-2">
            {/* Step 1 */}
            <div className="flex items-center">
              <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium ${
                currentFormStep >= 1 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                1
              </div>
              <span className={`ml-1 sm:ml-2 text-xs sm:text-sm md:text-md lg:text-sm font-bold ${
                currentFormStep >= 1 ? 'text-green-600' : 'text-gray-500'
              }`}>
                Personal
              </span>
            </div>
            
            {/* Divider */}
            <div className={`w-6 sm:w-12 md:w-6 lg:w-12 h-1 ${currentFormStep >= 2 ? 'bg-green-600' : 'bg-gray-200'}`}></div>
            
            {/* Step 2 */}
            <div className="flex items-center">
              <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium ${
                currentFormStep >= 2 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                2
              </div>
              <span className={`ml-1 sm:ml-2 text-xs sm:text-sm md:text-md lg:text-sm font-bold ${
                currentFormStep >= 2 ? 'text-green-600' : 'text-gray-500'
              }`}>
                Security
              </span>
            </div>
            
            {/* Divider */}
            <div className={`w-6 sm:w-12 md:w-6 lg:w-12 h-1 ${currentFormStep >= 3 ? 'bg-green-600' : 'bg-gray-200'}`}></div>
            
            {/* Step 3 */}
            <div className="flex items-center">
              <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium ${
                currentFormStep >= 3 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                3
              </div>
              <span className={`ml-1 sm:ml-2 text-xs sm:text-sm md:text-md lg:text-sm font-bold ${
                currentFormStep >= 3 ? 'text-green-600' : 'text-gray-500'
              }`}>
                Verify
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <svg
              className="h-5 w-5 text-red-400 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </div>
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <svg
              className="h-5 w-5 text-green-400 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            {success}
          </div>
        </div>
      )}

      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6 lg:space-y-5">
        
        {/* Step 1: Personal Information */}
        {step === "personal" && (
          <div className="space-y-4 md:space-y-6 lg:space-y-4">
            
            {/* Full Name */}
            <div>
              <label htmlFor="name" className="block text-sm md:text-md lg:text-base xl:text-sm font-bold text-black mb-1 md:mb-3 lg:mb-2 xl:mb-1">
                Full Name
              </label>
              <Input
                id="name"
                name="name"
                type="text"
                required
                className="w-full px-3 md:px-4 lg:px-3 py-3 md:py-3 lg:py-3 h-10 md:h-12 lg:h-12 xl:h-10 border border-gray-700 rounded-lg placeholder-gray-500 text-gray-900 text-sm md:text-lg lg:text-base xl:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={handleChange}
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm md:text-md lg:text-base xl:text-sm font-bold text-black mb-1 md:mb-3 lg:mb-2 xl:mb-1">
                Email Address
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                className="w-full px-3 md:px-4 lg:px-3 py-3 md:py-3 lg:py-3 h-10 md:h-12 lg:h-12 xl:h-10 border border-gray-700 rounded-lg placeholder-gray-500 text-gray-900 text-sm md:text-lg lg:text-base xl:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            {/* Role Selection */}
            <div>
              
              <div className="w-full px-3 md:px-4 lg:px-3 py-3 md:py-4 lg:py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900">
                <div className="flex items-center">
                  <svg className="h-4 w-4 md:h-6 md:w-6 lg:h-5 lg:w-5 text-blue-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  </svg>
                  <span className="font-medium text-sm md:text-lg lg:text-base xl:text-sm">Student Account</span>
                </div>
                <p className="text-xs md:text-sm lg:text-xs text-gray-500 mt-1">
                  Teachers must be registered by system administrators for security
                </p>
              </div>
              <input type="hidden" name="role" value="STUDENT" />
            </div>

            {/* Next Button */}
            <Button 
              type="submit" 
              className="w-full text-white font-extrabold shadow-xl py-2 rounded-full md:py-4 lg:py-3 xl:py-2 px-4 md:px-8 lg:px-6 xl:px-4 text-sm md:text-lg lg:text-base xl:text-sm cursor-pointer" 
              size="lg"
              style={{backgroundImage: "linear-gradient(to right, #4f46e5 0%, #7c3aed 50%, #db2777 100%)"}}
            >
              Set Password  →
            </Button>
          </div>
        )}

        {/* Step 2: Security */}
        {step === "security" && (
          <div className="space-y-4 md:space-y-6 lg:space-y-4">

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm md:text-lg lg:text-base xl:text-sm font-bold text-black mb-1 md:mb-3 lg:mb-2 xl:mb-1">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full px-3 md:px-4 lg:px-3 py-3 md:py-3 lg:py-3 h-10 md:h-12 lg:h-12 xl:h-10 border border-gray-300 rounded-lg placeholder-gray-500 text-gray-900 text-sm md:text-lg lg:text-base xl:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 md:pr-4 lg:pr-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 md:w-7 md:h-7 lg:w-6 lg:h-6 xl:w-5 xl:h-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 md:w-7 md:h-7 lg:w-6 lg:h-6 xl:w-5 xl:h-5 text-gray-400" />
                  )}
                </button>
              </div>
              
              {/* Password Requirements - Simplified */}
              {formData.password.length > 0 && (
                <div className={`mt-2 p-2 rounded-lg border ${isPasswordValid(formData.password) ? 'bg-green-200 border-green-200' : 'bg-red-200 border-red-200 border-3'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-xs">
                      {Object.entries({
                        length: formData.password.length >= 8,
                        uppercase: /[A-Z]/.test(formData.password),
                        lowercase: /[a-z]/.test(formData.password),
                        number: /\d/.test(formData.password),
                        special: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password),
                      }).map(([key, isValid]) => (
                        <div key={key} className={`w-2 h-2 rounded-full mr-1 ${isValid ? 'bg-green-500' : 'bg-red-600'}`}></div>
                      ))}
                    </div>
                    <span className={`text-xs font-bold ${isPasswordValid(formData.password) ? 'text-green-600' : 'text-red-600'}`}>
                      {isPasswordValid(formData.password) ? '✓ Strong' : '✗ Weak'}
                    </span>
                  </div>
                  {!isPasswordValid(formData.password) && (
                    <p className="text-xs text-gray-500 mt-1 font-medium">
                      8+ chars • uppercase • lowercase • number • special char
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm md:text-lg lg:text-base xl:text-sm font-bold text-black mb-1 md:mb-3 lg:mb-2 xl:mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  className={`w-full px-3 md:px-4 lg:px-3 py-3 md:py-4 lg:py-3 pr-10 md:pr-12 lg:pr-10 h-10 md:h-12 lg:h-12 xl:h-10 border rounded-lg placeholder-gray-500 text-gray-900 text-sm md:text-lg lg:text-base xl:text-sm focus:outline-none focus:ring-2 ${
                    formData.confirmPassword && formData.password !== formData.confirmPassword
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : formData.confirmPassword && formData.password === formData.confirmPassword
                      ? 'border-green-300 focus:ring-green-500 focus:border-green-500'
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 md:pr-4 lg:pr-3"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 md:w-7 md:h-7 lg:w-6 lg:h-6 xl:w-5 xl:h-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 md:w-7 md:h-7 lg:w-6 lg:h-6 xl:w-5 xl:h-5 text-gray-400" />
                  )}
                </button>
              </div>
              
              {/* Password Match Indicator - Simplified */}
              {formData.confirmPassword && (
                <div className="mt-1 text-xs">
                  {formData.password === formData.confirmPassword ? (
                    <span className="text-green-600">✓ Passwords match</span>
                  ) : (
                    <span className="text-red-600">✗ Passwords don&apos;t match</span>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <Button 
                type="button"
                onClick={() => {setStep("personal"); setCurrentFormStep(1);}}
                variant="outline"
                className="flex-1 shadow rounded-full py-2 md:py-3 lg:py-2 px-4 md:px-6 lg:px-4 text-sm md:text-lg lg:text-base xl:text-sm cursor-pointer"
              >
                ← Back
              </Button>
              <Button 
                type="submit" 
                disabled={loading || !isPasswordValid(formData.password) || formData.password !== formData.confirmPassword} 
                className="flex-1 text-white font-bold shadow-lg rounded-full py-2 md:py-3 lg:py-2 px-4 md:px-6 lg:px-4 text-sm md:text-lg lg:text-base xl:text-sm cursor-pointer" 
                size="lg"
                style={{backgroundImage: "linear-gradient(to right, #eea2a2 0%, #bbc1bf 19%, #57c6e1 42%, #b49fda 79%, #7ac5d8 100%)"}}
              >
                {loading ? "Creating..." : "Create Account"}
              </Button>
            </div>
          </div>
        )}
      </form>

      {/* Switch to Login - Always show */}
      <div className="mt-6 md:mt-6 lg:mt-2 text-center">
        <span className="text-sm md:text-md lg:text-base xl:text-sm text-gray-600">
          Already have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="font-bold text-blue-600 hover:text-blue-500 cursor-pointer"
          >
            Sign in here
          </button>
        </span>
      </div>
    </div>
  );
};

export default RegisterForm;
