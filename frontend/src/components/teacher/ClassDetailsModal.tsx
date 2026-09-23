'use client';

import React, { useState, useEffect } from 'react';
import { X, Users, Calendar, Award, BookOpen } from 'lucide-react';
import Gradebook from './Gradebook';
import StudentDirectory from './StudentDirectory';
import SessionList from './SessionList';
import ClassMaterialsPanel from './ClassMaterialsPanel';

interface ClassDetailsModalProps {
  classId: string;
  className: string;
  onClose: () => void;
  onRefresh: () => void; // for refreshing external state if needed
}

export default function ClassDetailsModal({ classId, className, onClose, onRefresh }: ClassDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'students' | 'sessions' | 'grades' | 'materials'>('students');

  return (
    <div className="fixed inset-0 bg-gray-900/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-6xl max-h-[90vh] flex flex-col animate__animated animate__zoomIn animate__faster">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Quản lý lớp: <span className="text-indigo-600">{className}</span></h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6 pt-4 space-x-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('students')}
            className={`flex items-center gap-2 pb-3 border-b-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'students' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            <Users size={18} /> Danh sách Sinh viên
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`flex items-center gap-2 pb-3 border-b-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'sessions' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            <Calendar size={18} /> Điểm danh & Buổi học
          </button>
          <button
            onClick={() => setActiveTab('grades')}
            className={`flex items-center gap-2 pb-3 border-b-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'grades' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            <Award size={18} /> Bảng Điểm (Gradebook)
          </button>
          <button
            onClick={() => setActiveTab('materials')}
            className={`flex items-center gap-2 pb-3 border-b-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'materials' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            <BookOpen size={18} /> Tài liệu học tập
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {activeTab === 'students' && (
            <StudentDirectory 
              targetClassId={classId} 
              targetClassName={className} 
              onStudentAdded={onRefresh} 
            />
          )}
          {activeTab === 'sessions' && (
            <SessionList classId={classId} />
          )}
          {activeTab === 'grades' && (
            <Gradebook classId={classId} />
          )}
          {activeTab === 'materials' && (
            <ClassMaterialsPanel 
              classId={classId} 
              className={className} 
              token={typeof window !== 'undefined' ? localStorage.getItem('token') : null} 
            />
          )}
        </div>
      </div>
    </div>
  );
}
