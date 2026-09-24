"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE_URL } from "@/config/api";
import StudentDirectory from "@/components/teacher/StudentDirectory";
import Gradebook from "./Gradebook";
import ManualAttendance from "./ManualAttendance";
import StudentManagementModal from "./StudentManagementModal";
import TuitionManagementModal from "./TuitionManagementModal";
import ClassMaterialsPanel from "./ClassMaterialsPanel";
import {
  Plus,
  Users,
  GraduationCap,
  Calendar,
  Settings,
  UserPlus,
  UserMinus,
  QrCode,
  Clock,
  StopCircle,
  Play,
  Edit3,
  Trash2,
  X,
  LogOut,
  Award,
  BookOpen,
  ClipboardList,
  CreditCard,
  SlidersHorizontal,
  ChevronDown,
  RefreshCw,
  Eye,
  BarChart3,
  AlertCircle,
  Check,
  ChevronRight,
  Sparkles,
} from "lucide-react";

interface Class {
  id: string;
  name: string;
  description: string;
  enrollments: {
    student: {
      id: string;
      name: string;
      email: string;
    };
  }[];
}

interface Session {
  id: string;
  title?: string;
  date: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  qrCode: string | null;
  qrExpiresAt: string | null;
  createdAt: string;
}

interface QRData {
  sessionId: string;
  qrCode: string;
  qrImageUrl: string;
  expiresAt: string;
  sessionInfo: {
    id: string;
    title: string;
    className: string;
  };
}

export default function TeacherDashboard() {
  const { user, logout } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentQR, setCurrentQR] = useState<QRData | null>(null);
  const [qrDataCache, setQrDataCache] = useState<Map<string, QRData>>(
    new Map()
  ); // Cache QR data by sessionId
  const [loading, setLoading] = useState(true);
  const [isCreateClassModalOpen, setIsCreateClassModalOpen] = useState(false);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [isCreateSessionModalOpen, setIsCreateSessionModalOpen] =
    useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [selectedClassForStudent, setSelectedClassForStudent] = useState<Class | null>(null);
  const [selectedClassForGrades, setSelectedClassForGrades] = useState<Class | null>(null);
  const [selectedClassForMaterials, setSelectedClassForMaterials] = useState<Class | null>(null);
  const [selectedSessionForAttendance, setSelectedSessionForAttendance] = useState<Session | null>(null);
  const [newClassName, setNewClassName] = useState("");
  const [newClassDescription, setNewClassDescription] = useState("");
  const [newSessionTitle, setNewSessionTitle] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [showQRModal, setShowQRModal] = useState(false);
  const [isEditSessionModalOpen, setIsEditSessionModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [editSessionTitle, setEditSessionTitle] = useState("");
  const [editSessionDate, setEditSessionDate] = useState("");

  // Management dropdown & modals
  const [isManagementMenuOpen, setIsManagementMenuOpen] = useState(false);
  const [isStudentManagementOpen, setIsStudentManagementOpen] = useState(false);
  const [isTuitionModalOpen, setIsTuitionModalOpen] = useState(false);

  // Statistics states
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [sessionStats, setSessionStats] = useState<any>(null);
  const [classStats, setClassStats] = useState<any>(null);
  const [statsView, setStatsView] = useState<"session" | "class">("session");
  const [selectedStatsSession, setSelectedStatsSession] = useState<string>("");
  const [sessionStatsLoading, setSessionStatsLoading] = useState<Set<string>>(new Set());
  const [classStatsLoading, setClassStatsLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);

  useEffect(() => {
    fetchClasses();
    fetchActiveQRSessions();
  }, []);

  // Timer to automatically check and update expired QR sessions
  useEffect(() => {
    const checkExpiredSessions = async () => {
      const now = new Date();

      for (const session of sessions) {
        if (session.isActive && session.qrExpiresAt) {
          const expiresAt = new Date(session.qrExpiresAt);
          if (now > expiresAt) {
            try {
              const token = localStorage.getItem("token");
              await fetch(
                `${API_BASE_URL}/api/teacher/sessions/${session.id}/end`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                }
              );

              // Update local state
              setSessions((prev) =>
                prev.map((s) =>
                  s.id === session.id ? { ...s, isActive: false } : s
                )
              );

              // Remove from cache
              setQrDataCache((prev) => {
                const newCache = new Map(prev);
                newCache.delete(session.id);
                return newCache;
              });
            } catch (error) {
              console.error("Failed to auto-stop expired session:", error);
            }
          }
        }
      }

      // Check cached QR data for expiration
      qrDataCache.forEach((qrData, sessionId) => {
        const expiresAt = new Date(qrData.expiresAt);
        if (now > expiresAt) {
          setQrDataCache((prev) => {
            const newCache = new Map(prev);
            newCache.delete(sessionId);
            return newCache;
          });
        }
      });
    };

    const interval = setInterval(checkExpiredSessions, 10000);
    return () => clearInterval(interval);
  }, [sessions, qrDataCache]);

  // Fetch active QR sessions when component mounts
  const fetchActiveQRSessions = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_BASE_URL}/api/teacher/classes`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const activeQRSessions = new Map();

        for (const cls of data.data || []) {
          const sessionsResponse = await fetch(
            `${API_BASE_URL}/api/teacher/classes/${cls.id}/sessions`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }
          );

          if (sessionsResponse.ok) {
            const sessionsData = await sessionsResponse.json();
            
            for (const session of sessionsData.data || []) {
              if (session.qrCode && session.qrExpiresAt && session.isActive) {
                const now = new Date();
                const expiresAt = new Date(session.qrExpiresAt);
                
                if (now <= expiresAt) {
                  const qrData = JSON.stringify({
                    sessionId: session.id,
                    qrCode: session.qrCode,
                    classId: cls.id,
                    timestamp: Date.now()
                  });

                  try {
                    const QRCode = (await import('qrcode')).default;
                    const qrImageUrl = await QRCode.toDataURL(qrData);

                    activeQRSessions.set(session.id, {
                      sessionId: session.id,
                      qrCode: session.qrCode,
                      qrImageUrl,
                      expiresAt: session.qrExpiresAt,
                      sessionInfo: {
                        id: session.id,
                        title: session.title,
                        className: cls.name
                      }
                    });
                  } catch (qrError) {
                    console.error('Error generating QR image:', qrError);
                  }
                }
              }
            }
          }
        }

        setQrDataCache(activeQRSessions);
      }
    } catch (error) {
      console.error("Error fetching active QR sessions:", error);
    }
  };

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_BASE_URL}/api/teacher/classes`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setClasses(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching classes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setRefreshSuccess(false);
    const start = Date.now();
    try {
      await Promise.all([
        fetchClasses(),
        fetchActiveQRSessions(),
      ]);
      const elapsed = Date.now() - start;
      const minSpin = Math.max(0, 750 - elapsed);
      setTimeout(() => {
        setIsRefreshing(false);
        setRefreshSuccess(true);
        setTimeout(() => setRefreshSuccess(false), 1500);
      }, minSpin);
    } catch (error) {
      console.error("Refresh error:", error);
      setIsRefreshing(false);
    }
  };

  const fetchClassSessions = async (classId: string) => {
    try {
      setSessionsLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_BASE_URL}/api/teacher/classes/${classId}/sessions`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSessions(data.data || []);
      } else {
        const errorData = await response.json();
        console.error("Error fetching sessions:", errorData);
        alert(`Error fetching sessions: ${errorData.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
      alert("Network error while fetching sessions.");
    } finally {
      setSessionsLoading(false);
    }
  };

  const createClass = async () => {
    if (!newClassName.trim()) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_BASE_URL}/api/teacher/classes`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: newClassName,
            description: newClassDescription,
          }),
        }
      );

      if (response.ok) {
        fetchClasses();
        setIsCreateClassModalOpen(false);
        setNewClassName("");
        setNewClassDescription("");
      }
    } catch (error) {
      console.error("Error creating class:", error);
    }
  };

  const addStudent = async () => {
    if (!selectedClassForStudent || !studentEmail.trim()) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_BASE_URL}/api/teacher/classes/${selectedClassForStudent.id}/students`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            studentEmail: studentEmail,
          }),
        }
      );

      if (response.ok) {
        fetchClasses();
        setIsAddStudentModalOpen(false);
        setStudentEmail("");
        setSelectedClassForStudent(null);
      } else {
        const errorData = await response.json();
        alert(errorData.message || "Error adding student");
      }
    } catch (error) {
      console.error("Error adding student:", error);
    }
  };

  const removeStudent = async (classId: string, studentId: string) => {
    if (!confirm("Are you sure you want to remove this student?")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_BASE_URL}/api/teacher/classes/${classId}/students/${studentId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        fetchClasses();
      }
    } catch (error) {
      console.error("Error removing student:", error);
    }
  };

  const createSession = async () => {
    if (!selectedClass) return;

    try {
      const token = localStorage.getItem("token");
      const url = `${API_BASE_URL}/api/teacher/classes/${selectedClass.id}/sessions`;

      const body = {
        title:
          newSessionTitle ||
          `Bài học ${new Date().toLocaleDateString("vi-VN")}`,
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        fetchClassSessions(selectedClass.id);
        setIsCreateSessionModalOpen(false);
        setNewSessionTitle("");
        alert("Session created successfully!");
      } else {
        const errorData = await response.json();
        console.error("Error response:", errorData);
        alert(`Error creating session: ${errorData.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error creating session:", error);
      alert("Network error. Please check if backend is running.");
    }
  };

  const generateQR = async (sessionId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_BASE_URL}/api/teacher/sessions/${sessionId}/qr`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();

        setQrDataCache((prev) => {
          const newCache = new Map(prev);
          newCache.set(sessionId, data.data);
          return newCache;
        });

        setCurrentQR(data.data);
        setShowQRModal(true);
        fetchClassSessions(selectedClass?.id || "");
        alert("QR Code generated successfully! Open modal to view QR code.");
      } else {
        const errorData = await response.json();
        console.error("❌ QR Generation failed:", errorData);
        alert(`Error creating QR: ${errorData.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("❌ Error generating QR:", error);
      alert("Network error while creating QR code.");
    }
  };

  const endSession = async (sessionId: string) => {
    if (!confirm("Are you sure you want to stop this QR code?")) return;

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `${API_BASE_URL}/api/teacher/sessions/${sessionId}/end`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        setQrDataCache((prev) => {
          const newCache = new Map(prev);
          newCache.delete(sessionId);
          return newCache;
        });

        setCurrentQR(null);
        setShowQRModal(false);

        if (selectedClass?.id) {
          fetchClassSessions(selectedClass.id);
        }

        alert("✅ QR code stopped successfully!");
      } else {
        const errorData = await response.json();
        console.error("❌ Stop session error:", errorData);
        alert(`❌ Error stopping QR: ${errorData.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error ending session:", error);
      alert("❌ Network error while stopping QR code.");
    }
  };

  const deleteSession = async (sessionId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this session completely? This action cannot be undone!"
      )
    )
      return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_BASE_URL}/api/teacher/sessions/${sessionId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        setQrDataCache((prev) => {
          const newCache = new Map(prev);
          newCache.delete(sessionId);
          return newCache;
        });

        setCurrentQR(null);
        setShowQRModal(false);
        fetchClassSessions(selectedClass?.id || "");
        alert("✅ Session deleted successfully!");
      } else {
        const errorData = await response.json();
        alert(`❌ Error deleting session: ${errorData.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error deleting session:", error);
      alert("❌ Network error while deleting session.");
    }
  };

  const fetchSessionStats = async (sessionId: string) => {
    try {
      setSessionStatsLoading(prev => new Set([...prev, sessionId]));
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_BASE_URL}/api/teacher/sessions/${sessionId}/stats`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSessionStats(data.data);
      } else {
        const errorData = await response.json();
        alert(`❌ Error fetching session stats: ${errorData.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error fetching session stats:", error);
      alert("❌ Network error while fetching session stats.");
    } finally {
      setSessionStatsLoading(prev => {
        const newSet = new Set([...prev]);
        newSet.delete(sessionId);
        return newSet;
      });
    }
  };

  const fetchClassStats = async (classId: string) => {
    try {
      setClassStatsLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_BASE_URL}/api/teacher/classes/${classId}/stats`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setClassStats(data.data);
      } else {
        const errorData = await response.json();
        alert(`❌ Error fetching class stats: ${errorData.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error fetching class stats:", error);
      alert("❌ Network error while fetching class stats.");
    } finally {
      setClassStatsLoading(false);
    }
  };

  const openStatsModal = async (type: "session" | "class", sessionId?: string) => {
    setStatsView(type);
    
    try {
      if (type === "session" && sessionId) {
        setSelectedStatsSession(sessionId);
        await fetchSessionStats(sessionId);
      } else if (type === "class" && selectedClass) {
        await fetchClassStats(selectedClass.id);
      }
      setShowStatsModal(true);
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const openEditSession = (session: Session) => {
    setEditingSession(session);
    setEditSessionTitle(session.title || "");
    setEditSessionDate(new Date(session.startTime).toISOString().slice(0, 16));
    setIsEditSessionModalOpen(true);
  };

  const updateSession = async () => {
    if (!editingSession || !editSessionTitle.trim()) return;

    const selectedDateTime = new Date(editSessionDate);
    const currentDateTime = new Date();

    if (selectedDateTime < currentDateTime) {
      alert("❌ Cannot set session time in the past. Please select a future date and time.");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const payload = {
        title: editSessionTitle,
        startTime: editSessionDate,
      };

      const response = await fetch(
        `${API_BASE_URL}/api/teacher/sessions/${editingSession.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (response.ok) {
        setIsEditSessionModalOpen(false);
        setEditingSession(null);
        setEditSessionTitle("");
        setEditSessionDate("");
        fetchClassSessions(selectedClass?.id || "");
        alert("✅ Session updated successfully!");
      } else {
        const errorData = await response.json();
        console.error("❌ Error response:", errorData);
        alert(`❌ Error updating session: ${errorData.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("❌ Network error:", error);
      alert("❌ Network error while updating session.");
    }
  };

  const deleteClass = async (classId: string) => {
    if (!confirm("Are you sure you want to delete this class?")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_BASE_URL}/api/teacher/classes/${classId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        fetchClasses();
      }
    } catch (error) {
      console.error("Error deleting class:", error);
    }
  };

  const handleDeleteAccount = async () => {
    if (
      !window.confirm(
        "⚠️ WARNING: This will permanently delete your account and all your data. This action cannot be undone.\n\nAre you absolutely sure you want to delete your account?"
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || API_BASE_URL}/api/users/delete-account`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        alert("✅ Account deleted successfully. You will be logged out.");
        logout();
      } else {
        alert(`❌ Error deleting account: ${data.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      alert("❌ Error deleting account. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header
        className="bg-white shadow-lg border-b rounded-lg"
        style={{
          backgroundImage:
            "linear-gradient(rgb(255, 249, 231) 0%, rgb(242, 247, 255) 100%)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 py-2 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900 text-center">
            🎓TEACHER DASHBOARD
          </h1>
          <div className="flex justify-between items-center py-4 flex-wrap gap-4">
            <div>
              <div className="text-green-600 font-bold text-xl flex items-center gap-2">
                <span>WELCOME BACK,</span>
                <div className="flex items-center justify-center space-x-1">
                  <img
                    src="/icons/teacher.png"
                    alt="Teacher"
                    width={20}
                    height={20}
                    className="opacity-80"
                  />
                  <span className="text-lg text-red-600 uppercase">
                    Teacher
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 my-1">
                <div className="flex items-center gap-1 text-gray-600">
                  <img src="/icons/name.png" width="22" height="22" alt="" />
                  <span>Your name: </span>
                </div>
                <p className="font-bold text-gray-900">{user?.name || "Teacher"}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-gray-600">
                  <img src="/icons/email.png" width="22" height="22" alt="" />
                  <span>Your email: </span>
                </div>
                <p className="font-bold text-gray-900">{user?.email}</p>
              </div>
            </div>

            <div className="flex flex-wrap justify-center w-full sm:w-auto sm:justify-normal items-center gap-2">
              {/* Refresh button */}
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className={`p-2.5 rounded-full shadow border cursor-pointer transition-all duration-200 active:scale-90 ${
                  refreshSuccess
                    ? "bg-emerald-50 text-emerald-600 border-emerald-300 ring-2 ring-emerald-200"
                    : isRefreshing
                    ? "bg-blue-50 text-blue-600 border-blue-300 ring-2 ring-blue-200"
                    : "bg-white text-gray-600 hover:text-blue-600 hover:border-blue-300 border-gray-200"
                }`}
                title={refreshSuccess ? "Đã làm mới thành công!" : "Làm mới danh sách lớp"}
                aria-label="Làm mới danh sách lớp"
              >
                {refreshSuccess ? (
                  <Check className="w-4 h-4 text-emerald-600 animate-in zoom-in duration-200" />
                ) : (
                  <RefreshCw
                    className={`w-4 h-4 transition-transform duration-500 ${
                      isRefreshing ? "animate-spin text-blue-600" : ""
                    }`}
                  />
                )}
              </button>

              {/* Management Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsManagementMenuOpen(!isManagementMenuOpen)}
                  className={`group relative overflow-hidden px-4 py-2 rounded-full font-bold text-sm flex items-center space-x-2 cursor-pointer transition-all duration-200 active:scale-95 shadow-md ${
                    isManagementMenuOpen
                      ? "bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white shadow-purple-300/60 ring-2 ring-purple-400 ring-offset-2"
                      : "bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-700 hover:via-indigo-700 hover:to-purple-800 text-white shadow-purple-200/50 hover:shadow-lg hover:shadow-purple-300/50"
                  }`}
                  aria-label="Trung tâm quản lý"
                >
                  <div className="p-1 rounded-md bg-white/15 text-white flex items-center justify-center">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                  </div>
                  <span className="tracking-wide hidden sm:inline">Quản lý</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-purple-200 transition-transform duration-300 ${
                      isManagementMenuOpen ? "rotate-180 text-white" : "group-hover:translate-y-0.5"
                    }`}
                  />
                </button>

                {isManagementMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40 bg-black/10 sm:bg-transparent" 
                      onClick={() => setIsManagementMenuOpen(false)} 
                    />
                    <div className="absolute sm:left-auto left-1/2 sm:-translate-x-1/2 -translate-x-1/2 mt-2.5 w-72 sm:w-80 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-purple-100/90 p-2 z-50 animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200 ring-1 ring-black/5 divide-y divide-gray-100">

                      {/* Menu Action Items */}
                      <div className="py-1.5 space-y-1">
                        {/* Item 1: Student Management */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsManagementMenuOpen(false);
                            setIsStudentManagementOpen(true);
                          }}
                          className="w-full p-2.5 rounded-xl text-left flex items-center gap-3 group transition-all duration-150 hover:bg-purple-50/80 hover:shadow-xs border border-transparent hover:border-purple-200/60 cursor-pointer"
                        >
                          <div className="w-10 h-10 rounded-xl bg-gray-100 text-green-600 flex items-center justify-center shrink-0 group-hover:bg-green-600 group-hover:text-white transition-all duration-200 shadow-xs">
                            <Users className="w-5 h-5 transition-transform group-hover:scale-110" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-bold text-xs sm:text-sm text-gray-800 group-hover:text-green-700 transition-colors">
                                Quản lý học sinh
                              </p>
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-green-100/60 text-green-700 group-hover:bg-green-200 transition-colors">
                                Hồ sơ
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500 truncate mt-0.5">
                              Hồ sơ, MSSV, thông tin liên hệ & danh bạ
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                        </button>

                        {/* Item 2: Tuition Management */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsManagementMenuOpen(false);
                            setIsTuitionModalOpen(true);
                          }}
                          className="w-full p-2.5 rounded-xl text-left flex items-center gap-3 group transition-all duration-150 hover:bg-amber-50/80 hover:shadow-xs border border-transparent hover:border-amber-200/60 cursor-pointer"
                        >
                          <div className="w-10 h-10 rounded-xl bg-gray-100 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-500 group-hover:text-white transition-all duration-200 shadow-xs">
                            <CreditCard className="w-5 h-5 transition-transform group-hover:scale-110" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-bold text-xs sm:text-sm text-gray-800 group-hover:text-blue-700 transition-colors">
                                Quản lý học phí
                              </p>
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-100/60 text-blue-700 group-hover:bg-blue-200 transition-colors">
                                Tài chính
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500 truncate mt-0.5">
                              Biểu phí, công nợ & trạng thái đóng học phí
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                        </button>
                      </div>

                    </div>
                  </>
                )}
              </div>

              {/* Create Class Button */}
              <button
                onClick={() => setIsCreateClassModalOpen(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-blue-700 flex items-center sm:space-x-1.5 cursor-pointer font-bold text-sm"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden md:inline">New Class</span>
              </button>

              {/* Delete Account Button */}
              {/* <button
                onClick={handleDeleteAccount}
                className="bg-red-600 text-white p-2.5 rounded-full hover:bg-red-700 shadow flex items-center cursor-pointer"
                title="Xóa tài khoản"
              >
                <Trash2 className="w-4 h-4" />
              </button> */}
            </div>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center">
              <GraduationCap className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total Classes
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {classes.length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total Students
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {classes.reduce(
                    (total, cls) => total + cls.enrollments.length,
                    0
                  )}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center">
              <QrCode className="w-8 h-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Active QR 
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {
                    Array.from(qrDataCache.values()).filter(
                      (qr) => new Date() <= new Date(qr.expiresAt)
                    ).length
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Active QR Sessions Display */}
        {qrDataCache.size > 0 && (
          <div 
            className="border-4 border-green-500 p-6 rounded-lg shadow-lg mb-8"
            style={{ backgroundImage: "linear-gradient(to top, rgb(186, 255, 184) 0%, rgb(255, 255, 255) 100%)" }}
          >
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold mb-2 text-green-700">
                🔴 ACTIVE QR CODE SESSIONS
              </h3>
              <p className="text-gray-600">
                QR code{qrDataCache.size > 1 ? "s" : ""}{" "}
                currently active: <span className="font-extrabold">{qrDataCache.size}</span> <span className="text-gray-400">- Click to view details</span>
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from(qrDataCache.entries()).map(([sessionId, qrData]) => {
                const isExpired = new Date() > new Date(qrData.expiresAt);
                const isExpiringSoon =
                  !isExpired &&
                  new Date(qrData.expiresAt).getTime() - Date.now() < 60000;

                return (
                  <div
                    key={sessionId}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all shadow-md ${
                      isExpired
                        ? "border-red-300 bg-red-50 hover:border-red-500"
                        : isExpiringSoon
                        ? "border-yellow-300 bg-yellow-50 hover:border-yellow-500"
                        : "border-green-300 bg-white hover:border-green-500 hover:shadow-lg"
                    }`}
                    onClick={() => {
                      if (isExpired) {
                        alert("Mã QR đã hết hạn. Vui lòng tạo mã mới.");
                        return;
                      }
                      setCurrentQR(qrData);
                      setShowQRModal(true);
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-16 h-16 bg-white rounded border flex items-center justify-center p-1">
                        <img
                          src={qrData.qrImageUrl}
                          alt="QR Code"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate text-gray-900">
                          {qrData.sessionInfo.title}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {qrData.sessionInfo.className}
                        </p>
                        <p
                          className={`text-xs font-bold mt-1 ${
                            isExpired
                              ? "text-red-600"
                              : isExpiringSoon
                              ? "text-yellow-600"
                              : "text-green-600"
                          }`}
                        >
                          {isExpired
                            ? "❌ EXPIRED"
                            : isExpiringSoon
                            ? "⚠️ EXPIRING SOON"
                            : "✅ ACTIVE"}
                        </p>
                        <p className="text-xs font-bold text-gray-500 mt-1">
                          ⏰ {new Date(qrData.expiresAt).toLocaleTimeString()}
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            endSession(sessionId);
                          }}
                          className="mt-2 bg-red-500 text-white px-4 py-1 rounded text-xs hover:bg-red-600 transition-colors cursor-pointer"
                        >
                          Stop
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {qrDataCache.size > 3 && (
              <div className="text-center mt-4">
                <p className="text-sm text-gray-600">
                  💡 Tip: You can manage individual sessions from the class sessions panel
                </p>
              </div>
            )}
          </div>
        )}

        {/* Classes Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {classes.map((cls) => (
            <div key={cls.id} className="bg-white rounded-lg shadow-lg border">
              <div className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 break-words">
                      {cls?.name || "Unnamed Class"}
                    </h3>
                    <p className="text-gray-500 text-xs sm:text-sm mt-0.5 line-clamp-2">
                      {cls?.description || "No description"}
                    </p>
                  </div>

                  {/* Responsive Action Buttons Toolbar for All Devices */}
                  <div className="grid grid-cols-5 gap-1.5 sm:flex sm:items-center sm:gap-2 shrink-0 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                    {/* Button 1: Sessions & QR Code */}
                    <div className="relative group flex justify-center">
                      <button
                        onClick={() => {
                          setSelectedClass(cls);
                          fetchClassSessions(cls.id);
                        }}
                        className="w-full sm:w-10 h-10 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200/80 hover:border-blue-600 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-150 shadow-xs hover:shadow active:scale-95"
                        title="Quản lý buổi học & QR"
                        aria-label="Quản lý buổi học & QR"
                      >
                        <QrCode className="w-5 h-5" />
                      </button>
                      <div className="hidden sm:group-hover:flex absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-gray-900 text-white text-[11px] font-medium rounded shadow-md whitespace-nowrap z-20 pointer-events-none">
                        Quản lý buổi học & QR
                      </div>
                    </div>

                    {/* Button 2: Add Student */}
                    <div className="relative group flex justify-center">
                      <button
                        onClick={() => {
                          setSelectedClassForStudent(cls);
                          setIsAddStudentModalOpen(true);
                        }}
                        className="w-full sm:w-10 h-10 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white border border-emerald-200/80 hover:border-emerald-600 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-150 shadow-xs hover:shadow active:scale-95"
                        title="Thêm sinh viên"
                        aria-label="Thêm sinh viên"
                      >
                        <UserPlus className="w-5 h-5" />
                      </button>
                      <div className="hidden sm:group-hover:flex absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-gray-900 text-white text-[11px] font-medium rounded shadow-md whitespace-nowrap z-20 pointer-events-none">
                        Thêm sinh viên
                      </div>
                    </div>

                    {/* Button 3: Gradebook */}
                    <div className="relative group flex justify-center">
                      <button
                        onClick={() => setSelectedClassForGrades(cls)}
                        className="w-full sm:w-10 h-10 bg-purple-50 text-purple-600 hover:bg-purple-600 hover:text-white border border-purple-200/80 hover:border-purple-600 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-150 shadow-xs hover:shadow active:scale-95"
                        title="Bảng điểm (Gradebook)"
                        aria-label="Bảng điểm (Gradebook)"
                      >
                        <Award className="w-5 h-5" />
                      </button>
                      <div className="hidden sm:group-hover:flex absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-gray-900 text-white text-[11px] font-medium rounded shadow-md whitespace-nowrap z-20 pointer-events-none">
                        Bảng điểm (Gradebook)
                      </div>
                    </div>

                    {/* Button 4: Class Materials */}
                    <div className="relative group flex justify-center">
                      <button
                        onClick={() => setSelectedClassForMaterials(cls)}
                        className="w-full sm:w-10 h-10 bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white border border-amber-200/80 hover:border-amber-600 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-150 shadow-xs hover:shadow active:scale-95"
                        title="Tài liệu học tập"
                        aria-label="Tài liệu học tập"
                      >
                        <BookOpen className="w-5 h-5" />
                      </button>
                      <div className="hidden sm:group-hover:flex absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-gray-900 text-white text-[11px] font-medium rounded shadow-md whitespace-nowrap z-20 pointer-events-none">
                        Tài liệu học tập
                      </div>
                    </div>

                    {/* Button 5: Delete Class */}
                    <div className="relative group flex justify-center">
                      <button
                        onClick={() => deleteClass(cls.id)}
                        className="w-full sm:w-10 h-10 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-200/80 hover:border-rose-600 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-150 shadow-xs hover:shadow active:scale-95"
                        title="Xóa lớp học"
                        aria-label="Xóa lớp học"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                      <div className="hidden sm:group-hover:flex absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-gray-900 text-white text-[11px] font-medium rounded shadow-md whitespace-nowrap z-20 pointer-events-none">
                        Xóa lớp học
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">
                      Students Enrolled
                    </span>
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-semibold">
                      {cls.enrollments.length} students
                    </span>
                  </div>
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {cls.enrollments.map((enrollment) => (
                      <div
                        key={enrollment.student.id}
                        className="flex items-center justify-between bg-green-100 p-3 rounded-lg"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-sm font-medium truncate text-gray-900">
                            {enrollment?.student?.name ||
                              enrollment?.student?.email ||
                              "Unknown Student"}
                          </p>
                          <p className="text-xs text-gray-600 truncate">
                            {enrollment?.student?.email || ""}
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            removeStudent(cls.id, enrollment.student.id)
                          }
                          className="text-white hover:bg-red-600 px-3 py-1.5 bg-red-500 rounded-full shadow flex items-center gap-1.5 text-xs font-semibold cursor-pointer shrink-0" 
                        >
                          <UserMinus className="w-4 h-4" />
                          <span>Xoá</span>
                        </button>
                      </div>
                    ))}
                    {cls.enrollments.length === 0 && (
                      <p className="text-gray-500 text-sm text-center py-3">
                        Chưa có sinh viên nào trong lớp này
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Sessions Modal */}
        {selectedClass && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 md:p-6">
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-blue-200/90 w-full max-w-3xl max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden animate__animated animate__zoomIn animate__faster">
              {/* Modal Header */}
              <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 shadow-inner">
                    <QrCode className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-extrabold truncate">
                      Buổi Học & Điểm Danh QR
                    </h3>
                    <p className="text-xs text-blue-100 truncate">
                      Lớp: <span className="font-bold  decoration-blue-300">{selectedClass.name}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedClass(null);
                    setSessions([]);
                  }}
                  className="p-1.5 sm:p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors cursor-pointer shrink-0 ml-2"
                  aria-label="Đóng"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Action Toolbar */}
              <div className="p-3.5 sm:p-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <button
                    onClick={() => setIsCreateSessionModalOpen(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 flex items-center justify-center space-x-2 cursor-pointer shadow-xs font-bold text-xs sm:text-sm active:scale-95 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tạo buổi học mới</span>
                  </button>

                  <button
                    onClick={() => openStatsModal("class")}
                    disabled={classStatsLoading}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs font-bold text-xs sm:text-sm active:scale-95 transition-all"
                  >
                    {classStatsLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                        <span>Đang tải...</span>
                      </>
                    ) : (
                      <>
                        <BarChart3 className="w-4 h-4" />
                        <span>Thống kê lớp</span>
                      </>
                    )}
                  </button>
                </div>
                <span className="text-xs text-gray-500 text-center sm:text-right font-medium">
                  {sessions.length} buổi học
                </span>
              </div>

              {/* Sessions List */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 bg-gray-50/40">
                {sessionsLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-3 border-blue-600 mx-auto mb-3"></div>
                    <p className="text-gray-500 text-xs sm:text-sm font-medium">Đang tải danh sách buổi học...</p>
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 bg-white border-2 border-dashed border-gray-200 rounded-2xl p-6">
                    <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p className="font-bold text-gray-600 text-sm">Chưa có buổi học nào</p>
                    <p className="text-xs text-gray-400 mt-1">Bấm "+ Tạo buổi học mới" để bắt đầu điểm danh QR.</p>
                  </div>
                ) : (
                  sessions.map((session) => {
                    const now = new Date();
                    const qrData = qrDataCache.get(session.id);
                    const hasQR = session.qrCode && session.qrExpiresAt;
                    const isQRExpired = hasQR
                      ? now > new Date(session.qrExpiresAt!)
                      : false;
                    const isQRExpiringSoon =
                      hasQR && !isQRExpired
                        ? new Date(session.qrExpiresAt!).getTime() - now.getTime() < 60000
                        : false;

                    const effectiveIsActive =
                      session.isActive && hasQR && !isQRExpired;

                    return (
                      <div
                        key={session.id}
                        className={`rounded-2xl shadow-xs border transition-all p-3.5 sm:p-4 ${
                          effectiveIsActive
                            ? "border-emerald-400 bg-emerald-50/40 ring-1 ring-emerald-300"
                            : isQRExpired
                            ? "border-rose-200 bg-rose-50/30"
                            : "border-gray-200 bg-white"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-sm sm:text-base text-gray-900 break-words">
                                {session.title || "Buổi học chưa đặt tên"}
                              </h4>
                              {/* Action Icon buttons */}
                              <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                                <button
                                  onClick={() => openEditSession(session)}
                                  className="text-blue-600 hover:text-blue-800 p-1.5 hover:bg-white rounded cursor-pointer transition-colors"
                                  title="Chỉnh sửa buổi học"
                                  aria-label="Chỉnh sửa buổi học"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setSelectedSessionForAttendance(session)}
                                  className="text-emerald-600 hover:text-emerald-800 p-1.5 hover:bg-white rounded cursor-pointer transition-colors"
                                  title="Điểm danh thủ công"
                                  aria-label="Điểm danh thủ công"
                                >
                                  <ClipboardList className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => deleteSession(session.id)}
                                  className="text-rose-600 hover:text-rose-800 p-1.5 hover:bg-white rounded cursor-pointer transition-colors"
                                  title="Xóa buổi học"
                                  aria-label="Xóa buổi học"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <div className="mt-1.5 flex flex-wrap items-center gap-2">
                              <span
                                className={`text-[11px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1 ${
                                  effectiveIsActive
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                    : isQRExpired
                                    ? "bg-rose-100 text-rose-800 border border-rose-300"
                                    : session.isActive
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {effectiveIsActive
                                  ? "🟢 Đang mở QR điểm danh"
                                  : isQRExpired
                                  ? "❌ QR Đã hết hạn"
                                  : session.isActive
                                  ? "⚫ Buổi học đang diễn ra (Chưa bật QR)"
                                  : "⚫ Đã kết thúc"}
                              </span>

                              <span className="text-[11px] text-gray-500">
                                📅 {new Date(session.startTime).toLocaleString("vi-VN")}
                              </span>

                              {session.qrExpiresAt && (
                                <span
                                  className={`text-[11px] font-semibold ${
                                    isQRExpired
                                      ? "text-rose-600"
                                      : isQRExpiringSoon
                                      ? "text-amber-600 font-bold animate-pulse"
                                      : "text-amber-700"
                                  }`}
                                >
                                  ⏰ Hạn QR: {new Date(session.qrExpiresAt).toLocaleTimeString("vi-VN")}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Control Buttons */}
                          <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                            {!hasQR || isQRExpired ? (
                              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                                {isQRExpired && (
                                  <button
                                    onClick={() => openStatsModal("session", session.id)}
                                    disabled={sessionStatsLoading.has(session.id)}
                                    className="flex-1 sm:flex-initial bg-emerald-600 text-white px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-emerald-700 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                                  >
                                    <BarChart3 className="w-3.5 h-3.5" />
                                    <span>Thống kê</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => generateQR(session.id)}
                                  className="flex-1 sm:flex-initial bg-blue-600 text-white px-3.5 py-1.5 rounded-xl font-bold text-xs hover:bg-blue-700 flex items-center justify-center gap-1 cursor-pointer shadow-xs active:scale-95 transition-all"
                                >
                                  <Play className="w-3.5 h-3.5" />
                                  <span>{isQRExpired ? "Tạo QR mới" : "Bật QR điểm danh"}</span>
                                </button>
                              </div>
                            ) : effectiveIsActive ? (
                              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                                <button
                                  onClick={() => {
                                    const cachedQR = qrDataCache.get(session.id);
                                    if (cachedQR) {
                                      if (new Date() > new Date(cachedQR.expiresAt)) {
                                        alert("Mã QR đã hết hạn. Vui lòng tạo mã mới.");
                                        return;
                                      }
                                      setCurrentQR(cachedQR);
                                      setShowQRModal(true);
                                    } else {
                                      alert("Không tìm thấy mã QR trong bộ nhớ.");
                                    }
                                  }}
                                  className="flex-1 sm:flex-initial bg-blue-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-blue-700 flex items-center justify-center gap-1 cursor-pointer shadow-xs transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Xem QR</span>
                                </button>
                                <button
                                  onClick={() => endSession(session.id)}
                                  className="flex-1 sm:flex-initial bg-rose-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-rose-700 flex items-center justify-center gap-1 cursor-pointer shadow-xs transition-colors"
                                >
                                  <StopCircle className="w-3.5 h-3.5" />
                                  <span>Dừng QR</span>
                                </button>
                                <button
                                  onClick={() => openStatsModal("session", session.id)}
                                  disabled={sessionStatsLoading.has(session.id)}
                                  className="flex-1 sm:flex-initial bg-emerald-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-emerald-700 flex items-center justify-center gap-1 cursor-pointer shadow-xs transition-colors"
                                >
                                  <BarChart3 className="w-3.5 h-3.5" />
                                  <span>Thống kê</span>
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => openStatsModal("session", session.id)}
                                disabled={sessionStatsLoading.has(session.id)}
                                className="w-full sm:w-auto bg-emerald-600 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold hover:bg-emerald-700 flex items-center justify-center gap-1 cursor-pointer shadow-xs transition-colors"
                              >
                                <BarChart3 className="w-3.5 h-3.5" />
                                <span>Thống kê</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Class Modal */}
      {isCreateClassModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white shadow-2xl rounded-2xl sm:rounded-3xl w-full max-w-md border border-gray-200 overflow-hidden animate__animated animate__zoomIn animate__faster">
            <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold">Tạo Lớp Học Mới</h3>
                  <p className="text-xs text-blue-100">Khởi tạo lớp và phân nhóm sinh viên</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsCreateClassModalOpen(false);
                  setNewClassName("");
                  setNewClassDescription("");
                }}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Tên Lớp Học *
                </label>
                <input
                  type="text"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="VD: Lập trình Web Full-Stack K24"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Mô Tả Lớp Học
                </label>
                <textarea
                  value={newClassDescription}
                  onChange={(e) => setNewClassDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                  rows={3}
                  placeholder="VD: Lớp học React, Node.js, Prisma và Supabase..."
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => {
                    setIsCreateClassModalOpen(false);
                    setNewClassName("");
                    setNewClassDescription("");
                  }}
                  className="flex-1 bg-white border border-gray-300 font-bold text-gray-700 py-2.5 px-4 rounded-xl hover:bg-gray-100 transition-colors text-xs sm:text-sm cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  onClick={createClass}
                  disabled={!newClassName.trim()}
                  className="flex-1 bg-blue-600 font-bold text-white py-2.5 px-4 rounded-xl shadow-md hover:bg-blue-700 disabled:opacity-50 transition-all text-xs sm:text-sm cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tạo Lớp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Session Modal */}
      {isCreateSessionModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white shadow-2xl rounded-2xl sm:rounded-3xl w-full max-w-md border border-gray-200 overflow-hidden animate__animated animate__zoomIn animate__faster">
            <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold">Tạo Buổi Học Mới</h3>
                  <p className="text-xs text-blue-100">Thiết lập buổi học và tạo mã QR điểm danh</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsCreateSessionModalOpen(false);
                  setNewSessionTitle("");
                }}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Tên Buổi Học *
                </label>
                <input
                  type="text"
                  value={newSessionTitle}
                  onChange={(e) => setNewSessionTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="VD: Buổi 1: Giới thiệu kiến trúc hệ thống"
                />
              </div>
              <div className="bg-blue-50 p-3.5 rounded-xl border border-blue-200 text-xs text-blue-700 leading-relaxed">
                💡 <strong>Mẹo:</strong> Sau khi tạo buổi học, bạn có thể bấm <strong>&quot;Bật QR điểm danh&quot;</strong> để sinh mã QR tức thời cho sinh viên quét.
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => {
                    setIsCreateSessionModalOpen(false);
                    setNewSessionTitle("");
                  }}
                  className="flex-1 bg-white border border-gray-300 font-bold text-gray-700 py-2.5 px-4 rounded-xl hover:bg-gray-100 transition-colors text-xs sm:text-sm cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  onClick={createSession}
                  disabled={!newSessionTitle.trim()}
                  className="flex-1 bg-blue-600 font-bold text-white py-2.5 px-4 rounded-xl shadow-md hover:bg-blue-700 disabled:opacity-50 transition-all text-xs sm:text-sm cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tạo Buổi Học</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Student to Class Modal */}
      {isAddStudentModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white shadow-2xl rounded-2xl sm:rounded-3xl w-full max-w-xl max-h-[92vh] sm:max-h-[90vh] flex flex-col border border-gray-200 overflow-hidden animate__animated animate__zoomIn animate__faster">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 shadow-inner">
                  <UserPlus className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-extrabold truncate">
                    Thêm Sinh Viên Vào Lớp
                  </h3>
                  <p className="text-xs text-emerald-100 truncate">
                    Lớp: <span className="font-bold underline decoration-emerald-300">{selectedClassForStudent?.name || "Đang chọn"}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAddStudentModalOpen(false);
                  setStudentEmail("");
                  setSelectedClassForStudent(null);
                }}
                className="p-1.5 sm:p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors cursor-pointer shrink-0 ml-2"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4 bg-gray-50/50">
              {/* Quick Add by Email Card */}
              <div className="bg-white p-4 rounded-2xl border border-emerald-200/90 shadow-xs">
                <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Thêm nhanh bằng Email tài khoản</span>
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    value={studentEmail}
                    onChange={(e) => setStudentEmail(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                    placeholder="Nhập chính xác email sinh viên..."
                  />
                  <button
                    onClick={addStudent}
                    disabled={!studentEmail.trim()}
                    className="bg-emerald-600 font-bold text-white px-5 py-2.5 rounded-xl hover:bg-emerald-700 cursor-pointer disabled:opacity-50 text-xs sm:text-sm shrink-0 flex items-center justify-center gap-1 shadow-xs active:scale-95 transition-all"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span> Thêm</span>
                  </button>
                </div>
              </div>

              {/* Student Directory Search Card */}
              <div className="bg-white p-4 rounded-2xl border border-purple-200/90 shadow-xs">
                <div className="flex items-center gap-1.5 mb-3">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  <h4 className="font-bold text-xs sm:text-sm text-purple-900">
                    Hoặc tìm kiếm & chọn từ danh bạ sinh viên:
                  </h4>
                </div>
                <StudentDirectory
                  targetClassId={selectedClassForStudent?.id}
                  targetClassName={selectedClassForStudent?.name}
                  onStudentAdded={fetchClasses}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:p-4 bg-white border-t border-gray-200 flex justify-end shrink-0">
              <button
                onClick={() => {
                  setIsAddStudentModalOpen(false);
                  setStudentEmail("");
                  setSelectedClassForStudent(null);
                }}
                className="w-full sm:w-auto bg-gray-100 hover:bg-gray-200 font-bold text-gray-700 py-2.5 px-6 rounded-xl transition-colors cursor-pointer text-xs sm:text-sm"
              >
                Đóng cửa sổ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && currentQR && (
        <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 w-full max-w-md text-center animate__animated animate__zoomIn animate__faster shadow-2xl border border-emerald-300">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
              <QrCode className="w-6 h-6" />
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold mb-1 text-emerald-800 tracking-tight">
              MÃ QR ĐIỂM DANH
            </h3>
            <p className="text-xs text-gray-500 mb-4">Sinh viên mở ứng dụng di động để quét mã này</p>

            <div className="bg-emerald-50/50 p-4 rounded-2xl mb-4 border border-emerald-100">
              <div className="bg-white p-3 rounded-xl border border-emerald-300 inline-block shadow-xs">
                {currentQR.qrImageUrl ? (
                  <img
                    src={currentQR.qrImageUrl}
                    alt="QR Code"
                    className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
                    style={{ imageRendering: "pixelated" }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-48 h-48 sm:w-56 sm:h-56 bg-gray-200 flex items-center justify-center text-gray-500 rounded-lg">
                    <div className="text-center">
                      <div className="text-2xl mb-2">❌</div>
                      <div className="text-xs font-bold">QR Code Đã Hết Hạn</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="text-xs text-gray-700 font-semibold mb-5 space-y-1.5 bg-gray-50 p-3 rounded-xl border border-gray-200/80">
              <p className="truncate">
                <span className="text-gray-400 font-normal">Buổi học:</span> <span className="font-bold text-gray-900">{currentQR.sessionInfo.title}</span>
              </p>
              <p className="truncate">
                <span className="text-gray-400 font-normal">Lớp:</span> <span className="font-bold text-gray-900">{currentQR.sessionInfo.className}</span>
              </p>
              <p
                className={`font-bold ${
                  new Date() > new Date(currentQR.expiresAt)
                    ? "text-rose-600"
                    : new Date(currentQR.expiresAt).getTime() - Date.now() < 60000
                    ? "text-amber-600 animate-pulse"
                    : "text-emerald-600"
                }`}
              >
                <span className="text-gray-400 font-normal">Hết hạn lúc:</span>{" "}
                {new Date(currentQR.expiresAt).toLocaleTimeString("vi-VN")}
                {new Date() > new Date(currentQR.expiresAt) && " (ĐÃ HẾT HẠN)"}
                {new Date() <= new Date(currentQR.expiresAt) &&
                  new Date(currentQR.expiresAt).getTime() - Date.now() < 60000 &&
                  " (SẮP HẾT HẠN)"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowQRModal(false)}
                className="flex-1 bg-white border border-gray-300 text-gray-700 py-2.5 px-4 rounded-xl hover:bg-gray-100 cursor-pointer font-bold text-xs sm:text-sm transition-colors"
              >
                Đóng
              </button>
              <button
                onClick={() => endSession(currentQR.sessionId)}
                className="flex-1 bg-rose-600 text-white py-2.5 px-4 rounded-xl shadow-md hover:bg-rose-700 cursor-pointer font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-1.5"
              >
                <StopCircle className="w-4 h-4" />
                <span>Dừng QR</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Session Modal */}
      {isEditSessionModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white shadow-2xl rounded-2xl sm:rounded-3xl w-full max-w-md border border-gray-200 overflow-hidden animate__animated animate__zoomIn animate__faster">
            <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <Edit3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold">Chỉnh Sửa Buổi Học</h3>
                  <p className="text-xs text-emerald-100">Cập nhật tiêu đề hoặc thời gian bắt đầu</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsEditSessionModalOpen(false);
                  setEditingSession(null);
                  setEditSessionTitle("");
                  setEditSessionDate("");
                }}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Tên Buổi Học *
                </label>
                <input
                  type="text"
                  value={editSessionTitle}
                  onChange={(e) => setEditSessionTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  placeholder="Nhập tên buổi học..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Thời Gian Bắt Đầu
                </label>
                <input
                  type="datetime-local"
                  value={editSessionDate}
                  onChange={(e) => setEditSessionDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => {
                    setIsEditSessionModalOpen(false);
                    setEditingSession(null);
                    setEditSessionTitle("");
                    setEditSessionDate("");
                  }}
                  className="flex-1 bg-white border border-gray-300 font-bold text-gray-700 py-2.5 px-4 rounded-xl hover:bg-gray-100 transition-colors text-xs sm:text-sm cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  onClick={updateSession}
                  disabled={!editSessionTitle.trim()}
                  className="flex-1 bg-emerald-600 font-bold text-white py-2.5 px-4 rounded-xl shadow-md hover:bg-emerald-700 disabled:opacity-50 transition-all text-xs sm:text-sm cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Lưu Thay Đổi</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Analytics Modal */}
      {showStatsModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 md:p-6">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-200 p-4 sm:p-6 w-full max-w-5xl max-h-[92vh] overflow-y-auto animate__animated animate__zoomIn animate__faster">
            <div className="flex justify-between items-center pb-3.5 mb-4 border-b border-gray-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-gray-900">
                    {statsView === "session"
                      ? "Thống Kê Điểm Danh Buổi Học"
                      : "Thống Kê Chuyên Cần Lớp Học"}
                  </h3>
                  <p className="text-xs text-gray-500">Báo cáo tỷ lệ tham gia & chuyên cần của sinh viên</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowStatsModal(false);
                  setSessionStats(null);
                  setClassStats(null);
                }}
                className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Session Stats View */}
            {statsView === "session" && sessionStats && (
              <div className="space-y-4">
                <div className="bg-blue-50/70 border border-blue-200 p-3.5 rounded-2xl">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <p className="text-[11px] font-semibold text-gray-500">Buổi học</p>
                      <p className="font-bold text-xs sm:text-sm text-gray-900 truncate">{sessionStats.sessionInfo.title}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-gray-500">Lớp</p>
                      <p className="font-bold text-xs sm:text-sm text-gray-900 truncate">{sessionStats.sessionInfo.className}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-gray-500">Thời gian</p>
                      <p className="font-bold text-xs sm:text-sm text-gray-900 truncate">
                        {new Date(sessionStats.sessionInfo.startTime).toLocaleString("vi-VN")}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-gray-500">Trạng thái</p>
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                        sessionStats.sessionInfo.isActive ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-700"
                      }`}>
                        {sessionStats.sessionInfo.isActive ? "Đang mở" : "Đã đóng"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3 text-center">
                  <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs">
                    <p className="text-xl sm:text-2xl font-black text-gray-900">{sessionStats.totalStudents}</p>
                    <p className="text-[11px] text-gray-500 font-semibold mt-0.5">Tổng số sinh viên</p>
                  </div>
                  <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 shadow-2xs">
                    <p className="text-xl sm:text-2xl font-black text-emerald-700">{sessionStats.presentStudents}</p>
                    <p className="text-[11px] text-emerald-800 font-semibold mt-0.5">Có mặt đúng giờ</p>
                  </div>
                  <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200 shadow-2xs">
                    <p className="text-xl sm:text-2xl font-black text-amber-700">{sessionStats.lateStudents}</p>
                    <p className="text-[11px] text-amber-800 font-semibold mt-0.5">Đi muộn</p>
                  </div>
                  <div className="bg-rose-50/70 p-3 rounded-xl border border-rose-200 shadow-2xs">
                    <p className="text-xl sm:text-2xl font-black text-rose-700">{sessionStats.absentStudents}</p>
                    <p className="text-[11px] text-rose-800 font-semibold mt-0.5">Vắng mặt</p>
                  </div>
                  <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-200 shadow-2xs col-span-2 sm:col-span-1">
                    <p className="text-xl sm:text-2xl font-black text-indigo-700">{sessionStats.attendanceRate}%</p>
                    <p className="text-[11px] text-indigo-800 font-semibold mt-0.5">Tỷ lệ chuyên cần</p>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-2xl overflow-x-auto shadow-2xs">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-100/80 border-b border-gray-200 text-xs text-gray-600 uppercase">
                      <tr>
                        <th className="px-4 py-3 font-bold whitespace-nowrap">Sinh Viên</th>
                        <th className="px-4 py-3 font-bold whitespace-nowrap">Email</th>
                        <th className="px-4 py-3 font-bold whitespace-nowrap text-center">Trạng Thái</th>
                        <th className="px-4 py-3 font-bold whitespace-nowrap text-center">Giờ Quét QR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {sessionStats.attendanceDetails.map((student: any) => (
                        <tr key={student.studentId} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-4 py-2.5 font-bold text-xs sm:text-sm text-gray-900 whitespace-nowrap">{student.studentName}</td>
                          <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{student.studentEmail}</td>
                          <td className="px-4 py-2.5 text-center whitespace-nowrap">
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              student.status === "PRESENT"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : student.status === "LATE"
                                ? "bg-amber-100 text-amber-800 border border-amber-300"
                                : "bg-rose-100 text-rose-800 border border-rose-300"
                            }`}>
                              {student.status === "PRESENT" ? "Có mặt" : student.status === "LATE" ? "Đi muộn" : "Vắng"}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-center text-xs text-gray-600 whitespace-nowrap">
                            {student.checkinTime ? new Date(student.checkinTime).toLocaleTimeString("vi-VN") : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Class Stats View */}
            {statsView === "class" && classStats && (
              <div className="space-y-4">
                <div className="bg-emerald-50/70 border border-emerald-200 p-3.5 rounded-2xl">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <p className="text-[11px] font-semibold text-gray-500">Lớp học</p>
                      <p className="font-bold text-xs sm:text-sm text-gray-900 truncate">{classStats.classInfo.name}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-gray-500">Tổng sinh viên</p>
                      <p className="font-bold text-xs sm:text-sm text-gray-900">{classStats.totalStudents}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-gray-500">Số buổi học</p>
                      <p className="font-bold text-xs sm:text-sm text-gray-900">{classStats.totalSessions}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-gray-500">Chuyên cần TB</p>
                      <p className="font-bold text-xs sm:text-sm text-emerald-700">{classStats.averageAttendanceRate}%</p>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
                  <div className="bg-gray-100/80 px-4 py-3 border-b border-gray-200 font-bold text-xs uppercase text-gray-700">
                    Báo Cáo Từng Sinh Viên
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-600">
                        <tr>
                          <th className="px-4 py-2.5 font-bold whitespace-nowrap">Sinh Viên</th>
                          <th className="px-4 py-2.5 font-bold whitespace-nowrap">Email</th>
                          <th className="px-4 py-2.5 text-center font-bold whitespace-nowrap text-emerald-700">Đúng giờ</th>
                          <th className="px-4 py-2.5 text-center font-bold whitespace-nowrap text-amber-700">Đi muộn</th>
                          <th className="px-4 py-2.5 text-center font-bold whitespace-nowrap text-rose-700">Vắng</th>
                          <th className="px-4 py-2.5 text-center font-bold whitespace-nowrap">Tỷ lệ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {classStats.studentStats.map((student: any) => (
                          <tr key={student.studentId} className="hover:bg-gray-50/80 transition-colors">
                            <td className="px-4 py-2.5 font-bold text-xs sm:text-sm text-gray-900 whitespace-nowrap">{student.studentName}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{student.studentEmail}</td>
                            <td className="px-4 py-2.5 text-center text-emerald-600 font-bold text-xs whitespace-nowrap">{student.presentSessions}</td>
                            <td className="px-4 py-2.5 text-center text-amber-600 font-bold text-xs whitespace-nowrap">{student.lateSessions}</td>
                            <td className="px-4 py-2.5 text-center text-rose-600 font-bold text-xs whitespace-nowrap">{student.absentSessions}</td>
                            <td className="px-4 py-2.5 text-center whitespace-nowrap">
                              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                parseFloat(student.attendanceRate) >= 80
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                  : parseFloat(student.attendanceRate) >= 60
                                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                                  : "bg-rose-100 text-rose-800 border border-rose-300"
                              }`}>
                                {student.attendanceRate}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Gradebook Modal */}
      {selectedClassForGrades && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-1 sm:p-3 md:p-5">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-7xl h-[96vh] sm:h-auto max-h-[96vh] sm:max-h-[92vh] flex flex-col border border-purple-200/90 overflow-hidden animate__animated animate__zoomIn animate__faster">
            <div className="p-3.5 sm:p-4 border-b border-purple-800 bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 shadow-inner">
                  <Award className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-extrabold truncate">
                    Bảng Điểm Lớp: {selectedClassForGrades.name}
                  </h2>
                  <p className="text-xs text-purple-100 truncate">
                    Quản lý điểm số, bài tập & SpeedGrader trực tuyến
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedClassForGrades(null)} 
                className="p-1.5 sm:p-2 hover:bg-white/20 rounded-full text-white/80 hover:text-white transition-colors cursor-pointer shrink-0 ml-2"
                aria-label="Đóng bảng điểm"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-1 sm:p-3 md:p-4 bg-gray-50/50">
              <Gradebook classId={selectedClassForGrades.id} />
            </div>
          </div>
        </div>
      )}

      {/* Class Materials Modal */}
      {selectedClassForMaterials && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 md:p-6">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-amber-200/90 w-full max-w-4xl max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate__animated animate__zoomIn animate__faster">
            <div className="p-4 sm:p-5 border-b border-amber-700 bg-gradient-to-r from-amber-600 via-amber-700 to-orange-700 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 shadow-inner">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-extrabold truncate">
                    Tài liệu học tập: {selectedClassForMaterials.name}
                  </h2>
                  <p className="text-xs text-amber-100 truncate">
                    Quản lý link tài liệu, video bài giảng, Google Drive & Slide cho lớp
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedClassForMaterials(null)}
                className="p-1.5 sm:p-2 hover:bg-white/20 rounded-full text-white/80 hover:text-white transition-colors cursor-pointer shrink-0 ml-2"
                aria-label="Đóng tài liệu"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 bg-gray-50/50">
              <ClassMaterialsPanel
                classId={selectedClassForMaterials.id}
                className={selectedClassForMaterials.name}
                token={localStorage.getItem('token')}
              />
            </div>
          </div>
        </div>
      )}

      {/* Manual Attendance Modal */}
      {selectedSessionForAttendance && selectedClass && (
        <ManualAttendance 
          session={selectedSessionForAttendance} 
          classId={selectedClass.id}
          onClose={() => setSelectedSessionForAttendance(null)} 
        />
      )}

      {/* Student Management Modal */}
      {isStudentManagementOpen && (
        <StudentManagementModal
          onClose={() => setIsStudentManagementOpen(false)}
          classes={classes.map(c => ({ id: c.id, name: c.name }))}
          onDataChanged={fetchClasses}
        />
      )}

      {/* Tuition Management Modal */}
      {isTuitionModalOpen && (
        <TuitionManagementModal
          onClose={() => setIsTuitionModalOpen(false)}
          classes={classes.map(c => ({ id: c.id, name: c.name }))}
        />
      )}
    </div>
  );
}
