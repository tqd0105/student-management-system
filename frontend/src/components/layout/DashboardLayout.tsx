/**
 * Dashboard Layout
 * Student Management System - DTECH TEAM
 */

'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { LogOut, Trash2 } from 'lucide-react';
import Footer from './Footer';
import DTechContactModal from './DTechContactModal';
import UserProfileModal from '@/components/profile/UserProfileModal';
import { API_BASE_URL } from '@/config/api';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, logout, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [isDTechModalOpen, setIsDTechModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

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
      const response = await fetch(`${API_BASE_URL}/api/users/delete-account`, {
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
    <div className="min-h-screen flex flex-col justify-between bg-gray-50">  
      {/* Top Navigation */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md shadow-2xs border-b border-gray-200/80">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
            {/* Logo & Title */}
            <div className="flex items-center min-w-0 flex-1 mr-1 sm:mr-3">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full flex items-center justify-center shrink-0 shadow-2xs overflow-hidden bg-white">
                <img src="/images/logo.png" alt="LightBrave Logo" className="w-full h-full object-contain" />
              </div>
              <div className="ml-2.5 sm:ml-3 min-w-0">
                <h1 className="text-xs sm:text-base md:text-lg font-black text-gray-900 tracking-tight leading-tight truncate">
                  <span className="sm:hidden">Student Management</span>
                  <span className="hidden sm:inline">Student Management System</span>
                </h1>
                <p className="text-[10px] sm:text-xs text-gray-400 font-bold tracking-wider uppercase truncate mt-0.5">
                  LIGHTBRAVE.EDU
                </p>
              </div>
            </div>

            {/* User Menu & Profile */}
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              {/* Profile Button with Avatar (Opens Profile Modal) */}
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(true)}
                className="flex items-center gap-2 p-1 sm:p-1.5 rounded-xl hover:bg-gray-100/90 active:bg-gray-200/80 transition-all cursor-pointer group text-left"
                title="Hồ sơ cá nhân & Đổi avatar"
              >
                {/* Avatar with S3 Image or Gradient Initials */}
                <div className="relative shrink-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden ring-2 ring-indigo-500/20 group-hover:ring-indigo-600 transition-all shadow-xs bg-gray-100 flex items-center justify-center">
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name || "Avatar"}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xs sm:text-sm font-bold">
                        {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}
                  </div>
                  {/* Online indicator */}
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
                </div>

                {/* User Info (Desktop) */}
                <div className="text-left hidden md:block min-w-0 max-w-[150px]">
                  <p className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors truncate mb-0.5">
                    {user?.name || user?.email || 'User'}
                  </p>
                  <div className="text-xs text-gray-500">
                    {renderRoleWithIcon(user?.role)}
                  </div>
                </div>
              </button>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="w-9 h-9 sm:w-10 sm:h-10 lg:w-auto bg-gray-700 hover:bg-rose-600 text-white rounded-full shadow-xs lg:px-3.5 lg:py-2 flex items-center justify-center gap-1.5 cursor-pointer transition-all shrink-0 active:scale-95"
                title="Đăng xuất"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span className="hidden lg:inline text-xs font-semibold">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {children}
        </div>
      </main>

      {/* Footer */}
      <Footer onOpenContactModal={() => setIsDTechModalOpen(true)} />

      {/* User Profile Modal with AWS S3 Avatar Integration */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {/* DTECH Contact Modal */}
      <DTechContactModal
        isOpen={isDTechModalOpen}
        onClose={() => setIsDTechModalOpen(false)}
      />
    </div>
  );
};

export default DashboardLayout;
