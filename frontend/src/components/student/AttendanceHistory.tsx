/**
 * AttendanceHistory Component
 * Student Management System - DTECH TEAM
 * Hiển thị lịch sử điểm danh của sinh viên với thống kê chi tiết
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ApiService from '@/services/ApiService';
import { Calendar, Clock, BookOpen, TrendingUp, Award } from 'lucide-react';

interface AttendanceRecord {
  id: string;
  status: 'PRESENT' | 'LATE' | 'ABSENT';
  checkedAt: string;
  createdAt: string;
  session: {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    class: {
      id: string;
      name: string;
      teacher: {
        name: string;
        email: string;
      };
    };
  };
}

interface ClassStats {
  className: string;
  totalSessions: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  attendanceRate: number;
  records: AttendanceRecord[];
}

interface AttendanceHistoryProps {
  refreshTrigger?: number;
  classId?: string;
}

const AttendanceHistory: React.FC<AttendanceHistoryProps> = ({ refreshTrigger, classId }) => {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'detailed' | 'by-class'>('overview');

  const fetchAttendanceHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await ApiService.getAttendanceHistory(classId);
      
      if (response.success) {
        setAttendanceRecords(response.data);
      } else {
        setError(response.message || 'Failed to fetch attendance history');
      }
    } catch (err) {
      console.error('Error fetching attendance history:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    fetchAttendanceHistory();
  }, [refreshTrigger, classId, fetchAttendanceHistory]);

  // Calculate overall statistics
  const getOverallStats = () => {
    const total = attendanceRecords.length;
    const present = attendanceRecords.filter(r => r.status === 'PRESENT').length;
    const late = attendanceRecords.filter(r => r.status === 'LATE').length;
    const absent = attendanceRecords.filter(r => r.status === 'ABSENT').length;
    const attendanceRate = total > 0 ? ((present + late) / total * 100) : 0;

    return { total, present, late, absent, attendanceRate };
  };

  // Group records by class for detailed analysis
  const getClassStats = (): ClassStats[] => {
    const classMap = new Map<string, ClassStats>();

    attendanceRecords.forEach(record => {
      const classId = record.session.class.id;
      const className = record.session.class.name;

      if (!classMap.has(classId)) {
        classMap.set(classId, {
          className,
          totalSessions: 0,
          presentCount: 0,
          lateCount: 0,
          absentCount: 0,
          attendanceRate: 0,
          records: []
        });
      }

      const stats = classMap.get(classId)!;
      stats.records.push(record);
      stats.totalSessions++;

      if (record.status === 'PRESENT') stats.presentCount++;
      else if (record.status === 'LATE') stats.lateCount++;
      else if (record.status === 'ABSENT') stats.absentCount++;
    });

    // Calculate attendance rates
    classMap.forEach(stats => {
      if (stats.totalSessions > 0) {
        stats.attendanceRate = ((stats.presentCount + stats.lateCount) / stats.totalSessions) * 100;
      }
    });

    return Array.from(classMap.values()).sort((a, b) => b.attendanceRate - a.attendanceRate);
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      PRESENT: 'bg-green-100 text-green-800',
      LATE: 'bg-yellow-100 text-yellow-800',
      ABSENT: 'bg-red-100 text-red-800'
    };

    const statusText = {
      PRESENT: '✅ Present',
      LATE: '⏰ Late',
      ABSENT: '❌ Absent'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusClasses[status as keyof typeof statusClasses]}`}>
        {statusText[status as keyof typeof statusText] || status}
      </span>
    );
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mr-4"></div>
          <span className="text-lg">Loading attendance history...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 text-lg mb-4">❌ {error}</div>
        <button
          onClick={fetchAttendanceHistory}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const overallStats = getOverallStats();
  const classStats = getClassStats();

  return (
    <div className="space-y-6 animate__animated animate__fadeIn animate__slower">
      {/* View Mode Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg ">
        <button
          onClick={() => setViewMode('overview')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            viewMode === 'overview' 
              ? 'bg-white text-blue-600 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          📊 Overview
        </button>
        <button
          onClick={() => setViewMode('by-class')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            viewMode === 'by-class' 
              ? 'bg-white text-blue-600 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          📚  Classroom
        </button>
        <button
          onClick={() => setViewMode('detailed')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            viewMode === 'detailed' 
              ? 'bg-white text-blue-600 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          📋 Detailed
        </button>
      </div>

      {/* Overview Mode */}
      {viewMode === 'overview' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Total Sessions</p>
                  <p className="text-3xl font-bold">{overallStats.total}</p>
                </div>
                <Calendar className="w-8 h-8 text-blue-200" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Present</p>
                  <p className="text-3xl font-bold">{overallStats.present}</p>
                </div>
                <Award className="w-8 h-8 text-green-200" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white p-6 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-sm">Late</p>
                  <p className="text-3xl font-bold">{overallStats.late}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-200" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm">Absent</p>
                  <p className="text-3xl font-bold">{overallStats.absent}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-red-200" />
              </div>
            </div>
          </div>

          {/* Attendance Rate */}
          <div className="bg-white border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">📈 Attendance Performance</h3>
              <div className={`px-4 py-2 rounded-full text-sm font-medium ${
                overallStats.attendanceRate >= 90 ? 'bg-green-100 text-green-800' :
                overallStats.attendanceRate >= 75 ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {overallStats.attendanceRate.toFixed(1)}% Overall
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div 
                className={`h-4 rounded-full transition-all duration-500 ${
                  overallStats.attendanceRate >= 90 ? 'bg-green-500' :
                  overallStats.attendanceRate >= 75 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${overallStats.attendanceRate}%` }}
              ></div>
            </div>
            <div className="mt-2 text-sm text-gray-600">
              {overallStats.attendanceRate >= 90 ? '🎉 Excellent attendance!' :
               overallStats.attendanceRate >= 75 ? '👍 Good attendance!' :
               '⚠️ Consider improving attendance'}
            </div>
          </div>
        </div>
      )}

      {/* By Class Mode */}
      {viewMode === 'by-class' && (
        <div className="space-y-4">
          {classStats.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>No attendance records found</p>
            </div>
          ) : (
            classStats.map((classData, index) => (
              <div key={index} className="bg-white border rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    📚 {classData.className}
                  </h3>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    classData.attendanceRate >= 90 ? 'bg-green-100 text-green-800' :
                    classData.attendanceRate >= 75 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {classData.attendanceRate.toFixed(1)}%
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{classData.totalSessions}</div>
                    <div className="text-sm text-gray-600">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{classData.presentCount}</div>
                    <div className="text-sm text-gray-600">Present</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{classData.lateCount}</div>
                    <div className="text-sm text-gray-600">Late</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{classData.absentCount}</div>
                    <div className="text-sm text-gray-600">Absent</div>
                  </div>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      classData.attendanceRate >= 90 ? 'bg-green-500' :
                      classData.attendanceRate >= 75 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${classData.attendanceRate}%` }}
                  ></div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Detailed Mode */}
      {viewMode === 'detailed' && (
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="p-4 bg-gray-50 border-b">
            <h3 className="text-lg font-semibold">📋 Detailed Attendance Records</h3>
          </div>
          
          {attendanceRecords.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-4">📚</div>
              <p className="text-lg">No attendance records yet</p>
              <p className="text-sm mt-2">Start scanning QR codes to build your attendance history!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Session</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Class</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Teacher</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Status</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Check-in Time</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceRecords.map((record, index) => (
                    <tr key={record.id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatDate(record.session.startTime)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{record.session.title}</div>
                        {/* <div className="text-xs text-gray-500">
                          {new Date(record.session.startTime).toLocaleTimeString()} - 
                          {new Date(record.session.endTime).toLocaleTimeString()}
                        </div> */}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {record.session.class.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {record.session.class.teacher.name}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(record.status)}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600">
                        {record.checkedAt ? formatDateTime(record.checkedAt) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Refresh Button */}
      <div className="flex justify-center">
        <button
          onClick={fetchAttendanceHistory}
          className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <span>🔄</span>
          <span>Refresh Data</span>
        </button>
      </div>
    </div>
  );
};

export default AttendanceHistory;
