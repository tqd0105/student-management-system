/**
 * Dashboard Layout
 * Student Management System - DTECH TEAM
 */

'use client';

import React from 'react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { LogOut, Trash2 } from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, logout, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('⚠️ WARNING: This will permanently delete your account and all your data. This action cannot be undone.\n\nAre you absolutely sure you want to delete your account?')) {
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.1.4:3001'}/api/users/delete-account`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        alert('✅ Account deleted successfully. You will be logged out now.');
        logout();
        window.location.href = '/';
      } else {
        alert(`❌ Failed to delete account: ${data.message}`);
      }
    } catch (error) {
      console.error('Delete account error:', error);
      alert('❌ An error occurred while deleting your account. Please try again.');
    }
  };

  // Function để render role với icon
  const renderRoleWithIcon = (role: string | undefined) => {
    switch (role) {
      case 'TEACHER':
        return (
          <div className="flex items-center justify-center space-x-1 ">
            <Image 
              src="/icons/teacher.png" 
              alt="Teacher" 
              width={20} 
              height={20}
              className="opacity-80"
            />
            <span>Teacher</span>
          </div>
        );
      case 'STUDENT':
        return (
          <div className="flex items-center justify-center space-x-1">
            <Image 
              src="/icons/student.png" 
              alt="Student" 
              width={20} 
              height={20}
              className="opacity-80"
            />
            <span> Student</span>
          </div>
        );
      case 'ADMIN':
        return (
          <div className="flex items-center justify-center space-x-1">
            <Image 
              src="/icons/admin.png" 
              alt="Admin" 
              width={20} 
              height={20}
              className="opacity-80"
            />
            <span>Admin</span>
          </div>
        );
      default:
        return <span>User</span>;
    }
  };

  return (
    <div className="min-h-screen " >  
      {/* Top Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo & Title */}
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <img src="./images/logo.png" alt="Logo" />
                </div>
                <div className="ml-3">
                  <h1 className="text-lg font-semibold text-gray-900">Student Management System</h1>
                  <p className="text-xs text-gray-500">LIGHTBRAVE.EDU</p>
                </div>
              </div>
            </div>

            {/* User Menu */}
            <div className="flex  items-center space-x-4">
              {/* User Info */}
              <div className="text-left hidden md:block">
                <p className="text-sm font-bold text-center text-gray-900 mb-0.5">{user?.name || user?.email || 'User'}</p>
                <div className="text-xs text-gray-500 text-center">
                  {renderRoleWithIcon(user?.role)}
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleDeleteAccount}
                className="bg-red-600 text-white md:p-3 lg:px-4 lg:py-2 rounded-full shadow-md hover:bg-red-700 flex items-center space-x-0 lg:space-x-2 hidden md:flex cursor-pointer"
                title="Delete Account"
              >
                <Trash2 className="w-4 h-4" />
                <span className='hidden lg:block'>Delete</span>
              </button>
              <button
                onClick={handleLogout}
                className="bg-gray-600 text-white p-3 md:p-3 lg:px-4 lg:py-2 rounded-full shadow-md hover:bg-gray-700 flex items-center space-x-0 lg:space-x-2 cursor-pointer"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
                <span className='hidden lg:block'>Logout</span>
              </button>
              
              
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8"
        
      >
        <div className="px-4 py-6 sm:px-0">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
