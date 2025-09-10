/**
 * Dashboard Main Page
 * Student Management System - DTECH TEAM
 */

'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import TeacherDashboard from '@/components/teacher/TeacherDashboard';
import StudentDashboard from '@/components/student/StudentDashboard';
// import ClassManagement from '@/components/classes/ClassManagement';
// import QRScanner from '@/components/qr/QRScanner';
import { useAuth } from '@/contexts/AuthContext';
import ApiService from '@/services/ApiService';

interface HealthStatus {
  success: boolean;
  data?: {
    server?: {
      environment?: string;
    };
  };
}

const DashboardPage: React.FC = () => {
  const { user, isTeacher, isStudent } = useAuth();
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'overview' | 'classes' | 'qr-scanner'>('overview');

  useEffect(() => {
    const fetchHealthCheck = async () => {
      try {
        const health = await ApiService.healthCheck();
        setHealthStatus(health);
      } catch (error) {
        console.error('Health check failed:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHealthCheck();
  }, []);

  const renderContent = () => {
    // Role-based dashboard rendering
    if (user?.role === 'TEACHER') {
      switch (activeView) {
        case 'overview':
          return <TeacherDashboard />;
        case 'classes':
          return <div>Class Management</div>;
        case 'qr-scanner':
          return (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">QR Scanner</h2>
              <div>QR Scanner Component</div>
            </div>
          );
        default:
          return <TeacherDashboard />;
      }
    }

    if (user?.role === 'STUDENT') {
      switch (activeView) {
        case 'overview':
          return <StudentDashboard />;
        case 'qr-scanner':
          return (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">QR Scanner</h2>
              <div>QR Scanner Component</div>
            </div>
          );
        default:
          return <StudentDashboard />;
      }
    }

    // Default admin or fallback view
    switch (activeView) {
      case 'classes':
        return <div>Class Management</div>;
      case 'qr-scanner':
        return (
          <div 
            onClick={() => setActiveView('overview')}
          >
            QR Scanner with close functionality
          </div>
        );
      default:
        return (
          <div className="space-y-6">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
              <h2 className="text-2xl font-bold mb-2">
                Welcome back, {user?.name}! 👋
              </h2>
              <p className="text-blue-100">
                {isTeacher && "Manage your classes and track student attendance with QR codes."}
                {isStudent && "View your classes and check-in to attendance sessions."}
              </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* System Status */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`h-3 w-3 rounded-full ${healthStatus ? 'bg-green-400' : 'bg-red-400'}`}></div>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-medium text-gray-900">System Status</h3>
                    <p className="text-sm text-gray-500">
                      {loading ? 'Checking...' : healthStatus ? 'All systems operational' : 'System offline'}
                    </p>
                  </div>
                </div>
              </div>

              {/* User Role */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-xl">
                        {user?.role === 'TEACHER' && '👨‍🏫'}
                        {user?.role === 'STUDENT' && '👨‍🎓'}
                        {user?.role === 'ADMIN' && '👨‍💼'}
                      </span>
                    </div>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-medium text-gray-900">Role</h3>
                    <p className="text-sm text-gray-500">{user?.role}</p>
                  </div>
                </div>
              </div>

              {/* Quick Action */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-medium text-gray-900">Quick Action</h3>
                    <p className="text-sm text-gray-500">
                      {isTeacher && 'Create new class'}
                      {isStudent && 'Scan QR code'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {isTeacher && (
                <>
                  {/* Teacher: Class Management */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Class Management</h3>
                    <div className="space-y-3">
                      <button 
                        onClick={() => setActiveView('classes')}
                        className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                      >
                        <div className="flex items-center">
                          <svg className="h-5 w-5 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          <div>
                            <p className="font-medium text-gray-900">Manage Classes</p>
                            <p className="text-sm text-gray-500">Create and manage your classes</p>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Teacher: QR Attendance */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">QR Attendance</h3>
                    <div className="space-y-3">
                      <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors">
                        <div className="flex items-center">
                          <svg className="h-5 w-5 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                          </svg>
                          <div>
                            <p className="font-medium text-gray-900">Start Attendance Session</p>
                            <p className="text-sm text-gray-500">Generate QR code for student check-in</p>
                          </div>
                        </div>
                      </button>
                      
                      <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors">
                        <div className="flex items-center">
                          <svg className="h-5 w-5 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          <div>
                            <p className="font-medium text-gray-900">View Reports</p>
                            <p className="text-sm text-gray-500">Check attendance statistics and reports</p>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                </>
              )}

              {isStudent && (
                <>
                  {/* Student: My Classes */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">My Classes</h3>
                    <div className="space-y-3">
                      <button 
                        onClick={() => setActiveView('classes')}
                        className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                      >
                        <div className="flex items-center">
                          <svg className="h-5 w-5 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                          <div>
                            <p className="font-medium text-gray-900">View Enrolled Classes</p>
                            <p className="text-sm text-gray-500">See all your registered classes</p>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Student: QR Check-in */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Attendance Check-in</h3>
                    <div className="space-y-3">
                      <button 
                        onClick={() => setActiveView('qr-scanner')}
                        className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors"
                      >
                        <div className="flex items-center">
                          <svg className="h-5 w-5 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                          </svg>
                          <div>
                            <p className="font-medium text-gray-900">Scan QR Code</p>
                            <p className="text-sm text-gray-500">Check-in to attendance session</p>
                          </div>
                        </div>
                      </button>
                      
                      <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors">
                        <div className="flex items-center">
                          <svg className="h-5 w-5 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          <div>
                            <p className="font-medium text-gray-900">My Attendance History</p>
                            <p className="text-sm text-gray-500">View your attendance records</p>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* System Info */}
            {healthStatus && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">System Information</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Server Status</p>
                    <p className="font-medium text-green-600">Online</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Database</p>
                    <p className="font-medium text-green-600">Connected</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Environment</p>
                    <p className="font-medium">Production</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Team</p>
                    <p className="font-medium text-blue-600">LIGHTBRAVE TEAM</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <DashboardLayout>
      {/* Navigation Tabs */}
      {activeView !== 'overview' && (
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveView('overview')}
              className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm"
            >
              ← Back to Overview
            </button>
          </nav>
        </div>
      )}

      {renderContent()}
    </DashboardLayout>
  );
};

export default DashboardPage;
