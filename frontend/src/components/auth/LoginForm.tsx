/**
 * Login Component
 * Student Management System - DTECH TEAM
 * Giao diện đăng nhập với validation
 */

"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Eye, EyeOff, X, Crown, GraduationCap, BookOpen, Code } from "lucide-react";

interface LoginFormProps {
  onSwitchToRegister?: () => void;
}

// Demo accounts for testing
const DEMO_ACCOUNTS = [
  
  {
    role: "Teacher",
    name: "TRAN QUANG DUNG",
    email: "tqd0105@gmail.com",
    password: "Dungabc123@",
    icon: "/icons/teacher.png",
    color: "bg-gradient-to-r from-amber-500 to-orange-500",
    hoverColor: "hover:from-amber-600 hover:to-orange-600",
  },
  {
    role: "Student",
    name: "DUNG TRAN QUANG",
    email: "dtq287@gmail.com",
    password: "Dungabc123@",
    icon: "/icons/student.png",
    color: "bg-gradient-to-r from-blue-500 to-cyan-500",
    hoverColor: "hover:from-blue-600 hover:to-cyan-600",
  },
  {
    role: "Student",
    name: "DTECH",
    email: "tranquangdung.tech@gmail.com",
    password: "Dungabc123@",
    icon: "/icons/student.png",
    color: "bg-gradient-to-r from-purple-500 to-indigo-500",
    hoverColor: "hover:from-purple-600 hover:to-indigo-600",
  },
];

const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
  const { login, loading, error } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formData.email || !formData.password) {
      setFormError("Please enter both email and password.");
      return;
    }
    try {
      await login(formData.email, formData.password);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Login failed";
      setFormError(errorMessage);
    }
  };

  const handleDemoLogin = async (email: string, password: string) => {
    setShowDemoModal(false);
    setFormData({ email, password });
    try {
      await login(email, password);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Demo login failed";
      setFormError(errorMessage);
    }
  };

  return (
    <div className=" py-8 px-6 shadow-2xl rounded-lg sm:px-10 mx-4 lg:mx-0 " style={{backgroundImage: "linear-gradient(to top, rgb(244, 233, 255) 0%, rgb(255, 255, 255) 99%) "}}> 
      <div className="pb-6 text-center">
        <h1 className="text-2xl font-extrabold  text-gray-900 ">SIGN IN</h1>
        <span className="text-sm text-gray-600 ">Please enter your email and password</span>
      </div>
      <form className="mb-0 space-y-5" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email" className="block text-sm font-bold text-black ">
            Email address
          </label>
          <div className="mt-1">
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              className="border-1 border-gray-600"
            />
          </div>
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-bold text-black ">
            Password
          </label>
          <div className="mt-1 relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="border-1 border-gray-600 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-600 hover:text-gray-800"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
        {(formError || error) && (
          <div className="text-red-600 text-sm mt-2">
            {formError || error}
          </div>
        )}
        <div>
          <Button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-full shadow-xl text-sm font-extrabold bg-blue-600 cursor-pointer text-green-600 text-uppercase  hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={loading}
            style={{ backgroundImage: "linear-gradient(-225deg, #69EACB 0%, #EACCF8 48%, #6654F1 100%)" }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </div>
      </form>
      <div className="mt-4 text-center">
        <span className="text-sm text-gray-600">Don&apos;t have an account?</span>
        <button
          type="button"
          className="ml-2 text-blue-600  text-sm font-bold"
          onClick={onSwitchToRegister}
        >
          Register
        </button>
      </div>

      {/* Demo Accounts Button */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={() => setShowDemoModal(true)}
          className="flex items-center justify-center gap-2 cursor-pointer w-full py-2 px-4 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 shadow-lg transition-all duration-300 transform hover:scale-[1.02]"
        >
          <img src="/icons/boy.png" width={25} alt="" />
           Use Demo Accounts 
        </button>
      </div>

      {/* Demo Accounts Modal */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDemoModal(false)}
          />
          
          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-violet-500 to-fuchsia-500">
              <h2 className="text-xl font-bold text-white flex items-center gap-2 ">
                <img src="/icons/boy.png" width={40} alt="" />
                 DEMO ACCOUNTS</h2>
              <button
                onClick={() => setShowDemoModal(false)}
                className="p-1 rounded-full hover:bg-white/20 transition-colors cursor-pointer  "
              >
                <img src="/icons/close.png" width={30} alt="" />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-4 space-y-3 overflow-y-auto max-h-[60vh]">
              <p className="text-sm text-gray-600 text-center mb-4">
                Select an account to login instantly
              </p>
              
              {DEMO_ACCOUNTS.map((account, index) => {
                return (
                  <button
                    key={index}
                    onClick={() => handleDemoLogin(account.email, account.password)}
                    disabled={loading}
                    className={`w-full p-4 rounded-xl cursor-pointer ${account.color} ${account.hoverColor} text-white shadow-lg transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className="flex items-center gap-3">
                      <div className=" bg-white/30 rounded-full w-12 h-12 ">
                        <img src={account.icon} width={24} height={24} alt={account.role} className="w-12 h-12" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-bold text-sm">{account.role}</div>
                        <div className="text-white/90 text-xs">{account.name}</div>
                        <div className="text-white/70 text-xs w-40 truncate">{account.email}</div>
                      </div>
                      <div className="text-gray-100 text-sm font-semibold flex flex-col items-center gap-1">
                        Login <img src="./icons/next.png" width={35} alt="" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            
            
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginForm;
