'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { BookOpen, Calendar, CheckCircle, QrCode, Camera, History, UserCheck, UserX, Clock, Trash2, LogOut, Award, CreditCard, ChevronRight, X, FileText } from 'lucide-react';
import QRScanner from '@/components/student/QRScanner';
import AttendanceHistory from '@/components/student/AttendanceHistory';
import StudentGradesModal from '@/components/student/StudentGradesModal';
import StudentAssignmentsModal from '@/components/student/StudentAssignmentsModal';
import StudentTuitionModal from '@/components/student/StudentTuitionModal';
import TuitionReminderModal from '@/components/student/TuitionReminderModal';
import StudentMaterialsModal from '@/components/student/StudentMaterialsModal';
import ApiService from '@/services/ApiService';
import { API_BASE_URL } from '@/config/api';

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
  const [isGradesOpen, setIsGradesOpen] = useState(false);
  const [isAssignmentsOpen, setIsAssignmentsOpen] = useState(false);
  const [selectedClassForAssignments, setSelectedClassForAssignments] = useState<string | undefined>(undefined);
  const [pendingAssignmentsCount, setPendingAssignmentsCount] = useState<number>(0);
  const [isTuitionOpen, setIsTuitionOpen] = useState(false);
  const [isReminderOpen, setIsReminderOpen] = useState(false);
  const [selectedClassForMaterials, setSelectedClassForMaterials] = useState<{ id: string; name: string } | null>(null);
  const [isMaterialsPickerOpen, setIsMaterialsPickerOpen] = useState(false);
  const [unpaidTuitionData, setUnpaidTuitionData] = useState<{
    count: number;
    totalRemaining: number;
    fees: any[];
  }>({ count: 0, totalRemaining: 0, fees: [] });
  const [studentCode, setStudentCode] = useState<string>(user?.studentProfile?.studentCode || '');
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
    fetchProfile();
    checkUnpaidTuition();
    fetchAssignmentsCount();
  }, [refreshTrigger]); // Refresh stats when refreshTrigger changes

  // Tự động đồng bộ khi có sự kiện — focus throttle 60 giây để tránh rate limit
  useEffect(() => {
    let lastFocusFetch = 0;
    const THROTTLE_MS = 60_000; // 60 giây cho dashboard (3 API calls/lần)

    const handleSync = () => {
      fetchAssignmentsCount();
      fetchStudentStats();
    };
    const handleFocus = () => {
      const now = Date.now();
      if (now - lastFocusFetch >= THROTTLE_MS) {
        lastFocusFetch = now;
        fetchAssignmentsCount();
        fetchStudentStats();
        checkUnpaidTuition();
      }
    };

    window.addEventListener('sms:refresh-assignments', handleSync);
    window.addEventListener('sms:refresh-grades', handleSync);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('sms:refresh-assignments', handleSync);
      window.removeEventListener('sms:refresh-grades', handleSync);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const fetchAssignmentsCount = async () => {
    try {
      const res = await ApiService.getStudentAssignments();
      if (res?.success && res.summary) {
        setPendingAssignmentsCount(res.summary.pendingCount || 0);
      }
    } catch (err) {
      console.error('Error fetching assignments count:', err);
    }
  };

  const checkUnpaidTuition = async () => {
    try {
      const res = await ApiService.getStudentTuitionFees();
      if (res?.success && res.data) {
        const unpaidList = res.data.filter((f: any) => f.status !== 'PAID');
        const remaining = res.summary?.totalRemaining || 0;
        setUnpaidTuitionData({
          count: unpaidList.length,
          totalRemaining: remaining,
          fees: unpaidList
        });

        // Kiểm tra xem đã tắt popup trong phiên (session) hiện tại chưa
        const isDismissed = sessionStorage.getItem('tuition_reminder_dismissed');
        if (unpaidList.length > 0 && remaining > 0 && !isDismissed) {
          setIsReminderOpen(true);
        }
      }
    } catch (e) { }
  };

  const fetchProfile = async () => {
    try {
      const res = await ApiService.getStudentProfile();
      if (res.success && res.data?.studentProfile?.studentCode) {
        setStudentCode(res.data.studentProfile.studentCode);
      }
    } catch (e) { }
  };

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/student/classes`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const rawData = data.data || [];
        // Map data để hỗ trợ cả cấu trúc lồng nhau (enrollment.class) lẫn cấu trúc phẳng
        const classesData: Class[] = rawData.map((item: any) => {
          const c = item.class || item;
          return {
            id: c.id || item.classId || item.id,
            name: c.name || 'Unnamed Class',
            description: c.description || '',
            teacher: c.teacher || { name: 'Chưa cập nhật', email: '' },
          };
        });
        setClasses(classesData);

        // Update stats
        setStats(prev => ({
          ...prev,
          totalClasses: classesData.length
        }));
      }
    } catch (error) {
      // console.error('Error fetching classes:', error);
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
      // console.error('Error fetching student stats:', error);
    }
  };

  const handleQRScan = async (qrCode: string) => {
    // console.log('🔥 QR Scan started!');
    // console.log('📊 QR Code received:', qrCode);
    // console.log('🔍 QR Code type:', typeof qrCode);
    // console.log('📏 QR Code length:', qrCode.length);
    // console.log('🧪 QR Code preview:', qrCode.substring(0, 100) + (qrCode.length > 100 ? '...' : ''));

    // Validate QR format before sending
    try {
      const parsedQR = JSON.parse(qrCode);
      // console.log('✅ QR validation successful:', parsedQR);
      // console.log('🔑 Required fields check:', {
      //   hasSessionId: !!parsedQR.sessionId,
      //   hasQrCode: !!parsedQR.qrCode,
      //   hasClassId: !!parsedQR.classId,
      //   hasTimestamp: !!parsedQR.timestamp
      // });
    } catch (validateError) {
      // console.error('❌ QR validation failed:', validateError);
      setScanResult('❌ Invalid QR code format');
      setIsQRScannerOpen(false);
      return;
    }

    try {
      // console.log('🌐 Sending API request...');
      const response = await ApiService.scanQRAndCheckIn(qrCode);
      // console.log('✅ Response data:', response);

      if (response.success) {
        // console.log('✅ Scan successful!');
        setScanResult(`✅ ${response.message || 'Check-in successful! You have been marked as present.'}`);
        setIsQRScannerOpen(false);

        // Refresh attendance history
        setRefreshTrigger(prev => prev + 1);

        // Auto-hide success message after 5 seconds
        setTimeout(() => setScanResult(''), 5000);
      } else {
        // console.log('❌ Scan failed:', response.message);
        setScanResult(`❌ Error: ${response.message || 'Check-in failed'}`);
        setIsQRScannerOpen(false);
      }
    } catch (error) {
      // console.error('❌ QR Scan error:', error);

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
      // console.error('Delete account error:', error);
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
    <div className=" bg-gray-50 ">
      {/* Header */}
      <header className="bg-white shadow-sm border-b rounded-lg shadow-xl" style={{ backgroundImage: 'linear-gradient(-20deg, rgb(223, 239, 255) 0%, rgb(255, 249, 235) 100%, rgb(252, 236, 236) 100%)' }}>
        <div className="max-w-7xl  mx-auto px-4 sm:px-6 lg:px-8" >
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 text-center pt-3">👨‍🎓STUDENT DASHBOARD</h1>

          <div className="flex justify-between items-center py-4">

            <div>
              <p className="text-red-600 font-bold text-md md:text-xl flex items-center gap-2">WELCOME,
                <div className="flex items-center justify-center space-x-1">
                  {(studentCode || user?.studentProfile?.studentCode) && (
                    <div className="flex items-center gap-1.5 text-green-600 font-mono  rounded-full w-fit ">
                      {/* <span className="font-bold">MSSV:</span> */}
                      <span className="font-extrabold tracking-wide">{studentCode || user?.studentProfile?.studentCode}</span>
                    </div>
                  )}
                </div>
              </p>
              <p className="text-black  flex items-center gap-2 my-1">
                <div className='flex items-center gap-1  text-gray-600'>
                  <img src="icons/name.png" width="25" height="25" alt="" />
                  <span className='hidden md:block'>Your name: </span>
                </div>
                <p className='font-bold truncate'>
                  {user?.name || user?.email || 'Student'}</p>
              </p>
              <p className="text-black flex items-center gap-2">
                <div className='flex items-center gap-1  text-gray-600'>
                  <img src="icons/email.png" width="25" height="25" alt="" />
                  <span className='hidden md:block'>Your email: </span>
                </div>
                <p className='font-bold truncate'>
                  {user?.email || 'Chưa xác thực email'}</p>
              </p>

            </div>
            <div className="flex flex-row flex-wrap items-center justify-end gap-2">
              <button
                onClick={() => {
                  setSelectedClassForAssignments(undefined);
                  setIsAssignmentsOpen(true);
                }}
                className="bg-purple-600 text-white p-3 md:px-4 md:py-2 rounded-full shadow-md hover:bg-purple-700 flex items-center space-x-0 md:space-x-2 cursor-pointer transition-colors relative"
                title="Bài Tập & Nộp Bài"
              >
                <FileText className="w-4 h-4" />
                <span className='hidden md:block font-medium'>Bài Tập</span>
                {pendingAssignmentsCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white ring-2 ring-white shadow-sm">
                    {pendingAssignmentsCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setIsGradesOpen(true)}
                className="bg-amber-500 text-white p-3 md:px-4 md:py-2 rounded-full shadow-md hover:bg-amber-600 flex items-center space-x-0 md:space-x-2 cursor-pointer transition-colors"
                title="Bảng Điểm"
              >
                <Award className="w-4 h-4" />
                <span className='hidden md:block font-medium'>Bảng Điểm</span>
              </button>
              <button
                onClick={() => {
                  if (classes.length === 1) {
                    setSelectedClassForMaterials({ id: classes[0].id, name: classes[0].name });
                  } else {
                    setIsMaterialsPickerOpen(true);
                  }
                }}
                className="bg-indigo-600 text-white p-3 md:px-4 md:py-2 rounded-full shadow-md hover:bg-indigo-700 flex items-center space-x-0 md:space-x-2 cursor-pointer transition-colors"
                title="Tài Liệu Học Tập"
              >
                <BookOpen className="w-4 h-4" />
                <span className='hidden md:block font-medium'>Tài Liệu</span>
              </button>
              <button
                onClick={() => setIsTuitionOpen(true)}
                className="bg-emerald-600 text-white p-3 md:px-4 md:py-2 rounded-full shadow-md hover:bg-emerald-700 flex items-center space-x-0 md:space-x-2 cursor-pointer transition-colors relative"
                title="Học Phí & Công Nợ"
              >
                <CreditCard className="w-4 h-4" />
                <span className='hidden md:block font-medium'>Học Phí</span>
                {unpaidTuitionData.count > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white animate-pulse shadow-sm">
                    {unpaidTuitionData.count}
                  </span>
                )}
              </button>
              <button
                onClick={() => setIsHistoryOpen(true)}
                className="bg-blue-600 text-white p-3 md:px-4 md:py-2 rounded-full shadow-md hover:bg-blue-700 flex items-center space-x-0 md:space-x-2 cursor-pointer transition-colors"
              >
                <History className="w-4 h-4 " />
                <span className='hidden md:block font-medium'>History</span>
              </button>
              {/* <button
                onClick={handleDeleteAccount}
                className="bg-red-600 text-white p-3 md:px-4 md:py-2 rounded-full hover:bg-red-700 flex items-center space-x-0 md:space-x-2 block md:hidden"
                title="Delete Account"
              >
                <Trash2 className="w-4 h-4" />
                <span className='hidden md:block'>Delete</span>
              </button> */}
            </div>
          </div>
        </div>
      </header>

      {/* Quick Actions */}
      <div className=" border-2 p-6 rounded-lg shadow-2xl mb-4 mt-8"
        style={{ backgroundImage: 'linear-gradient(to top, rgb(255, 255, 255) 0%, rgb(237, 237, 237) 100%)' }}>
        <div className="text-center">
          <h3 className="text-xl font-bold mb-2 text-blue-700">🎯 Quick Check-in</h3>
          <p className="text-gray-600 mb-4">Scan the QR code displayed by your teacher to mark attendance</p>
          <button
            onClick={() => setIsQRScannerOpen(true)}
            className="bg-green-600 text-white px-8 py-3 rounded-full shadow-md hover:bg-green-700 flex items-center space-x-2 mx-auto font-medium text-lg cursor-pointer"
          >
            <Camera className="w-6 h-6" />
            <span>Open QR Scanner</span>
          </button>
        </div>
      </div>

      {/* Scan Result Alert */}
      {scanResult && (
        <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4`}>
          <div className={`p-4 rounded-lg border-2 ${scanResult.includes('✅')
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
          <div className="bg-white p-4 rounded-lg shadow-lg col-span-2 md:col-span-2 lg:col-span-1" >
            <div className="flex items-center">
              <BookOpen className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-xs md:text-sm font-medium text-gray-600">Classes</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900">{stats.totalClasses}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-lg col-span-2 md:col-span-1 ">
            <div className="flex items-center">
              <Calendar className="w-6 h-6 md:w-8 md:h-8 text-green-600" />
              <div className="ml-3">
                <p className="text-xs md:text-sm font-medium text-gray-600">Today</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900">{stats.todayCheckins}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-lg col-span-2 md:col-span-1 ">
            <div className="flex items-center">
              <CheckCircle className="w-6 h-6 md:w-8 md:h-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-xs md:text-sm font-medium text-gray-600">Records</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900">{stats.totalRecords}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-lg col-span-1 md:col-span-2 lg:col-span-1">
            <div className="flex items-center">
              <QrCode className="w-6 h-6 md:w-8 md:h-8 text-orange-600" />
              <div className="ml-3">
                <p className="text-xs md:text-sm font-medium text-gray-600">Scans</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900">{stats.totalScans}</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg shadow-lg border border-green-200">
            <div className="flex items-center">
              <UserCheck className="w-6 h-6 md:w-8 md:h-8 text-green-600" />
              <div className="ml-3">
                <p className="text-xs md:text-sm font-medium text-green-700">Present</p>
                <p className="text-xl md:text-2xl font-bold text-green-800">{stats.presentSessions}</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg shadow-lg border border-yellow-200">
            <div className="flex items-center">
              <Clock className="w-6 h-6 md:w-8 md:h-8 text-yellow-600" />
              <div className="ml-3">
                <p className="text-xs md:text-sm font-medium text-yellow-700">Late</p>
                <p className="text-xl md:text-2xl font-bold text-yellow-800">{stats.lateSessions}</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg shadow-lg border border-red-200">
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
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              Lớp Học Của Tôi ({classes.length})
            </h2>
          </div>

          {classes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {classes.map((cls) => {
                const classId = cls.id || (cls as any).class?.id;
                const className = cls.name || (cls as any).class?.name || 'Unnamed Class';
                const description = cls.description || (cls as any).class?.description;
                const teacherName = cls.teacher?.name || (cls as any).class?.teacher?.name;
                const teacherEmail = cls.teacher?.email || (cls as any).class?.teacher?.email;

                return (
                  <div
                    key={classId}
                    className="bg-white rounded-2xl shadow-sm hover:shadow-md border border-gray-200 transition-all duration-200 p-5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="text-base font-bold text-gray-900 line-clamp-1">{className}</h3>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                          Đang học
                        </span>
                      </div>

                      <p className="text-xs text-gray-500 line-clamp-2 mb-4 min-h-[32px]">
                        {description || 'Không có mô tả cho lớp học này.'}
                      </p>

                      <div className="text-xs text-gray-600 bg-gray-50 rounded-xl p-3 mb-4 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-400 font-medium">Giảng viên:</span>
                          <span className="font-semibold text-gray-800">{teacherName || 'Chưa cập nhật'}</span>
                        </div>
                        {teacherEmail && (
                          <div className="text-[11px] text-gray-500 truncate">
                            {teacherEmail}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 pt-2.5 border-t border-gray-100">
                      <button
                        onClick={() => setSelectedClassForMaterials({ id: classId, name: className })}
                        className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs transition-colors cursor-pointer"
                        title="Tài liệu học tập"
                      >
                        <BookOpen className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Tài liệu</span>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedClassForAssignments(classId);
                          setIsAssignmentsOpen(true);
                        }}
                        className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold text-xs transition-colors cursor-pointer"
                        title="Bài tập & Hạn nộp"
                      >
                        <FileText className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Bài tập</span>
                      </button>
                      <button
                        onClick={() => setIsGradesOpen(true)}
                        className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold text-xs transition-colors cursor-pointer"
                        title="Bảng điểm học vụ"
                      >
                        <Award className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Điểm</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-8 text-center">
              <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <h3 className="text-base font-semibold text-gray-800 mb-1">Chưa tham gia lớp học nào</h3>
              <p className="text-xs text-gray-500">Giảng viên sẽ thêm bạn vào lớp qua email hoặc MSSV.</p>
            </div>
          )}
        </div>
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
        <AttendanceHistory
          refreshTrigger={refreshTrigger}
          onClose={() => setIsHistoryOpen(false)}
        />
      )}

      {/* Student Grades Modal */}
      {isGradesOpen && (
        <StudentGradesModal onClose={() => setIsGradesOpen(false)} />
      )}

      {/* Student Tuition Modal */}
      <StudentTuitionModal
        isOpen={isTuitionOpen}
        onClose={() => {
          setIsTuitionOpen(false);
          checkUnpaidTuition();
        }}
      />

      {/* Tuition Reminder Modal (Session-based Alert) */}
      <TuitionReminderModal
        isOpen={isReminderOpen}
        onClose={() => {
          sessionStorage.setItem('tuition_reminder_dismissed', 'true');
          setIsReminderOpen(false);
        }}
        onOpenTuition={() => {
          sessionStorage.setItem('tuition_reminder_dismissed', 'true');
          setIsReminderOpen(false);
          setIsTuitionOpen(true);
        }}
        fees={unpaidTuitionData.fees}
        totalRemaining={unpaidTuitionData.totalRemaining}
        studentName={user?.name}
        studentCode={studentCode || user?.studentProfile?.studentCode}
      />

      {/* Materials Class Picker Modal (when student clicks top button and has multiple classes) */}
      {isMaterialsPickerOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                Chọn lớp để xem tài liệu
              </h3>
              <button
                onClick={() => setIsMaterialsPickerOpen(false)}
                className="text-gray-400 hover:text-gray-600 rounded-full p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {classes.length > 0 ? (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {classes.map((cls) => {
                  const classId = cls.id || (cls as any).class?.id;
                  const className = cls.name || (cls as any).class?.name || 'Lớp học';
                  const teacherName = cls.teacher?.name || (cls as any).class?.teacher?.name;
                  return (
                    <button
                      key={classId}
                      onClick={() => {
                        setIsMaterialsPickerOpen(false);
                        setSelectedClassForMaterials({ id: classId, name: className });
                      }}
                      className="w-full text-left p-3 rounded-xl border border-gray-100 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <div>
                        <p className="font-semibold text-sm text-gray-800 group-hover:text-indigo-600">{className}</p>
                        <p className="text-xs text-gray-400">{teacherName || 'Giảng viên'}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-6">Bạn chưa có lớp học nào.</p>
            )}
          </div>
        </div>
      )}

      {/* Student Materials Modal */}
      {selectedClassForMaterials && (
        <StudentMaterialsModal
          classId={selectedClassForMaterials.id}
          className={selectedClassForMaterials.name}
          onClose={() => setSelectedClassForMaterials(null)}
        />
      )}

      {/* Student Assignments Modal */}
      {isAssignmentsOpen && (
        <StudentAssignmentsModal
          initialClassId={selectedClassForAssignments}
          onClose={() => {
            setIsAssignmentsOpen(false);
            fetchAssignmentsCount();
          }}
        />
      )}
    </div>
  );
}
