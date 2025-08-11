'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { BookOpen, Calendar, CheckCircle, QrCode, Camera, History, UserCheck, UserX, Clock, Trash2, LogOut } from 'lucide-react';
import QRScanner from '@/components/student/QRScanner';
import AttendanceHistory from '@/components/student/AttendanceHistory';
import ApiService from '@/services/ApiService';

interface Class {
  id: string;
  name: string;
  description: string;
  teacher: {
    name: string;
    email: string;
  };
}

interface AttendanceRecord {
  id: string;
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'INVALID';
  checkedAt: string;
  createdAt?: string;
  checkinTime?: string;
  session: {
    id: string;
    title?: string;
    startTime: string;
    endTime: string;
    class: {
      id: string;
      name: string;
      teacher: {
        name: string;
      };
    };
  };
}

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [scanResult, setScanResult] = useState<string>('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Statistics states
  const [stats, setStats] = useState({
    totalClasses: 0,
    todayCheckins: 0,
    totalRecords: 0,
    totalScans: 0,
    presentSessions: 0,
    absentSessions: 0,
    lateSessions: 0
  });

  useEffect(() => {
    fetchClasses();
    fetchStudentStats();
  }, [refreshTrigger]); // Refresh stats when refreshTrigger changes

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://192.168.1.4:3001/api/student/classes', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const classesData = data.data || [];
        setClasses(classesData);
        
        // Update stats
        setStats(prev => ({
          ...prev,
          totalClasses: classesData.length
        }));
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentStats = async () => {
    try {
      const response = await ApiService.getAttendanceHistory();
      
      if (response.success) {
        const records = response.data || [];
        const today = new Date().toDateString();
        const todayRecords = records.filter((record: AttendanceRecord) => 
          new Date(record.checkedAt).toDateString() === today
        );
        
        // Calculate attendance statistics using same logic as AttendanceHistory
        const total = records.length;
        const present = records.filter((r: AttendanceRecord) => r.status === 'PRESENT').length;
        const late = records.filter((r: AttendanceRecord) => r.status === 'LATE').length;
        const absent = records.filter((r: AttendanceRecord) => r.status === 'ABSENT').length;
        
        setStats(prev => ({
          ...prev,
          totalRecords: total,
          totalScans: total, // QR scans = total attendance records
          todayCheckins: todayRecords.length,
          presentSessions: present,
          lateSessions: late,
          absentSessions: absent
        }));
      }
    } catch (error) {
      console.error('Error fetching student stats:', error);
    }
  };

  const handleQRScan = async (qrCode: string) => {
    console.log('🔥 QR Scan started!');
    console.log('📊 QR Code received:', qrCode);
    console.log('🔍 QR Code type:', typeof qrCode);
    console.log('📏 QR Code length:', qrCode.length);
    console.log('🧪 QR Code preview:', qrCode.substring(0, 100) + (qrCode.length > 100 ? '...' : ''));
    
    // Validate QR format before sending
    try {
      const parsedQR = JSON.parse(qrCode);
      console.log('✅ QR validation successful:', parsedQR);
      console.log('🔑 Required fields check:', {
        hasSessionId: !!parsedQR.sessionId,
        hasQrCode: !!parsedQR.qrCode,
        hasClassId: !!parsedQR.classId,
        hasTimestamp: !!parsedQR.timestamp
      });
    } catch (validateError) {
      console.error('❌ QR validation failed:', validateError);
      setScanResult('❌ Invalid QR code format');
      setIsQRScannerOpen(false);
      return;
    }
    
    try {
      console.log('🌐 Sending API request...');
      const response = await ApiService.scanQRAndCheckIn(qrCode);
      console.log('✅ Response data:', response);

      if (response.success) {
        console.log('✅ Scan successful!');
        setScanResult(`✅ ${response.message || 'Check-in successful! You have been marked as present.'}`);
        setIsQRScannerOpen(false);
        
        // Refresh attendance history
        setRefreshTrigger(prev => prev + 1);
        
        // Auto-hide success message after 5 seconds
        setTimeout(() => setScanResult(''), 5000);
      } else {
        console.log('❌ Scan failed:', response.message);
        setScanResult(`❌ Error: ${response.message || 'Check-in failed'}`);
        setIsQRScannerOpen(false);
      }
    } catch (error) {
      console.error('❌ QR Scan error:', error);
      
      // More detailed error message
      let errorMessage = '❌ Network error. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('Network connection failed')) {
          errorMessage = '❌ Cannot connect to server. Please check your internet connection.';
        } else if (error.message.includes('500')) {
          errorMessage = '❌ Server error. Please try again later.';
        } else if (error.message.includes('401')) {
          errorMessage = '❌ Session expired. Please login again.';
        } else {
          errorMessage = `❌ Error: ${error.message}`;
        }
      }
      
      setScanResult(errorMessage);
      setIsQRScannerOpen(false);
      
      // Auto-hide error message after 8 seconds
      setTimeout(() => setScanResult(''), 8000);
    }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 ">
      {/* Header */}
      <header className="bg-white shadow-sm border-b ">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" >
              <h1 className="text-2xl font-bold text-gray-900 text-center pt-3">👨‍🎓STUDENT DASHBOARD</h1>

          <div className="flex justify-between items-center py-4">
            
            <div>
              <p className="text-blue-600 font-bold">WELCOME BACK </p>
              <p className="text-gray-600">{user?.name || user?.email || 'Student'}</p>
              <p className="text-gray-600">{user?.email || 'Chưa xác thực email'}</p>
            </div>
            <div className="flex flex-col justify-center items-center gap-2">
              <button
                onClick={() => setIsHistoryOpen(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <History className="w-4 h-4" />
                <span>History</span>
              </button>
              <button
                onClick={handleDeleteAccount}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center space-x-2 block md:hidden"
                title="Delete Account"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Quick Actions */}
        <div className="bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-200 p-6 rounded-lg shadow-lg mb-4 mt-8">
          <div className="text-center">
            <h3 className="text-xl font-bold mb-2 text-blue-700">🎯 Quick Check-in</h3>
            <p className="text-gray-600 mb-4">Scan the QR code displayed by your teacher to mark attendance</p>
            <button
              onClick={() => setIsQRScannerOpen(true)}
              className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 flex items-center space-x-2 mx-auto font-medium text-lg"
            >
              <Camera className="w-6 h-6" />
              <span>Open QR Scanner</span>
            </button>
          </div>
        </div>

      {/* Scan Result Alert */}
      {scanResult && (
        <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4`}>
          <div className={`p-4 rounded-lg border-2 ${
            scanResult.includes('✅') 
              ? 'bg-green-50 border-green-300 text-green-700' 
              : 'bg-red-50 border-red-300 text-red-700'
          }`}>
            <p className="font-medium">{scanResult}</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow col-span-2 md:col-span-1">
            <div className="flex items-center">
              <BookOpen className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-xs md:text-sm font-medium text-gray-600">Classes</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900">{stats.totalClasses}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow col-span-2 md:col-span-1">
            <div className="flex items-center">
              <Calendar className="w-6 h-6 md:w-8 md:h-8 text-green-600" />
              <div className="ml-3">
                <p className="text-xs md:text-sm font-medium text-gray-600">Today</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900">{stats.todayCheckins}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <CheckCircle className="w-6 h-6 md:w-8 md:h-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-xs md:text-sm font-medium text-gray-600">Records</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900">{stats.totalRecords}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <QrCode className="w-6 h-6 md:w-8 md:h-8 text-orange-600" />
              <div className="ml-3">
                <p className="text-xs md:text-sm font-medium text-gray-600">Scans</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900">{stats.totalScans}</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg shadow border border-green-200">
            <div className="flex items-center">
              <UserCheck className="w-6 h-6 md:w-8 md:h-8 text-green-600" />
              <div className="ml-3">
                <p className="text-xs md:text-sm font-medium text-green-700">Present</p>
                <p className="text-xl md:text-2xl font-bold text-green-800">{stats.presentSessions}</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg shadow border border-yellow-200">
            <div className="flex items-center">
              <Clock className="w-6 h-6 md:w-8 md:h-8 text-yellow-600" />
              <div className="ml-3">
                <p className="text-xs md:text-sm font-medium text-yellow-700">Late</p>
                <p className="text-xl md:text-2xl font-bold text-yellow-800">{stats.lateSessions}</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg shadow border border-red-200">
            <div className="flex items-center">
              <UserX className="w-6 h-6 md:w-8 md:h-8 text-red-600" />
              <div className="ml-3">
                <p className="text-xs md:text-sm font-medium text-red-700">Absent</p>
                <p className="text-xl md:text-2xl font-bold text-red-800">{stats.absentSessions}</p>
              </div>
            </div>
          </div>
        </div>

        

        {/* Today's Attendance - Simplified */}
        {/* <div className="bg-white rounded-lg shadow-lg border mb-8">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🗓️ Today&apos;s Attendance</h3>
            <div className="text-center py-6 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>Click &quot;History&quot; to view your attendance records after scanning QR codes!</p>
            </div>
          </div>
        </div> */}

        {/* Classes Grid */}
        {/* <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">My Classes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((cls) => (
              <div key={cls.id} className="bg-white rounded-lg shadow border hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{cls?.name || 'Unnamed Class'}</h3>
                    <BookOpen className="w-6 h-6 text-blue-600" />
                  </div>
                  
                  <p className="text-gray-600 mb-4">{cls?.description || 'No description'}</p>
                  
                  <div className="border-t pt-4">
                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-700">Teacher</p>
                      <p className="text-sm text-gray-600">{cls?.teacher?.name || cls?.teacher?.email || 'Unknown Teacher'}</p>
                      <p className="text-xs text-gray-500">{cls?.teacher?.email || ''}</p>
                    </div>
                    
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm text-blue-700">
                        📱 Use the <strong>Scan QR</strong> button above when your teacher displays the attendance QR code
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {classes.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Classes Yet</h3>
              <p className="text-gray-600">You haven&apos;t been enrolled in any classes yet.</p>
            </div>
          )}
        </div> */}
      </div>

      {/* QR Scanner Modal */}
      {isQRScannerOpen && (
        <QRScanner
          isOpen={isQRScannerOpen}
          onScanSuccess={(qrCode: string) => handleQRScan(qrCode)}
          onClose={() => setIsQRScannerOpen(false)}
        />
      )}

      {/* Attendance History Modal */}
      {isHistoryOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[85vh] overflow-y-auto mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">📋 Attendance History</h3>
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="text-gray-500 hover:text-gray-700 text-3xl font-bold"
              >
                ×
              </button>
            </div>

            <AttendanceHistory refreshTrigger={refreshTrigger} />
          </div>
        </div>
      )}
    </div>
  );
}
