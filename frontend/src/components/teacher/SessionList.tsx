'use client';

import React, { useState, useEffect } from 'react';
import ApiService from '@/services/ApiService';
import { Plus, QrCode, Play, Trash2, CheckCircle, Users } from 'lucide-react';
import ManualAttendance from './ManualAttendance';

interface SessionListProps {
  classId: string;
}

interface Session {
  id: string;
  title: string;
  createdAt: string;
  isActive: boolean;
  qrCode: string | null;
  qrExpiresAt: string | null;
}

export default function SessionList({ classId }: SessionListProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  
  // Manual attendance state
  const [selectedSessionForAttendance, setSelectedSessionForAttendance] = useState<Session | null>(null);

  useEffect(() => {
    fetchSessions();
  }, [classId]);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/teacher/classes/${classId}/sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSessions(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const createSession = async () => {
    if (!newTitle.trim()) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/teacher/classes/${classId}/sessions`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: newTitle })
      });
      const data = await res.json();
      if (data.success) {
        setIsCreating(false);
        setNewTitle('');
        fetchSessions();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteSession = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa buổi học này?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/teacher/sessions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        fetchSessions();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="p-4 text-center">Đang tải buổi học...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <h3 className="font-bold text-gray-700">Danh sách buổi học</h3>
        <button 
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          <Plus size={18} /> Tạo Buổi Học
        </button>
      </div>

      {isCreating && (
        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex gap-3">
          <input 
            type="text" 
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none"
            placeholder="Tên buổi học (VD: Tuần 1 - Nhập môn)"
            autoFocus
          />
          <button onClick={createSession} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium">
            Lưu
          </button>
          <button onClick={() => setIsCreating(false)} className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 font-medium">
            Hủy
          </button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sessions.length === 0 ? (
          <div className="col-span-full text-center py-10 bg-white rounded-xl border border-dashed border-gray-300 text-gray-500">
            Chưa có buổi học nào.
          </div>
        ) : (
          sessions.map(session => (
            <div key={session.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 border-b border-gray-100 flex-1">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-gray-800 line-clamp-2">{session.title}</h4>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${session.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {session.isActive ? 'Đang diễn ra' : 'Đã kết thúc'}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Tạo lúc: {new Date(session.createdAt).toLocaleString('vi-VN')}
                </p>
              </div>
              <div className="p-3 bg-gray-50 grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setSelectedSessionForAttendance(session)}
                  className="flex items-center justify-center gap-1.5 py-2 px-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-xs font-medium"
                >
                  <Users size={16} /> Điểm danh thủ công
                </button>
                <button 
                  onClick={() => deleteSession(session.id)}
                  className="flex items-center justify-center gap-1.5 py-2 px-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-xs font-medium"
                >
                  <Trash2 size={16} /> Xóa buổi học
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedSessionForAttendance && (
        <ManualAttendance 
          session={selectedSessionForAttendance} 
          classId={classId}
          onClose={() => setSelectedSessionForAttendance(null)} 
        />
      )}
    </div>
  );
}
