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
import { Eye, EyeOff } from "lucide-react";

interface LoginFormProps {
  onSwitchToRegister?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
  const { login, loading, error } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

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
    </div>
  );
};

export default LoginForm;
