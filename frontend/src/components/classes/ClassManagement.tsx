/**
 * Class Management Component
 * Student Management System - DTECH TEAM
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ApiService from '@/services/ApiService';

interface Student {
  id: string;
  name: string;
  email: string;
}

interface ClassItem {
  id: string;
  name: string;
  description: string;
  teacherId: string;
  createdAt: string;
  students?: Student[];
}

interface ClassManagementProps {
  onSelectClass?: (classItem: ClassItem) => void;
}

const ClassManagement: React.FC<ClassManagementProps> = ({ onSelectClass }) => {
  const { isTeacher } = useAuth();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newClass, setNewClass] = useState({
    name: '',
    description: ''
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const response = await ApiService.getClasses();
      setClasses(response.data || []);
    } catch (error: unknown) {
      console.error('Failed to fetch classes:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load classes';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClass.name.trim()) return;

    try {
      setCreating(true);
      await ApiService.createClass({
        name: newClass.name,
        description: newClass.description
      });
      
      setNewClass({ name: '', description: '' });
      setShowCreateForm(false);
      fetchClasses(); // Refresh the list
    } catch (error: unknown) {
      console.error('Failed to create class:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create class';
      setError(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  const handleSelectClass = (classItem: ClassItem) => {
    onSelectClass?.(classItem);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              {isTeacher ? 'My Classes' : 'Enrolled Classes'}
            </h3>
            <p className="text-sm text-gray-500">
              {isTeacher ? 'Manage your classes and students' : 'View your enrolled classes'}
            </p>
          </div>
          {isTeacher && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
            >
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Class
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-400">
          <div className="flex">
            <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Create Class Form */}
      {showCreateForm && (
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <form onSubmit={handleCreateClass} className="space-y-4">
            <div>
              <label htmlFor="className" className="block text-sm font-medium text-gray-700 mb-1">
                Class Name *
              </label>
              <input
                type="text"
                id="className"
                value={newClass.name}
                onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Mathematics 101"
                required
              />
            </div>
            <div>
              <label htmlFor="classDescription" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="classDescription"
                value={newClass.description}
                onChange={(e) => setNewClass({ ...newClass, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="Brief description of the class..."
              />
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={creating || !newClass.name.trim()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {creating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  'Create Class'
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewClass({ name: '', description: '' });
                  setError('');
                }}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Classes List */}
      <div className="p-6">
        {classes.length === 0 ? (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Classes Found</h4>
            <p className="text-gray-500">
              {isTeacher 
                ? "You haven't created any classes yet. Click 'New Class' to get started."
                : "You're not enrolled in any classes yet."
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((classItem) => (
              <div
                key={classItem.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                onClick={() => handleSelectClass(classItem)}
              >
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-medium text-gray-900 flex-1">{classItem.name}</h4>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    {isTeacher ? 'Teaching' : 'Enrolled'}
                  </span>
                </div>
                
                {classItem.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {classItem.description}
                  </p>
                )}
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>
                    Created: {new Date(classItem.createdAt).toLocaleDateString()}
                  </span>
                  {classItem.students && (
                    <span>
                      {classItem.students.length} students
                    </span>
                  )}
                </div>
                
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex space-x-2">
                    {isTeacher ? (
                      <>
                        <button className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200">
                          Start Session
                        </button>
                        <button className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200">
                          Manage
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200">
                          View Details
                        </button>
                        <button className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200">
                          Check-in
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassManagement;
