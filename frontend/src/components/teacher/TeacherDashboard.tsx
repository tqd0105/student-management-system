"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE_URL } from "@/config/api";
import StudentDirectory from "@/components/teacher/StudentDirectory";
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
  DeleteIcon,
  LogOut,
  Award,
  ClipboardList,
  ChevronDown,
  CreditCard,
  SlidersHorizontal,
  BookOpen,
  BarChart3,
  Sparkles,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Eye,
  TrendingUp,
  Activity,
  CalendarDays,
  Check
} from "lucide-react";
import Gradebook from "./Gradebook";
import ManualAttendance from "./ManualAttendance";
import StudentManagementModal from "./StudentManagementModal";
import TuitionManagementModal from "./TuitionManagementModal";
import ClassMaterialsPanel from "./ClassMaterialsPanel";

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

  useEffect(() => {
    fetchClasses();
    fetchActiveQRSessions(); // Thêm dòng này để fetch active QR sessions khi load page
  }, []);

  // Timer to automatically check and update expired QR sessions
  useEffect(() => {
    const checkExpiredSessions = async () => {
      const now = new Date();

      // Check all sessions for expiration
      for (const session of sessions) {
        if (session.isActive && session.qrExpiresAt) {
          const expiresAt = new Date(session.qrExpiresAt);
          if (now > expiresAt) {
            // console.log(
            //   `⏰ Session ${session.id} QR has expired, auto-stopping...`
            // );
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
          // console.log(`⏰ Removing expired QR from cache: ${sessionId}`);
          setQrDataCache((prev) => {
            const newCache = new Map(prev);
            newCache.delete(sessionId);
            return newCache;
          });
        }
      });
    };

    const interval = setInterval(checkExpiredSessions, 10000); // Check every 10 seconds
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

        // Duyệt qua tất cả classes và tìm sessions có QR active
        for (const cls of data.data) {
          // Fetch sessions cho mỗi class
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
            
            // Tìm sessions có QR code active
            for (const session of sessionsData.data) {
              if (session.qrCode && session.qrExpiresAt && session.isActive) {
                const now = new Date();
                const expiresAt = new Date(session.qrExpiresAt);
                
                // Chỉ thêm vào cache nếu QR chưa hết hạn
                if (now <= expiresAt) {
                  // Generate QR image URL lại
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

        // Cập nhật cache với active QR sessions
        setQrDataCache(activeQRSessions);
        // console.log(`🔄 Restored ${activeQRSessions.size} active QR sessions from server`);
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
        // console.log("Sessions fetched:", data);
        setSessions(data.data || []);
      } else {
        const errorData = await response.json();
        console.error("Error fetching sessions:", errorData);
        alert(
          `Error fetching sessions: ${errorData.message || "Unknown error"}`
        );
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

    // console.log("Creating session for class:", selectedClass);
    // console.log("Session title:", newSessionTitle);

    try {
      const token = localStorage.getItem("token");
      // console.log("Using token:", token ? "Token exists" : "No token");

      const url = `${API_BASE_URL}/api/teacher/classes/${selectedClass.id}/sessions`;
      // console.log("POST URL:", url);

      const body = {
        title:
          newSessionTitle ||
          `Bài học ${new Date().toLocaleDateString("vi-VN")}`,
      };
      // console.log("Request body:", body);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      // console.log("Response status:", response.status);
      // console.log("Response headers:", response.headers);

      if (response.ok) {
        const data = await response.json();
        // console.log("Session created successfully:", data);
        fetchClassSessions(selectedClass.id);
        setIsCreateSessionModalOpen(false);
        setNewSessionTitle("");
        alert("Session created successfully!");
      } else {
        const errorData = await response.json();
        console.error("Error response:", errorData);
        alert(
          `Error creating session: ${errorData.message || "Unknown error"}`
        );
      }
    } catch (error) {
      console.error("Error creating session:", error);
      alert("Network error. Please check if backend is running.");
    }
  };

  const generateQR = async (sessionId: string) => {
    try {
      // console.log("🔄 Generating QR for session:", sessionId);
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

      // console.log("🔄 QR Response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        // console.log("✅ QR Data received:", data);
        // console.log("🔍 QR Image URL:", data.data?.qrImageUrl);

        // Save QR data to cache
        setQrDataCache((prev) => {
          const newCache = new Map(prev);
          // console.log("💾 Saving QR to cache with sessionId:", sessionId);
          // console.log("💾 QR data being saved:", data.data);
          newCache.set(sessionId, data.data);
          // console.log("💾 Cache after save:", newCache);
          return newCache;
        });

        setCurrentQR(data.data);
        setShowQRModal(true); // Show QR in modal
        fetchClassSessions(selectedClass?.id || ""); // Refresh sessions
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
      // console.log("🛑 Stopping session:", sessionId);
      // console.log(
      //   "🔗 API URL:",
      //   `${API_BASE_URL}/api/teacher/sessions/${sessionId}/end`
      // );

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

      // console.log("📡 Response status:", response.status);
      // console.log("📡 Response ok:", response.ok);

      if (response.ok) {
        // Remove from cache immediately when session ends
        setQrDataCache((prev) => {
          const newCache = new Map(prev);
          newCache.delete(sessionId);
          // console.log("🗑️ Removed QR from cache for session:", sessionId);
          // console.log("📦 Cache after removal:", newCache);
          return newCache;
        });

        setCurrentQR(null);
        setShowQRModal(false); // Close QR modal if open

        // Only refresh sessions if we're in a session modal
        if (selectedClass?.id) {
          // console.log("🔄 Refreshing sessions for class:", selectedClass.id);
          fetchClassSessions(selectedClass.id);
        } else {
          // console.log("ℹ️ No selected class, skipping session refresh");
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

  const resumeSession = async (sessionId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_BASE_URL}/api/teacher/sessions/${sessionId}/resume`,
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
        // console.log("✅ Resume response:", data);

        // Backend resumeSession returns updatedSession with qrCode (base64) and qrExpiresAt
        if (data.data && data.data.qrCode) {
          // console.log("💾 Saving resumed QR data to cache");

          // Find session info for complete QRData
          const sessionInfo = sessions.find((s: Session) => s.id === sessionId);

          const qrData: QRData = {
            sessionId: sessionId,
            qrCode: data.data.qrCode,
            qrImageUrl: `data:image/png;base64,${data.data.qrCode}`,
            expiresAt: data.data.qrExpiresAt,
            sessionInfo: {
              id: sessionId,
              title: sessionInfo?.title || "Session",
              className: selectedClass?.name || "Unknown Class",
            },
          };

          setQrDataCache((prev) => {
            const newCache = new Map(prev);
            newCache.set(sessionId, qrData);
            return newCache;
          });
        } else {
          // console.log("⚠️ No QR data in resume response");
        }

        fetchClassSessions(selectedClass?.id || ""); // Refresh sessions
        alert("✅ QR code resumed successfully!");
      } else {
        const errorData = await response.json();
        alert(`❌ Error resuming QR: ${errorData.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error resuming session:", error);
      alert("❌ Network error while resuming QR code.");
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
        // Remove from cache when session is deleted
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
        alert(
          `❌ Error deleting session: ${errorData.message || "Unknown error"}`
        );
      }
    } catch (error) {
      console.error("Error deleting session:", error);
      alert("❌ Network error while deleting session.");
    }
  };

  // Fetch session statistics
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
        alert(
          `❌ Error fetching session stats: ${
            errorData.message || "Unknown error"
          }`
        );
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

  // Fetch class statistics
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
        alert(
          `❌ Error fetching class stats: ${
            errorData.message || "Unknown error"
          }`
        );
      }
    } catch (error) {
      console.error("Error fetching class stats:", error);
      alert("❌ Network error while fetching class stats.");
    } finally {
      setClassStatsLoading(false);
    }
  };

  // Open statistics modal
  const openStatsModal = async (type: "session" | "class", sessionId?: string) => {
    setStatsView(type);
    
    try {
      if (type === "session" && sessionId) {
        setSelectedStatsSession(sessionId);
        await fetchSessionStats(sessionId);
      } else if (type === "class" && selectedClass) {
        await fetchClassStats(selectedClass.id);
      }
      // Only show modal after data is loaded
      setShowStatsModal(true);
    } catch (error) {
      console.error("Error loading stats:", error);
      // Don't show modal if there was an error loading data
    }
  };

  const deleteQRCode = async (sessionId: string) => {
    if (!confirm("Are you sure you want to delete this QR code?")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_BASE_URL}/api/teacher/sessions/${sessionId}/qr`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        setCurrentQR(null);
        setShowQRModal(false);
        fetchClassSessions(selectedClass?.id || "");
        alert("✅ QR code deleted successfully!");
      } else {
        const errorData = await response.json();
        alert(
          `❌ Error deleting QR code: ${errorData.message || "Unknown error"}`
        );
      }
    } catch (error) {
      console.error("Error deleting QR code:", error);
      alert("❌ Network error while deleting QR code.");
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

    // Validate that the selected date/time is not in the past
    const selectedDateTime = new Date(editSessionDate);
    const currentDateTime = new Date();

    if (selectedDateTime < currentDateTime) {
      alert(
        "❌ Cannot set session time in the past. Please select a future date and time."
      );
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const payload = {
        title: editSessionTitle,
        startTime: editSessionDate,
      };

      // console.log("🔄 Updating session:", editingSession.id);
      // console.log("📤 Payload:", payload);

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

      // console.log("📥 Response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        // console.log("✅ Success:", data);
        setIsEditSessionModalOpen(false);
        setEditingSession(null);
        setEditSessionTitle("");
        setEditSessionDate("");
        fetchClassSessions(selectedClass?.id || "");
        alert("✅ Session updated successfully!");
      } else {
        const errorData = await response.json();
        console.error("❌ Error response:", errorData);
        alert(
          `❌ Error updating session: ${errorData.message || "Unknown error"}`
        );
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
        `${
          process.env.NEXT_PUBLIC_API_URL || "${API_BASE_URL}"
        }/api/users/delete-account`,
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-xs font-semibold text-slate-500">Đang tải dữ liệu giảng viên...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-800 font-sans">
      {/* Header / Top Navigation */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Left: Brand & Teacher Profile */}
            <div className="flex items-center space-x-3 md:space-x-4">
              <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
                <GraduationCap className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base md:text-lg font-bold text-slate-900 tracking-tight">
                    Cổng Giảng Viên
                  </span>
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                    Teacher Portal
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-medium text-slate-700">{user?.name || "Giảng viên"}</span>
                  {user?.email && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-500 truncate max-w-[180px] sm:max-w-none">{user?.email}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Actions Toolbar */}
            <div className="flex items-center gap-2 md:gap-3">
              {/* Refresh live classes */}
              <button
                type="button"
                onClick={fetchClasses}
                className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/60 rounded-xl transition-all border border-slate-200/80 cursor-pointer"
                title="Làm mới dữ liệu lớp học"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              {/* Quản lý Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsManagementMenuOpen(!isManagementMenuOpen)}
                  className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl shadow-xs flex items-center gap-2 font-semibold text-xs md:text-sm cursor-pointer transition-all hover:border-slate-300"
                >
                  <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                  <span className="hidden sm:inline">Quản lý</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isManagementMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isManagementMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsManagementMenuOpen(false)} 
                    />
                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-4 py-2 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Trung tâm quản lý
                      </div>
                      
                      {/* Item 1: Quản lý học sinh */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsManagementMenuOpen(false);
                          setIsStudentManagementOpen(true);
                        }}
                        className="w-full px-4 py-3 text-left text-xs md:text-sm hover:bg-indigo-50/60 flex items-center gap-3 text-slate-700 transition-colors cursor-pointer group"
                      >
                        <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                          <Users size={18} />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">Quản lý học sinh</p>
                          <p className="text-[11px] text-slate-500">Hồ sơ, MSSV, thông tin liên hệ</p>
                        </div>
                      </button>

                      {/* Item 2: Quản lý học phí */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsManagementMenuOpen(false);
                          setIsTuitionModalOpen(true);
                        }}
                        className="w-full px-4 py-3 text-left text-xs md:text-sm hover:bg-amber-50/60 flex items-center gap-3 text-slate-700 transition-colors cursor-pointer group"
                      >
                        <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                          <CreditCard size={18} />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900 group-hover:text-amber-600 transition-colors">Quản lý học phí</p>
                          <p className="text-[11px] text-slate-500">Biểu phí & trạng thái đóng</p>
                        </div>
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Create Class Button */}
              <button
                onClick={() => setIsCreateClassModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-3.5 py-2 md:px-4 md:py-2.5 rounded-xl shadow-md shadow-indigo-200 flex items-center gap-1.5 cursor-pointer font-semibold text-xs md:text-sm transition-all hover:shadow-lg"
              >
                <Plus className="w-4 h-4" />
                <span>Tạo Lớp Mới</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* KPI Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Total Classes */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Tổng số Lớp học
                </p>
                <p className="text-3xl font-extrabold text-slate-900 mt-2">
                  {classes.length}
                </p>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Đang hoạt động trong kỳ
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <GraduationCap className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Total Students */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Tổng số Sinh viên
                </p>
                <p className="text-3xl font-extrabold text-slate-900 mt-2">
                  {classes.reduce((total, cls) => total + cls.enrollments.length, 0)}
                </p>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Đã ghi danh vào các lớp
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Active QR Sessions */}
          {(() => {
            const activeQRCount = Array.from(qrDataCache.values()).filter(
              (qr) => new Date() <= new Date(qr.expiresAt)
            ).length;

            return (
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Phiên QR Điểm danh
                    </p>
                    <p className="text-3xl font-extrabold text-slate-900 mt-2">
                      {activeQRCount}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      {activeQRCount > 0 ? (
                        <>
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          <span className="text-xs font-semibold text-emerald-600">Đang mở trực tiếp</span>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">Chưa có phiên QR nào mở</span>
                      )}
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center">
                    <QrCode className="w-6 h-6" />
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Live Attendance Monitor (Active QR Sessions) */}
        {qrDataCache.size > 0 && (
          <div className="bg-white rounded-2xl border border-emerald-200/80 shadow-xs overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-50/80 via-teal-50/50 to-white px-6 py-4 border-b border-emerald-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <Activity className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    Giám Sát Điểm Danh Trực Tiếp (Live QR)
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                      {qrDataCache.size} phiên
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Mã QR đang phát trên màn hình lớp học. Bấm vào thẻ để phóng to hoặc kết thúc phiên.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {Array.from(qrDataCache.entries()).map(([sessionId, qrData]) => {
                  const isExpired = new Date() > new Date(qrData.expiresAt);
                  const isExpiringSoon =
                    !isExpired &&
                    new Date(qrData.expiresAt).getTime() - Date.now() < 60000;

                  return (
                    <div
                      key={sessionId}
                      className={`rounded-2xl p-4 border transition-all cursor-pointer flex flex-col justify-between ${
                        isExpired
                          ? "border-rose-200 bg-rose-50/30 hover:border-rose-300"
                          : isExpiringSoon
                          ? "border-amber-200 bg-amber-50/30 hover:border-amber-300 shadow-sm"
                          : "border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md"
                      }`}
                      onClick={() => {
                        if (isExpired) {
                          alert("Mã QR này đã hết hạn. Vui lòng tạo mã QR mới.");
                          return;
                        }
                        setCurrentQR(qrData);
                        setShowQRModal(true);
                      }}
                    >
                      <div className="flex gap-4 items-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-xl border border-slate-200 p-1 shrink-0 flex items-center justify-center">
                          <img
                            src={qrData.qrImageUrl}
                            alt="QR Preview"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4
                            className="font-bold text-sm text-slate-900 truncate"
                            title={qrData.sessionInfo.title}
                          >
                            {qrData.sessionInfo.title}
                          </h4>
                          <p
                            className="text-xs text-slate-500 truncate mt-0.5"
                            title={qrData.sessionInfo.className}
                          >
                            {qrData.sessionInfo.className}
                          </p>
                          <div className="mt-2 flex items-center gap-1.5">
                            {isExpired ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                                Đã hết hạn
                              </span>
                            ) : isExpiringSoon ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 animate-pulse">
                                Hết hạn trong &lt; 1p
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Đang phát mã
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(qrData.expiresAt).toLocaleTimeString("vi-VN")}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isExpired) {
                              alert("Mã QR đã hết hạn.");
                              return;
                            }
                            setCurrentQR(qrData);
                            setShowQRModal(true);
                          }}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Trình chiếu</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            endSession(sessionId);
                          }}
                          className="inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
                        >
                          <StopCircle className="w-3.5 h-3.5" />
                          <span>Dừng</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Classes Section Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Danh Sách Lớp Học
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                {classes.length} lớp
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Quản lý buổi học, điểm danh QR, bảng điểm và học sinh từng lớp
            </p>
          </div>
          <button
            onClick={() => setIsCreateClassModalOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100/80 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm lớp mới</span>
          </button>
        </div>

        {/* Empty State */}
        {classes.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Chưa có lớp học nào</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
              Bạn chưa tạo lớp học nào trong hệ thống. Hãy tạo lớp học đầu tiên để bắt đầu quản lý sinh viên và điểm danh.
            </p>
            <button
              onClick={() => setIsCreateClassModalOpen(true)}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo Lớp Học Đầu Tiên</span>
            </button>
          </div>
        )}

        {/* Classes Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {classes.map((cls) => (
            <div
              key={cls.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
            >
              <div className="p-6">
                {/* Class Card Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white font-bold text-base flex items-center justify-center shadow-xs shrink-0">
                      {cls.name ? cls.name.charAt(0).toUpperCase() : "C"}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {cls?.name || "Lớp học chưa đặt tên"}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                        {cls?.description || "Chưa có mô tả cho lớp học này"}
                      </p>
                    </div>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setSelectedClass(cls);
                        fetchClassSessions(cls.id);
                      }}
                      className="p-2 rounded-xl text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors cursor-pointer"
                      title="Quản lý buổi học & QR"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedClassForStudent(cls);
                        setIsAddStudentModalOpen(true);
                      }}
                      className="p-2 rounded-xl text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors cursor-pointer"
                      title="Thêm học sinh vào lớp"
                    >
                      <UserPlus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setSelectedClassForGrades(cls)}
                      className="p-2 rounded-xl text-purple-600 hover:bg-purple-50 hover:text-purple-700 transition-colors cursor-pointer"
                      title="Quản lý bảng điểm"
                    >
                      <Award className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setSelectedClassForMaterials(cls)}
                      className="p-2 rounded-xl text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer"
                      title="Tài liệu học tập"
                    >
                      <BookOpen className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteClass(cls.id)}
                      className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
                      title="Xoá lớp học"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Enrolled Students Roster */}
                <div className="mt-5 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Danh sách sinh viên
                    </span>
                    <span className="bg-slate-100 text-slate-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                      {cls.enrollments.length} sinh viên
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {cls.enrollments.map((enrollment) => (
                      <div
                        key={enrollment.student.id}
                        className="flex items-center justify-between bg-slate-50/80 hover:bg-slate-100/80 px-3 py-2 rounded-xl transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
                            {(enrollment?.student?.name || enrollment?.student?.email || "S")
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-800 truncate">
                              {enrollment?.student?.name || enrollment?.student?.email || "Chưa có tên"}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate">
                              {enrollment?.student?.email || ""}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => removeStudent(cls.id, enrollment.student.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                          title="Xóa sinh viên khỏi lớp"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      </div>
                    ))}

                    {cls.enrollments.length === 0 && (
                      <div className="py-4 text-center">
                        <p className="text-xs text-slate-400">Chưa có sinh viên nào trong lớp này</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Class Card Footer */}
              <div className="bg-slate-50/60 px-6 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Quản lý phiên & điểm danh</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClass(cls);
                    fetchClassSessions(cls.id);
                  }}
                  className="font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  <span>Mở phiên QR</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* ========================================================================= */}
      {/* MODAL 1: SESSIONS MANAGEMENT MODAL (CRITICAL SPECIFICATION FOCUS)        */}
      {/* ========================================================================= */}
      {selectedClass && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    Quản Lý Buổi Học & QR
                    <span className="text-indigo-600 font-extrabold">{selectedClass.name}</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tạo phiên điểm danh QR trực tiếp, điểm danh thủ công hoặc theo dõi báo cáo
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedClass(null);
                  setSessions([]);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-full transition-colors cursor-pointer"
                title="Đóng cửa sổ"
              >
                <X size={20} />
              </button>
            </div>

            {/* Action Bar inside Modal */}
            <div className="px-6 py-3.5 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={() => setIsCreateSessionModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs md:text-sm font-semibold px-4 py-2 rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tạo Buổi Học Mới</span>
              </button>

              <button
                onClick={() => openStatsModal("class")}
                disabled={classStatsLoading}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs md:text-sm font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {classStatsLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-slate-600"></div>
                    <span>Đang tải thống kê...</span>
                  </>
                ) : (
                  <>
                    <BarChart3 className="w-4 h-4 text-indigo-600" />
                    <span>Thống Kê Toàn Lớp</span>
                  </>
                )}
              </button>
            </div>

            {/* Sessions List (Scrollable) */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4 bg-slate-50/40">
              {sessionsLoading ? (
                <div className="text-center py-16">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-3"></div>
                  <p className="text-xs font-semibold text-slate-500">Đang tải danh sách buổi học...</p>
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200 p-8">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                    <Calendar className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">Chưa có buổi học nào</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-4">
                    Lớp học này chưa có buổi học nào được lên lịch. Hãy bấm &quot;Tạo Buổi Học Mới&quot; để bắt đầu điểm danh.
                  </p>
                  <button
                    onClick={() => setIsCreateSessionModalOpen(true)}
                    className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tạo buổi học ngay</span>
                  </button>
                </div>
              ) : (
                sessions.map((session) => {
                  const now = new Date();
                  const qrData = qrDataCache.get(session.id);
                  const hasQR = Boolean(session.qrCode && session.qrExpiresAt);
                  const isQRExpired = hasQR
                    ? now > new Date(session.qrExpiresAt!)
                    : false;
                  const isQRExpiringSoon =
                    hasQR && !isQRExpired
                      ? new Date(session.qrExpiresAt!).getTime() - now.getTime() < 60000
                      : false;
                  const effectiveIsActive = Boolean(session.isActive && hasQR && !isQRExpired);

                  return (
                    <div
                      key={session.id}
                      className={`bg-white rounded-2xl border p-5 transition-all shadow-xs hover:shadow-md ${
                        effectiveIsActive
                          ? "border-emerald-300 ring-1 ring-emerald-300/40 bg-emerald-50/20"
                          : isQRExpired
                          ? "border-slate-200"
                          : "border-slate-200"
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        {/* Session Left Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-base text-slate-900 truncate">
                              {session.title || "Buổi học chưa đặt tên"}
                            </h4>

                            {/* Quick Session Actions */}
                            <div className="flex items-center gap-1 bg-slate-100/80 px-2 py-0.5 rounded-lg">
                              <button
                                onClick={() => openEditSession(session)}
                                className="text-slate-500 hover:text-indigo-600 p-1 transition-colors cursor-pointer"
                                title="Đổi tên & thời gian buổi học"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setSelectedSessionForAttendance(session)}
                                className="text-slate-500 hover:text-emerald-600 p-1 transition-colors cursor-pointer"
                                title="Điểm danh thủ công"
                              >
                                <ClipboardList className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deleteSession(session.id)}
                                className="text-slate-500 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                                title="Xoá buổi học"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div className="mt-2 flex items-center gap-2 flex-wrap">
                            {effectiveIsActive ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                Đang phát mã QR (Học sinh có thể quét)
                              </span>
                            ) : isQRExpired ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                <AlertCircle className="w-3.5 h-3.5" />
                                Mã QR đã hết hạn
                              </span>
                            ) : session.isActive ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                Buổi học đang diễn ra (Chưa tạo QR)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                Đã kết thúc
                              </span>
                            )}
                          </div>

                          {/* Timestamps */}
                          <div className="mt-3 flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <strong className="text-slate-700">Bắt đầu:</strong>{" "}
                              {new Date(session.startTime).toLocaleString("vi-VN")}
                            </span>
                            {session.qrExpiresAt && (
                              <span
                                className={`flex items-center gap-1 ${
                                  isQRExpired
                                    ? "text-rose-600 font-semibold"
                                    : isQRExpiringSoon
                                    ? "text-amber-600 font-semibold animate-pulse"
                                    : "text-slate-600"
                                }`}
                              >
                                <Clock className="w-3.5 h-3.5" />
                                <strong>Hạn quét QR:</strong>{" "}
                                {new Date(session.qrExpiresAt).toLocaleTimeString("vi-VN")}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Session Right Actions Toolbar */}
                        <div className="flex items-center gap-2 shrink-0">
                          {!hasQR || isQRExpired ? (
                            <div className="flex items-center gap-2">
                              {isQRExpired && (
                                <button
                                  onClick={() => openStatsModal("session", session.id)}
                                  disabled={sessionStatsLoading.has(session.id)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  {sessionStatsLoading.has(session.id) ? (
                                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                                  ) : (
                                    <BarChart3 className="w-3.5 h-3.5" />
                                  )}
                                  <span>Thống kê</span>
                                </button>
                              )}

                              <button
                                onClick={() => generateQR(session.id)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                              >
                                <Play className="w-3.5 h-3.5" />
                                <span>{isQRExpired ? "Tạo QR mới" : "Tạo Mã QR"}</span>
                              </button>
                            </div>
                          ) : effectiveIsActive ? (
                            <div className="flex items-center gap-2">
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
                                    alert("Không tìm thấy dữ liệu QR trong bộ nhớ. Vui lòng tạo mã QR mới.");
                                  }
                                }}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Trình chiếu QR</span>
                              </button>

                              <button
                                onClick={() => endSession(session.id)}
                                className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <StopCircle className="w-3.5 h-3.5" />
                                <span>Dừng QR</span>
                              </button>

                              <button
                                onClick={() => openStatsModal("session", session.id)}
                                disabled={sessionStatsLoading.has(session.id)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                              >
                                {sessionStatsLoading.has(session.id) ? (
                                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                                ) : (
                                  <BarChart3 className="w-3.5 h-3.5" />
                                )}
                                <span>Thống kê</span>
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => openStatsModal("session", session.id)}
                              disabled={sessionStatsLoading.has(session.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {sessionStatsLoading.has(session.id) ? (
                                <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                              ) : (
                                <BarChart3 className="w-3.5 h-3.5" />
                              )}
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

      {/* ========================================================================= */}
      {/* MODAL 2: CREATE CLASS MODAL                                               */}
      {/* ========================================================================= */}
      {isCreateClassModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 md:p-8 w-full max-w-md animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Tạo Lớp Học Mới</h3>
                <p className="text-xs text-slate-500">Nhập tên lớp và mô tả để khởi tạo lớp học</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Tên Lớp Học <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/30 focus:border-indigo-600 focus:bg-white transition-all"
                  placeholder="Ví dụ: CS101 - Lập trình Web"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Mô tả Lớp Học
                </label>
                <textarea
                  value={newClassDescription}
                  onChange={(e) => setNewClassDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/30 focus:border-indigo-600 focus:bg-white transition-all"
                  rows={3}
                  placeholder="Ví dụ: Học kỳ 1, Thứ 2 và Thứ 5, Phòng A203"
                />
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateClassModalOpen(false);
                    setNewClassName("");
                    setNewClassDescription("");
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-4 rounded-xl text-xs md:text-sm transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={createClass}
                  disabled={!newClassName.trim()}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs md:text-sm shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  Tạo Lớp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CREATE SESSION MODAL                                             */}
      {/* ========================================================================= */}
      {isCreateSessionModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 md:p-8 w-full max-w-md animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Tạo Buổi Học Mới</h3>
                <p className="text-xs text-slate-500">Khởi tạo buổi học cho lớp {selectedClass?.name}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Tên Buổi Học <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newSessionTitle}
                  onChange={(e) => setNewSessionTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/30 focus:border-indigo-600 focus:bg-white transition-all"
                  placeholder="Ví dụ: Buổi 1: Giới thiệu khóa học & Thiết lập môi trường"
                />
              </div>

              <div className="bg-indigo-50/70 p-3.5 rounded-xl border border-indigo-100">
                <p className="text-xs text-indigo-800 leading-relaxed font-medium">
                  💡 Sau khi tạo buổi học, bạn có thể bấm <strong>&quot;Tạo Mã QR&quot;</strong> để hệ thống tạo mã quét điểm danh trực tiếp cho sinh viên.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateSessionModalOpen(false);
                    setNewSessionTitle("");
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-4 rounded-xl text-xs md:text-sm transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={createSession}
                  disabled={!newSessionTitle.trim()}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs md:text-sm shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  Tạo Buổi Học
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: EDIT SESSION MODAL                                               */}
      {/* ========================================================================= */}
      {isEditSessionModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 md:p-8 w-full max-w-md animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Chỉnh Sửa Buổi Học</h3>
                <p className="text-xs text-slate-500">Cập nhật tiêu đề hoặc lịch diễn ra buổi học</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Tên Buổi Học <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editSessionTitle}
                  onChange={(e) => setEditSessionTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 focus:bg-white transition-all"
                  placeholder="Nhập tên buổi học..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Thời Gian Bắt Đầu
                </label>
                <input
                  type="datetime-local"
                  value={editSessionDate}
                  onChange={(e) => setEditSessionDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 focus:bg-white transition-all"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Khuyến nghị chọn thời gian trong tương lai để buổi học diễn ra chuẩn xác.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditSessionModalOpen(false);
                    setEditingSession(null);
                    setEditSessionTitle("");
                    setEditSessionDate("");
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-4 rounded-xl text-xs md:text-sm transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={updateSession}
                  disabled={!editSessionTitle.trim()}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs md:text-sm shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  Lưu Thay Đổi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: ADD STUDENT MODAL                                                */}
      {/* ========================================================================= */}
      {isAddStudentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white shadow-2xl rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden border border-slate-200 flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <UserPlus className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Thêm Sinh Viên Vào Lớp</h3>
                  {selectedClassForStudent && (
                    <p className="text-indigo-100 text-xs mt-0.5">{selectedClassForStudent.name}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAddStudentModalOpen(false);
                  setStudentEmail("");
                  setSelectedClassForStudent(null);
                }}
                className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-white cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Directory Content */}
            <div className="p-5 overflow-y-auto max-h-[calc(90vh-80px)]">
              <StudentDirectory
                targetClassId={selectedClassForStudent?.id}
                targetClassName={selectedClassForStudent?.name}
                onStudentAdded={fetchClasses}
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: QR CODE PRESENTATION MODAL (CLASSROOM SCREEN DISPLAY)           */}
      {/* ========================================================================= */}
      {showQRModal && currentQR && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 w-full max-w-lg text-center border border-slate-100 flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
            {/* Live Indicator Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 mb-3">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span>ĐIỂM DANH TRỰC TIẾP QUA MÃ QR</span>
            </div>

            <h3 className="text-xl md:text-2xl font-black text-slate-900">
              {currentQR.sessionInfo.title}
            </h3>
            <p className="text-sm font-medium text-slate-500 mt-1">
              Lớp: <span className="text-indigo-600 font-bold">{currentQR.sessionInfo.className}</span>
            </p>

            {/* QR Canvas Container */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 my-5 shadow-inner">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm inline-block">
                {currentQR.qrImageUrl ? (
                  <img
                    src={currentQR.qrImageUrl}
                    alt="QR Code"
                    className="w-56 h-56 md:w-64 md:h-64 object-contain"
                    style={{ imageRendering: "pixelated" }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-56 h-56 md:w-64 md:h-64 bg-slate-100 flex items-center justify-center text-slate-400">
                    <div className="text-center">
                      <AlertCircle className="w-10 h-10 mx-auto text-rose-500 mb-2" />
                      <p className="text-xs font-semibold">Mã QR đã hết hạn</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Expiration Info */}
            <div className="text-xs font-semibold text-slate-600 mb-6 space-y-1">
              {(() => {
                const now = new Date();
                const expiresAt = new Date(currentQR.expiresAt);
                const isExpired = now > expiresAt;
                const isExpiringSoon = !isExpired && expiresAt.getTime() - now.getTime() < 60000;

                return (
                  <p
                    className={`font-bold text-sm ${
                      isExpired
                        ? "text-rose-600"
                        : isExpiringSoon
                        ? "text-amber-600 animate-pulse"
                        : "text-emerald-700"
                    }`}
                  >
                    {isExpired
                      ? "⚠️ Mã QR đã hết hạn quét"
                      : isExpiringSoon
                      ? "⏰ Sắp hết hạn trong chưa đầy 1 phút!"
                      : `⏰ Thời hạn quét đến: ${expiresAt.toLocaleTimeString("vi-VN")}`}
                  </p>
                );
              })()}
              <p className="text-slate-400 font-normal text-[11px]">
                Học sinh sử dụng ứng dụng di động hoặc camera để quét mã điểm danh
              </p>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-3 w-full">
              <button
                onClick={() => setShowQRModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-4 rounded-xl text-xs md:text-sm transition-colors cursor-pointer"
              >
                Đóng cửa sổ
              </button>
              <button
                onClick={() => endSession(currentQR.sessionId)}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs md:text-sm shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <StopCircle className="w-4 h-4" />
                <span>Dừng Điểm Danh</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: STATISTICS ANALYTICS MODAL                                       */}
      {/* ========================================================================= */}
      {showStatsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 md:p-8 w-full max-w-6xl max-h-[88vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-5 mb-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-bold text-slate-900">
                    {statsView === "session"
                      ? "Báo Cáo Điểm Danh Buổi Học"
                      : "Thống Kê Điểm Danh Toàn Lớp"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {statsView === "session"
                      ? "Chi tiết thời gian quét mã và tỉ lệ có mặt của sinh viên trong buổi"
                      : "Tổng quan tỉ lệ chuyên cần qua các buổi học"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowStatsModal(false);
                  setSessionStats(null);
                  setClassStats(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                title="Đóng cửa sổ"
              >
                <X size={20} />
              </button>
            </div>

            {/* Session Statistics View */}
            {statsView === "session" && sessionStats && (
              <div className="space-y-6">
                {/* Session Info Banner */}
                <div className="bg-indigo-50/70 border border-indigo-100 p-5 rounded-2xl">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Buổi học</p>
                      <p className="font-bold text-sm text-slate-900 mt-1">
                        {sessionStats.sessionInfo.title}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Lớp</p>
                      <p className="font-bold text-sm text-slate-900 mt-1">
                        {sessionStats.sessionInfo.className}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Thời gian bắt đầu</p>
                      <p className="font-bold text-sm text-slate-900 mt-1">
                        {new Date(sessionStats.sessionInfo.startTime).toLocaleString("vi-VN")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Trạng thái</p>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold mt-1 ${
                          sessionStats.sessionInfo.isActive
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {sessionStats.sessionInfo.isActive ? "Đang diễn ra" : "Đã kết thúc"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* KPI Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
                  <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl text-center">
                    <p className="text-2xl font-black text-slate-900">
                      {sessionStats.totalStudents}
                    </p>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">Tổng số sinh viên</p>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-center">
                    <p className="text-2xl font-black text-emerald-600">
                      {sessionStats.presentStudents}
                    </p>
                    <p className="text-xs font-semibold text-emerald-800 mt-0.5">Có mặt đúng giờ</p>
                  </div>

                  <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl text-center">
                    <p className="text-2xl font-black text-amber-600">
                      {sessionStats.lateStudents}
                    </p>
                    <p className="text-xs font-semibold text-amber-800 mt-0.5">Đi muộn</p>
                  </div>

                  <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl text-center">
                    <p className="text-2xl font-black text-rose-600">
                      {sessionStats.absentStudents}
                    </p>
                    <p className="text-xs font-semibold text-rose-800 mt-0.5">Vắng mặt</p>
                  </div>

                  <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl text-center">
                    <p className="text-2xl font-black text-indigo-600">
                      {sessionStats.attendanceRate}%
                    </p>
                    <p className="text-xs font-semibold text-indigo-800 mt-0.5">Tỉ lệ tham gia</p>
                  </div>
                </div>

                {/* Student Details Table */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-800">
                      Danh sách sinh viên điểm danh
                    </h4>
                    <span className="text-xs text-slate-500">
                      {sessionStats.attendanceDetails.length} sinh viên
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-100/75 text-slate-600 border-b border-slate-200">
                        <tr>
                          <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider">
                            Sinh viên
                          </th>
                          <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-5 py-3 text-center text-xs font-bold uppercase tracking-wider">
                            Trạng thái
                          </th>
                          <th className="px-5 py-3 text-center text-xs font-bold uppercase tracking-wider">
                            Thời gian điểm danh
                          </th>
                          <th className="px-5 py-3 text-center text-xs font-bold uppercase tracking-wider">
                            Độ trễ
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sessionStats.attendanceDetails.map((student: any) => (
                          <tr key={student.studentId} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-5 py-3 text-xs font-bold text-slate-900 whitespace-nowrap">
                              {student.studentName}
                            </td>
                            <td className="px-5 py-3 text-xs text-slate-500 whitespace-nowrap">
                              {student.studentEmail}
                            </td>
                            <td className="px-5 py-3 text-center whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                  student.status === "PRESENT"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : student.status === "LATE"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-rose-100 text-rose-800"
                                }`}
                              >
                                {student.status === "PRESENT"
                                  ? "Có mặt"
                                  : student.status === "LATE"
                                  ? "Đi muộn"
                                  : "Vắng"}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-center text-xs text-slate-600 whitespace-nowrap">
                              {student.checkinTime
                                ? new Date(student.checkinTime).toLocaleTimeString("vi-VN")
                                : "—"}
                            </td>
                            <td className="px-5 py-3 text-center text-xs text-slate-600 whitespace-nowrap">
                              {student.timeFromStart !== null
                                ? `+${student.timeFromStart} phút`
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Class Statistics View */}
            {statsView === "class" && classStats && (
              <div className="space-y-6">
                {/* Class Info Banner */}
                <div className="bg-emerald-50/60 border border-emerald-100 p-5 rounded-2xl">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tên Lớp</p>
                      <p className="font-bold text-sm text-slate-900 mt-1">{classStats.classInfo.name}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng sinh viên</p>
                      <p className="font-bold text-sm text-slate-900 mt-1">{classStats.totalStudents}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng số buổi học</p>
                      <p className="font-bold text-sm text-slate-900 mt-1">{classStats.totalSessions}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tỉ lệ tham gia TB</p>
                      <p className="font-bold text-sm text-emerald-700 mt-1">
                        {classStats.averageAttendanceRate}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Student Performance Table */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-800">
                      Chuyên cần từng sinh viên
                    </h4>
                    <span className="text-xs text-slate-500">
                      {classStats.studentStats.length} sinh viên
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-100/75 text-slate-600 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                            Sinh viên
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                            Email
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                            Có mặt
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                            Đi muộn
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                            Vắng
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                            Tỉ lệ
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                            Điểm danh gần nhất
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {classStats.studentStats.map((student: any) => (
                          <tr key={student.studentId} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-4 py-3 text-xs font-bold text-slate-900 whitespace-nowrap">
                              {student.studentName}
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                              {student.studentEmail}
                            </td>
                            <td className="px-4 py-3 text-center text-xs text-emerald-600 font-bold whitespace-nowrap">
                              {student.presentSessions}
                            </td>
                            <td className="px-4 py-3 text-center text-xs text-amber-600 font-bold whitespace-nowrap">
                              {student.lateSessions}
                            </td>
                            <td className="px-4 py-3 text-center text-xs text-rose-600 font-bold whitespace-nowrap">
                              {student.absentSessions}
                            </td>
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                  parseFloat(student.attendanceRate) >= 80
                                    ? "bg-emerald-100 text-emerald-800"
                                    : parseFloat(student.attendanceRate) >= 60
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-rose-100 text-rose-800"
                                }`}
                              >
                                {student.attendanceRate}%
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center text-xs text-slate-500 whitespace-nowrap">
                              {student.lastAttendance
                                ? new Date(student.lastAttendance).toLocaleDateString("vi-VN")
                                : "Chưa từng"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Session Performance Table */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-800">
                      Lịch sử các buổi học
                    </h4>
                    <span className="text-xs text-slate-500">
                      {classStats.sessionStats.length} buổi học
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-100/75 text-slate-600 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                            Buổi học
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                            Ngày diễn ra
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                            Trạng thái
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                            Có mặt
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                            Đi muộn
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                            Vắng
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                            Tỉ lệ
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {classStats.sessionStats.map((session: any) => (
                          <tr key={session.sessionId} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-4 py-3 text-xs font-bold text-slate-900 whitespace-nowrap">
                              {session.sessionTitle}
                            </td>
                            <td className="px-4 py-3 text-center text-xs text-slate-500 whitespace-nowrap">
                              {new Date(session.startTime).toLocaleDateString("vi-VN")}
                            </td>
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                  session.isActive
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {session.isActive ? "Đang mở" : "Đã kết thúc"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center text-xs text-emerald-600 font-bold whitespace-nowrap">
                              {session.presentStudents}
                            </td>
                            <td className="px-4 py-3 text-center text-xs text-amber-600 font-bold whitespace-nowrap">
                              {session.lateStudents}
                            </td>
                            <td className="px-4 py-3 text-center text-xs text-rose-600 font-bold whitespace-nowrap">
                              {session.absentStudents}
                            </td>
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                  parseFloat(session.attendanceRate) >= 80
                                    ? "bg-emerald-100 text-emerald-800"
                                    : parseFloat(session.attendanceRate) >= 60
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-rose-100 text-rose-800"
                                }`}
                              >
                                {session.attendanceRate}%
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
        <div className="fixed inset-0 bg-gray-900/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col animate__animated animate__zoomIn animate__faster">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
              <h2 className="text-xl font-bold text-gray-800">Bảng Điểm: {selectedClassForGrades.name}</h2>
              <button onClick={() => setSelectedClassForGrades(null)} className="p-2 hover:bg-gray-200 rounded-full">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <Gradebook classId={selectedClassForGrades.id} />
            </div>
          </div>
        </div>
      )}

      {/* Class Materials Modal */}
      {selectedClassForMaterials && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 md:p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <div>
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                  Tài liệu học tập: <span className="text-indigo-600">{selectedClassForMaterials.name}</span>
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">Quản lý link tài liệu, video bài giảng, Google Drive, Slide cho lớp</p>
              </div>
              <button
                onClick={() => setSelectedClassForMaterials(null)}
                className="p-1.5 hover:bg-gray-200 rounded-full transition-colors text-gray-500 hover:text-gray-700 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50">
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
