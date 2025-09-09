"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
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
  const [newClassName, setNewClassName] = useState("");
  const [newClassDescription, setNewClassDescription] = useState("");
  const [newSessionTitle, setNewSessionTitle] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [showQRModal, setShowQRModal] = useState(false);
  const [isEditSessionModalOpen, setIsEditSessionModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [editSessionTitle, setEditSessionTitle] = useState("");
  const [editSessionDate, setEditSessionDate] = useState("");

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
            console.log(
              `⏰ Session ${session.id} QR has expired, auto-stopping...`
            );
            try {
              const token = localStorage.getItem("token");
              await fetch(
                `http://192.168.88.175:3001/api/teacher/sessions/${session.id}/end`,
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
          console.log(`⏰ Removing expired QR from cache: ${sessionId}`);
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
        "http://192.168.88.175:3001/api/teacher/classes",
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
            `http://192.168.88.175:3001/api/teacher/classes/${cls.id}/sessions`,
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
        console.log(`🔄 Restored ${activeQRSessions.size} active QR sessions from server`);
      }
    } catch (error) {
      console.error("Error fetching active QR sessions:", error);
    }
  };

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        "http://192.168.88.175:3001/api/teacher/classes",
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
        `http://192.168.88.175:3001/api/teacher/classes/${classId}/sessions`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log("Sessions fetched:", data);
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
        "http://192.168.88.175:3001/api/teacher/classes",
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
        `http://192.168.88.175:3001/api/teacher/classes/${selectedClassForStudent.id}/students`,
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
        `http://192.168.88.175:3001/api/teacher/classes/${classId}/students/${studentId}`,
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

    console.log("Creating session for class:", selectedClass);
    console.log("Session title:", newSessionTitle);

    try {
      const token = localStorage.getItem("token");
      console.log("Using token:", token ? "Token exists" : "No token");

      const url = `http://192.168.88.175:3001/api/teacher/classes/${selectedClass.id}/sessions`;
      console.log("POST URL:", url);

      const body = {
        title:
          newSessionTitle ||
          `Bài học ${new Date().toLocaleDateString("vi-VN")}`,
      };
      console.log("Request body:", body);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      console.log("Response status:", response.status);
      console.log("Response headers:", response.headers);

      if (response.ok) {
        const data = await response.json();
        console.log("Session created successfully:", data);
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
      console.log("🔄 Generating QR for session:", sessionId);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://192.168.88.175:3001/api/teacher/sessions/${sessionId}/qr`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("🔄 QR Response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("✅ QR Data received:", data);
        console.log("🔍 QR Image URL:", data.data?.qrImageUrl);

        // Save QR data to cache
        setQrDataCache((prev) => {
          const newCache = new Map(prev);
          console.log("💾 Saving QR to cache with sessionId:", sessionId);
          console.log("💾 QR data being saved:", data.data);
          newCache.set(sessionId, data.data);
          console.log("💾 Cache after save:", newCache);
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
      console.log("🛑 Stopping session:", sessionId);
      console.log(
        "🔗 API URL:",
        `http://192.168.88.175:3001/api/teacher/sessions/${sessionId}/end`
      );

      const response = await fetch(
        `http://192.168.88.175:3001/api/teacher/sessions/${sessionId}/end`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("📡 Response status:", response.status);
      console.log("📡 Response ok:", response.ok);

      if (response.ok) {
        // Remove from cache immediately when session ends
        setQrDataCache((prev) => {
          const newCache = new Map(prev);
          newCache.delete(sessionId);
          console.log("🗑️ Removed QR from cache for session:", sessionId);
          console.log("📦 Cache after removal:", newCache);
          return newCache;
        });

        setCurrentQR(null);
        setShowQRModal(false); // Close QR modal if open

        // Only refresh sessions if we're in a session modal
        if (selectedClass?.id) {
          console.log("🔄 Refreshing sessions for class:", selectedClass.id);
          fetchClassSessions(selectedClass.id);
        } else {
          console.log("ℹ️ No selected class, skipping session refresh");
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
        `http://192.168.88.175:3001/api/teacher/sessions/${sessionId}/resume`,
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
        console.log("✅ Resume response:", data);

        // Backend resumeSession returns updatedSession with qrCode (base64) and qrExpiresAt
        if (data.data && data.data.qrCode) {
          console.log("💾 Saving resumed QR data to cache");

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
          console.log("⚠️ No QR data in resume response");
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
        `http://192.168.88.175:3001/api/teacher/sessions/${sessionId}`,
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
        `http://192.168.88.175:3001/api/teacher/sessions/${sessionId}/stats`,
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
        `http://192.168.88.175:3001/api/teacher/classes/${classId}/stats`,
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
        `http://192.168.88.175:3001/api/teacher/sessions/${sessionId}/qr`,
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

      console.log("🔄 Updating session:", editingSession.id);
      console.log("📤 Payload:", payload);

      const response = await fetch(
        `http://192.168.88.175:3001/api/teacher/sessions/${editingSession.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      console.log("📥 Response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Success:", data);
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
        `http://192.168.88.175:3001/api/teacher/classes/${classId}`,
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
          process.env.NEXT_PUBLIC_API_URL || "http://192.168.88.175:3001"
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
          <div className="flex justify-between items-center py-4">
            <div>
              <p className="text-green-600 font-bold text-xl flex items-center gap-2">
                WELCOME BACK,
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
              </p>

              <p className="flex items-center gap-2 my-1">
                <div className="flex items-center gap-1  text-gray-600">
                  <img src="icons/name.png" width="25" height="25" alt="" />
                  <span>Your name: </span>
                </div>
                <p className="font-bold">{user?.name || "Teacher"}</p>
              </p>
              <p className="flex items-center gap-2">
                <div className="flex items-center gap-1  text-gray-600">
                  <img src="icons/email.png" width="25" height="25" alt="" />
                  <span>Your email: </span>
                </div>
                <p className="font-bold">{user?.email}</p>
              </p>
            </div>
            <div className="flex flex-col justify-center items-center gap-2">
              <button
                onClick={() => setIsCreateClassModalOpen(true)}
                className="bg-blue-600 text-white p-3 md:px-4 md:py-2 rounded-full shadow-lg hover:bg-blue-700 flex items-center space-x-0 md:space-x-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span className='hidden md:block'>New</span>
              </button>
              <button
                onClick={handleDeleteAccount}
                className="bg-red-600 text-white p-3 md:px-4 md:py-2 rounded-full hover:bg-red-700 flex items-center space-x-0 md:space-x-2 block md:hidden cursor-pointer"
                title="Delete Account"
              >
                <Trash2 className="w-4 h-4" />
                <span className='hidden md:block'>Delete</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="max-w-7xl    py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 ">
          <div className="bg-white p-6 rounded-lg shadow">
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
          <div className="bg-white p-6 rounded-lg shadow">
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
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <QrCode className="w-8 h-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Active QR Sessions
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
          <div className=" border-4 border-green-500 p-6 rounded-lg shadow-lg mb-8"
          style={{backgroundImage: "linear-gradient(to top, rgb(186, 255, 184) 0%, rgb(255, 255, 255) 100%)"}}
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
                    className={`bg-white rounded-lg p-4 border-3 hover:border-3 transform transition-transform duration-300 hover:scale-105 shadow-lg cursor-pointer hover:shadow-xl transition-all ${
                      isExpired
                        ? "border-red-300 bg-red-50"
                        : isExpiringSoon
                        ? "border-orange-400 border-2 bg-orange-100"
                        : "border-blue-400 hover:border-blue-600 border-3"
                    }`}
                    onClick={() => {
                      if (isExpired) {
                        alert(
                          "⏰ QR code has expired. Please create a new QR code."
                        );
                        return;
                      }
                      setCurrentQR(qrData);
                      setShowQRModal(true);
                    }}
                  >
                    <div className="text-center grid grid-cols-3">
                      <div className="col-span-2 flex items-center justify-center w-full h-full mx-auto bg-gray-100 rounded border">
                        <img
                          src={qrData.qrImageUrl}
                          alt="QR Preview"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="col-span-1 flex flex-col items-center justify-center">
                      <h4
                        className="font-extrabold text-sm text-gray-900 truncate"
                        title={qrData.sessionInfo.title}
                      >
                        {qrData.sessionInfo.title}
                      </h4>
                      <p
                        className="text-xs text-gray-500 truncate"
                        title={qrData.sessionInfo.className}
                      >
                        {qrData.sessionInfo.className}
                      </p>
                      <p
                        className={`text-xs font-bold mt-1 text-center ${
                          isExpired
                            ? "text-red-600"
                            : isExpiringSoon
                            ? "text-orange-600"
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
                        ⏰{new Date(qrData.expiresAt).toLocaleTimeString()}
                      </p>
                      <button
                        onClick={() => endSession(sessionId)}
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
                  💡 Tip: You can manage individual sessions from the class
                  sessions panel
                </p>
              </div>
            )}
          </div>
        )}

        {/* Classes Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {classes.map((cls) => (
            <div key={cls.id} className="bg-white rounded-lg shadow-lg border">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {cls?.name || "Unnamed Class"}
                    </h3>
                    <p className="text-gray-500">
                      {cls?.description || "No description"}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setSelectedClass(cls);
                        fetchClassSessions(cls.id);
                      }}
                      className="bg-blue-100 text-blue-600 hover:bg-blue-200 p-2 rounded-lg cursor-pointer"
                      title="Manage QR Sessions"
                    >
                      <QrCode className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedClassForStudent(cls);
                        setIsAddStudentModalOpen(true);
                      }}
                      className="bg-green-100 text-green-600 hover:bg-green-200 p-2 rounded-lg cursor-pointer"
                      title="Add Student"
                    >
                      <UserPlus className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => deleteClass(cls.id)}
                      className="bg-red-100 text-red-600 hover:bg-red-200 p-2 rounded-lg cursor-pointer"
                      title="Delete Class"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">
                      Students Enrolled
                    </span>
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                      {cls.enrollments.length} students
                    </span>
                  </div>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {cls.enrollments.map((enrollment) => (
                      <div
                        key={enrollment.student.id}
                        className="flex items-center justify-between bg-green-100 p-4 rounded-lg"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {enrollment?.student?.name ||
                              enrollment?.student?.email ||
                              "Unknown Student"}
                          </p>
                          <p className="text-xs text-gray-600">
                            {enrollment?.student?.email || ""}
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            removeStudent(cls.id, enrollment.student.id)
                          }
                          className="text-white hover:text-gray-200 px-4 py-2 bg-red-500 rounded-full shadow-lg flex items-center gap-2 cursor-pointer" 
                        >
                          <UserMinus className="w-5 h-5" /> Xoá
                        </button>
                      </div>
                    ))}
                    {cls.enrollments.length === 0 && (
                      <p className="text-gray-500 text-sm text-center py-2">
                        No students enrolled yet
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
          <div className="fixed inset-0 bg-gray-900/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-2xl border-3 border-black p-6 m-2 md:m-4 lg:m-0 w-full max-w-3xl max-h-[85vh] overflow-y-auto animate__animated animate__bounceIn">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  🎯 QR Sessions - {selectedClass.name}
                </h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setSelectedClass(null);
                      setSessions([]);
                      // Don't reset currentQR here - keep it so View QR works after reopening
                    }}
                    className="text-gray-500 hover:text-gray-700 text-3xl font-bold"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="flex justify-center md:justify-start items-center gap-4">
                <button
                  onClick={() => setIsCreateSessionModalOpen(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 mb-6 flex items-center space-x-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden md:block">Create New Session</span>
                  <span className="block md:hidden">New Session</span>
                </button>

                <button
                  onClick={() => openStatsModal("class")}
                  disabled={classStatsLoading}
                  className="bg-green-600 text-white px-4 py-2 rounded-full hover:bg-green-700 mb-6 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {classStatsLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Loading...</span>
                    </>
                  ) : (
                    <span>📊 Class Stats</span>
                  )}
                </button>
              </div>
              <div className="space-y-4">
                {sessionsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">Loading sessions...</p>
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="text-center py-8 font-bold text-gray-400">
                    <Calendar className="w-16 h-16 mx-auto mb-3  text-gray-400" />
                    <p>No sessions created yet. Create your first session!</p>
                  </div>
                ) : (
                  sessions.map((session) => {
                    // Calculate QR expiration status
                    const now = new Date();
                    const qrData = qrDataCache.get(session.id);
                    const hasQR = session.qrCode && session.qrExpiresAt;
                    const isQRExpired = hasQR
                      ? now > new Date(session.qrExpiresAt!)
                      : false;
                    const isQRExpiringSoon =
                      hasQR && !isQRExpired
                        ? new Date(session.qrExpiresAt!).getTime() -
                            now.getTime() <
                          60000
                        : false;

                    // Determine actual session status (accounting for QR expiration)
                    const effectiveIsActive =
                      session.isActive && hasQR && !isQRExpired;

                    return (
                      <div
                        key={session.id}
                        className={`border-2 rounded-lg shadow-xl p-4 ${
                          effectiveIsActive
                            ? "border-green-600 border-3 bg-green-gradient"
                            : isQRExpired
                            ? "border-red-600 border-3 bg-red-gradient"
                            : "border-gray-400"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h4 className="font-semibold text-gray-900">
                                <span className="font-medium text-gray-400 text-sm">Session: </span>
                                {session.title || "Untitled Session"}
                              </h4>
                              <button
                                onClick={() => openEditSession(session)}
                                className="text-blue-600 hover:text-blue-800 p-1 cursor-pointer"
                                title="Edit session name and time"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteSession(session.id)}
                                className="text-red-600 hover:text-red-800 p-1 cursor-pointer"
                                title="Delete session completely"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <p
                              className={`text-sm font-medium mt-1 ${
                                effectiveIsActive
                                  ? "text-green-600"
                                  : isQRExpired
                                  ? "text-red-600"
                                  : "text-gray-500"
                              }`}
                            >
                              {effectiveIsActive
                                ? "🟢 ACTIVE - Students can scan QR"
                                : isQRExpired
                                ? "❌ QR EXPIRED - Student cannot scan QR"
                                : session.isActive
                                ? "⚫ Session Active (No QR)"
                                : "⚫ Inactive"}
                            </p>
                            <p className="text-sm text-gray-600 mt-2">
                              <span className="font-bold">
                                Session created:
                              </span>{" "}
                              {new Date(session.startTime).toLocaleString(
                                "en-US"
                              )}
                            </p>
                            {session.qrExpiresAt && (
                              <p
                                className={`text-sm mt-1 font-medium ${
                                  isQRExpired
                                    ? "text-red-600"
                                    : isQRExpiringSoon
                                    ? "text-orange-600"
                                    : "text-orange-600"
                                }`}
                              >
                                <span className="font-bold">QR expires:</span>{" "}
                                {new Date(session.qrExpiresAt).toLocaleString(
                                  "en-US"
                                )}
                                {isQRExpired && " (EXPIRED)"}
                                {isQRExpiringSoon && " (EXPIRING SOON)"}
                              </p>
                            )}
                          </div>
                          <div className="flex space-x-2">
                            {!hasQR || isQRExpired ? (
                              <button className="bg-green-600 text-white px-4 py-2 rounded-full flex items-center space-x-1 cursor-pointer">
                                <div>
                                  {isQRExpired ? (
                                    <button
                                      onClick={() =>
                                        openStatsModal("session", session.id)
                                      }
                                      disabled={sessionStatsLoading.has(session.id)}
                                      className="bg-green-600 text-white  rounded-full w-full  flex justify-center items-center space-x-1 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                      title="View session attendance statistics"
                                    >
                                      {sessionStatsLoading.has(session.id) ? (
                                        <>
                                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                          <span>Loading...</span>
                                        </>
                                      ) : (
                                        <span>📊 Stats</span>
                                      )}
                                    </button>
                                  ) : (
                                    <div
                                      className="flex justify-center items-center gap-2"
                                      onClick={() => generateQR(session.id)}
                                    >
                                      <Play className="w-4 h-4" />{" "}
                                      <span>Create QR</span>
                                    </div>
                                  )}
                                </div>
                              </button>
                            ) : effectiveIsActive ? (
                              // QR exists and is active (not expired)
                              <div className="flex flex-col justify-center items-center gap-4">
                                <button
                                  onClick={() => {
                                    // Check if QR data exists in cache first
                                    console.log(
                                      "🔍 Checking cache for session:",
                                      session.id
                                    );
                                    console.log(
                                      "🔍 Cache contents:",
                                      qrDataCache
                                    );
                                    console.log(
                                      "🔍 Cache size:",
                                      qrDataCache.size
                                    );

                                    const cachedQR = qrDataCache.get(
                                      session.id
                                    );
                                    console.log(
                                      "🔍 Cached QR for session:",
                                      cachedQR
                                    );

                                    if (cachedQR) {
                                      console.log(
                                        "✅ Using cached QR data for session:",
                                        session.id
                                      );

                                      // Check if QR is still valid
                                      const now = new Date();
                                      const expiresAt = new Date(
                                        cachedQR.expiresAt
                                      );
                                      console.log("🔍 Current time:", now);
                                      console.log(
                                        "🔍 QR expires at:",
                                        expiresAt
                                      );
                                      console.log(
                                        "🔍 Is expired?",
                                        now > expiresAt
                                      );

                                      if (now > expiresAt) {
                                        alert(
                                          "⏰ QR code has expired. Please create a new QR code."
                                        );
                                        return;
                                      }

                                      setCurrentQR(cachedQR);
                                      setShowQRModal(true);
                                    } else {
                                      console.log(
                                        "⚠️ No cached QR data found for session:",
                                        session.id
                                      );
                                      console.log(
                                        "⚠️ Available cache keys:",
                                        Array.from(qrDataCache.keys())
                                      );
                                      alert(
                                        "❌ QR code not found. Please generate a new QR code first."
                                      );
                                    }
                                  }}
                                  className="bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 flex items-center space-x-1 cursor-pointer"
                                  title="View QR code for students to scan"
                                >
                                  <span>👁️ View QR</span>
                                </button>
                                <button
                                  onClick={() => endSession(session.id)}
                                  className="bg-red-600 text-white px-4 py-2 rounded-full hover:bg-red-700 flex items-center space-x-1 transition-colors cursor-pointer"
                                  title="Stop QR code and end attendance session"
                                >
                                  <span>🛑 Stop QR</span>
                                </button>
                                <button
                                  onClick={() =>
                                    openStatsModal("session", session.id)
                                  }
                                  disabled={sessionStatsLoading.has(session.id)}
                                  className="bg-green-600 text-white px-4 py-2 rounded-full w-full hover:bg-green-700 flex justify-center items-center space-x-1 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="View session attendance statistics"
                                >
                                  {sessionStatsLoading.has(session.id) ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                      <span>Loading...</span>
                                    </>
                                  ) : (
                                    <span>📊 Stats</span>
                                  )}
                                </button>
                              </div>
                            ) : (
                              // QR exists but session is inactive - only show stats
                              <div className="flex justify-center items-center space-x-2">
                                <button
                                  onClick={() =>
                                    openStatsModal("session", session.id)
                                  }
                                  disabled={sessionStatsLoading.has(session.id)}
                                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-1 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="View session attendance statistics"
                                >
                                  {sessionStatsLoading.has(session.id) ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                      <span>Loading...</span>
                                    </>
                                  ) : (
                                    <span>📊 Stats</span>
                                  )}
                                </button>
                              </div>
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
        <div className="fixed inset-0 bg-gray-900/30 flex items-center justify-center z-5">
          <div className="bg-white shadow-2xl rounded-xl p-8 w-full max-w-md border-3 border-black animate__animated animate__bounceIn"
          style={{backgroundImage: "linear-gradient(to top, rgb(255, 237, 254) 0%, rgb(240, 251, 255) 100%)"}}
          >
            <h3 className="text-2xl text-green-600 font-extrabold pb-3 mb-4 uppercase text-center border-b-2">Create New Class</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1 ">
                  Class Name
                </label>
                <input
                  type="text"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-600 rounded-lg shadow-xl focus:outline-none focus:ring-2 focus:ring-green-600"
                  placeholder="Enter class name"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newClassDescription}
                  onChange={(e) => setNewClassDescription(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-600 rounded-lg shadow-xl focus:outline-none focus:ring-2 focus:ring-green-600"
                  rows={3}
                  placeholder="Enter class description"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={createClass}
                  className="flex-1 bg-blue-600 font-bold text-white py-2 px-4 rounded-md shadow-xl hover:bg-blue-700 cursor-pointer"
                >
                  + Create Class
                </button>
                <button
                  onClick={() => {
                    setIsCreateClassModalOpen(false);
                    setNewClassName("");
                    setNewClassDescription("");
                  }}
                  className="flex-1 bg-gray-300 font-bold text-gray-700 py-2 px-4 rounded-md shadow-xl hover:bg-gray-400 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Session Modal */}
      {isCreateSessionModalOpen && (
        <div className="fixed inset-0 bg-gray-900/30 flex items-center justify-center z-50">
          <div className="bg-white shadow-2xl rounded-xl p-8 w-full max-w-md border-3 border-black animate__animated animate__bounceIn"
          style={{backgroundImage: "linear-gradient(to top, rgb(255, 237, 254) 0%, rgb(240, 251, 255) 100%)"}}
          >
            <h3 className="text-2xl text-blue-600 font-extrabold pb-3 mb-4 uppercase text-center border-b-2">Create New Session</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Session Name
                </label>
                <input
                  type="text"
                  value={newSessionTitle}
                  onChange={(e) => setNewSessionTitle(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-600 rounded-lg shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="e.g. Lesson 1: Introduction to React"
                />
              </div>
              <div className="bg-blue-50 p-3 rounded-lg border-2 border-blue-200">
                <p className="text-sm text-blue-700 font-medium">
                  💡 <strong>Tip:</strong> After creating the session, click
                  &quot;Create QR&quot; to generate a QR code for student
                  attendance.
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={createSession}
                  className="flex-1 bg-blue-600 font-bold text-white p-2 rounded-full hover:bg-blue-700 cursor-pointer"
                  disabled={!newSessionTitle.trim()}
                >
                  + Create Session
                </button>
                <button
                  onClick={() => {
                    setIsCreateSessionModalOpen(false);
                    setNewSessionTitle("");
                  }}
                  className="flex-1 bg-gray-300 font-bold text-gray-700 p-2 rounded-full hover:bg-gray-400 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {isAddStudentModalOpen && (
        <div className="fixed inset-0 bg-gray-900/30 flex items-center justify-center z-50">
          <div className="bg-white shadow-2xl rounded-xl mx-2 md:mx-0 p-8 w-full max-w-md border-3 border-black animate__animated animate__bounceIn"
          style={{backgroundImage: "linear-gradient(to top, rgb(255, 237, 254) 0%, rgb(240, 251, 255) 100%)"}}
          >
            <h3 className="text-2xl text-green-600 font-extrabold pb-3 mb-4 uppercase text-center border-b-2">Add Student to Class</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Student Email
                </label>
                <input
                  type="email"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-600 rounded-lg shadow-xl focus:outline-none focus:ring-2 focus:ring-purple-600"
                  placeholder="Enter student email"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={addStudent}
                  className="flex-1 bg-green-600 font-bold text-white p-2 rounded-full hover:bg-green-700 cursor-pointer"
                >
                  + Add Student
                </button>
                <button
                  onClick={() => {
                    setIsAddStudentModalOpen(false);
                    setStudentEmail("");
                    setSelectedClassForStudent(null);
                  }}
                  className="flex-1 bg-gray-300 font-bold text-gray-700 p-2 rounded-full hover:bg-gray-400 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && currentQR && (
        <div className="fixed inset-0 bg-gray-900/70 flex items-center justify-center z-50 ">
          <div className="bg-white rounded-lg p-8 w-full max-w-md text-center animate__animated animate__bounceIn">
            <h3 className="text-xl font-bold mb-4 text-green-700">
              🎯 ATTENDANCE QR CODE
            </h3>

            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <div className="bg-white p-3 rounded border-2 border-green-400 inline-block">
                {currentQR.qrImageUrl ? (
                  <img
                    src={currentQR.qrImageUrl}
                    alt="QR Code"
                    className="w-48 h-48"
                    style={{ imageRendering: "pixelated" }}
                    onError={(e) => {
                      console.error("QR Image load error:", e);
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-48 h-48 bg-gray-200 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <div className="text-2xl mb-2">❌</div>
                      <div className="text-sm">QR Code Expired</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="text-sm text-black font-bold mb-4">
              <p>
                <span className="text-gray-400 font-medium">Session:</span> {currentQR.sessionInfo.title}
              </p>
              <p>
                <span className="text-gray-400 font-medium">Class:</span> {currentQR.sessionInfo.className}
              </p>
              <p
                className={`font-bold ${
                  new Date() > new Date(currentQR.expiresAt)
                    ? "text-red-600"
                    : new Date(currentQR.expiresAt).getTime() - Date.now() <
                      60000
                    ? "text-orange-600"
                    : "text-red-600"
                }`}
              >
                <span className="text-gray-400 font-medium">Expires:</span>{" "}
                {new Date(currentQR.expiresAt).toLocaleString("en-US")}
                {new Date() > new Date(currentQR.expiresAt) && " (EXPIRED)"}
                {new Date() <= new Date(currentQR.expiresAt) &&
                  new Date(currentQR.expiresAt).getTime() - Date.now() <
                    60000 &&
                  " (EXPIRING SOON)"}
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  console.log("🔙 Closing QR modal, keeping cache intact");
                  console.log("🔍 Current cache before close:", qrDataCache);
                  setShowQRModal(false);
                }}
                className="flex-1 bg-gray-500 text-white p-2 rounded-full shadow-2xl hover:bg-gray-600 cursor-pointer"
              >
                ❌ Close
              </button>
              <button
                onClick={() => {
                  endSession(currentQR.sessionId);
                  // endSession already has setShowQRModal(false) inside
                }}
                className="flex-1 bg-red-500 text-white p-2 rounded-full shadow-2xl hover:bg-red-700 cursor-pointer"
              >
                <span style={{boxShadow: "rgba(0, 0, 0, 0.25) 0px 14px 28px, rgba(0, 0, 0, 0.22) 0px 10px 10px", borderRadius:"50%"}}>🚫</span> Stop QR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Session Modal */}
      {isEditSessionModalOpen && (
        <div className="fixed inset-0 bg-gray-900/30 flex items-center justify-center z-50">
          <div className="bg-white shadow-2xl rounded-xl p-8 w-full max-w-md border-3 border-black"
          style={{backgroundImage: "linear-gradient(to top, rgb(222, 255, 221) 0%, rgb(255, 242, 242) 100%)"}}
          >
            <h3 className="text-2xl text-green-600 font-extrabold pb-3 mb-4 uppercase text-center border-b-2">✏️ Edit Session</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Session Name
                </label>
                <input
                  type="text"
                  value={editSessionTitle}
                  onChange={(e) => setEditSessionTitle(e.target.value)}
                  className="w-full border-2 border-gray-600 rounded-lg shadow-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-600"
                  placeholder="Enter session name..."
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={editSessionDate}
                  onChange={(e) => setEditSessionDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full border-2 border-gray-600 rounded-lg shadow-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-600"
                />
                <p className="text-xs text-gray-600 mt-2 font-medium">
                  ⚠️ Session time must be in the future
                </p>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setIsEditSessionModalOpen(false);
                  setEditingSession(null);
                  setEditSessionTitle("");
                  setEditSessionDate("");
                }}
                className="flex-1 bg-gray-500 font-bold text-white py-2 px-4 rounded-md hover:bg-gray-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={updateSession}
                className="flex-1 bg-green-600 font-bold text-white py-2 px-4 rounded-md hover:bg-orange-700 cursor-pointer"
                disabled={!editSessionTitle.trim()}
              >
                💾 Save
              </button>
            </div>
          </div>
        </div>
      )}

      

      {/* Statistics Modal */}
      {showStatsModal && (
        <div className="fixed inset-0 bg-gray-900/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl p-6 m-2 md:m-4 lg:m-0 w-full max-w-6xl max-h-[85vh] md:max-h-[90vh] overflow-y-auto animate__animated animate__bounceIn" >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">
                {statsView === "session"
                  ? "📊 Session Statistics"
                  : "📈 Class Statistics"}
              </h3>
              <button
                onClick={() => {
                  setShowStatsModal(false);
                  setSessionStats(null);
                  setClassStats(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-3xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Session Statistics View */}
            {statsView === "session" && sessionStats && (
              <div className="space-y-6">
                {/* Session Info */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-lg font-semibold text-blue-800 mb-2">
                    📝 Session Information
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Session</p>
                      <p className="font-medium">
                        {sessionStats.sessionInfo.title}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Class</p>
                      <p className="font-medium">
                        {sessionStats.sessionInfo.className}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Start Time</p>
                      <p className="font-medium">
                        {new Date(
                          sessionStats.sessionInfo.startTime
                        ).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <span
                        className={`px-2 py-1 rounded text-sm ${
                          sessionStats.sessionInfo.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {sessionStats.sessionInfo.isActive
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-blue-100 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {sessionStats.totalStudents}
                    </div>
                    <div className="text-sm text-blue-800">Total Students</div>
                  </div>
                  <div className="bg-green-100 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {sessionStats.presentStudents}
                    </div>
                    <div className="text-sm text-green-800">Present</div>
                  </div>
                  <div className="bg-yellow-100 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {sessionStats.lateStudents}
                    </div>
                    <div className="text-sm text-yellow-800">Late</div>
                  </div>
                  <div className="bg-red-100 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {sessionStats.absentStudents}
                    </div>
                    <div className="text-sm text-red-800">Absent</div>
                  </div>
                  <div className="bg-purple-100 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {sessionStats.attendanceRate}%
                    </div>
                    <div className="text-sm text-purple-800">
                      Attendance Rate
                    </div>
                  </div>
                </div>

                {/* Student Details Table */}
                <div className="bg-white border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b">
                    <h4 className="text-lg font-semibold text-gray-800">
                      👥 Student Details
                    </h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                            Student
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                            Email
                          </th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                            Status
                          </th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                            Check-in Time
                          </th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                            Minutes from Start
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {sessionStats.attendanceDetails.map(
                          (student: any, index: number) => (
                            <tr
                              key={student.studentId}
                              className={
                                index % 2 === 0 ? "bg-white" : "bg-gray-50"
                              }
                            >
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                {student.studentName}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {student.studentEmail}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span
                                  className={`px-2 py-1 rounded text-xs font-medium ${
                                    student.status === "PRESENT"
                                      ? "bg-green-100 text-green-800"
                                      : student.status === "LATE"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {student.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center text-sm text-gray-600">
                                {student.checkinTime
                                  ? new Date(
                                      student.checkinTime
                                    ).toLocaleTimeString()
                                  : "-"}
                              </td>
                              <td className="px-4 py-3 text-center text-sm text-gray-600">
                                {student.timeFromStart !== null
                                  ? `${student.timeFromStart} min`
                                  : "-"}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Class Statistics View */}
            {statsView === "class" && classStats && (
              <div className="space-y-6">
                {/* Class Info */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="text-lg font-semibold text-green-800 mb-2">
                    🎓 Class Overview
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Class Name</p>
                      <p className="font-medium">{classStats.classInfo.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Students</p>
                      <p className="font-medium">{classStats.totalStudents}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Sessions</p>
                      <p className="font-medium">{classStats.totalSessions}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">
                        Average Attendance
                      </p>
                      <p className="font-medium">
                        {classStats.averageAttendanceRate}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Student Performance Table */}
                <div className="bg-white border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b">
                    <h4 className="text-lg font-semibold text-gray-800">
                      📈 Student Performance
                    </h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                            Student
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                            Email
                          </th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                            Present
                          </th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                            Late
                          </th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                            Absent
                          </th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                            Rate
                          </th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                            Last Attendance
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {classStats.studentStats.map(
                          (student: any, index: number) => (
                            <tr
                              key={student.studentId}
                              className={
                                index % 2 === 0 ? "bg-white" : "bg-gray-50"
                              }
                            >
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                {student.studentName}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {student.studentEmail}
                              </td>
                              <td className="px-4 py-3 text-center text-sm text-green-600 font-medium">
                                {student.presentSessions}
                              </td>
                              <td className="px-4 py-3 text-center text-sm text-yellow-600 font-medium">
                                {student.lateSessions}
                              </td>
                              <td className="px-4 py-3 text-center text-sm text-red-600 font-medium">
                                {student.absentSessions}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span
                                  className={`px-2 py-1 rounded text-xs font-medium ${
                                    parseFloat(student.attendanceRate) >= 80
                                      ? "bg-green-100 text-green-800"
                                      : parseFloat(student.attendanceRate) >= 60
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {student.attendanceRate}%
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center text-sm text-gray-600">
                                {student.lastAttendance
                                  ? new Date(
                                      student.lastAttendance
                                    ).toLocaleDateString()
                                  : "Never"}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Session Performance Table */}
                <div className="bg-white border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b">
                    <h4 className="text-lg font-semibold text-gray-800">
                      📅 Session Performance
                    </h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                            Session
                          </th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                            Date
                          </th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                            Status
                          </th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                            Present
                          </th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                            Late
                          </th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                            Absent
                          </th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                            Rate
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {classStats.sessionStats.map(
                          (session: any, index: number) => (
                            <tr
                              key={session.sessionId}
                              className={
                                index % 2 === 0 ? "bg-white" : "bg-gray-50"
                              }
                            >
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                {session.sessionTitle}
                              </td>
                              <td className="px-4 py-3 text-center text-sm text-gray-600">
                                {new Date(
                                  session.startTime
                                ).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span
                                  className={`px-2 py-1 rounded text-xs font-medium ${
                                    session.isActive
                                      ? "bg-green-100 text-green-800"
                                      : "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  {session.isActive ? "Active" : "Inactive"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center text-sm text-green-600 font-medium">
                                {session.presentStudents}
                              </td>
                              <td className="px-4 py-3 text-center text-sm text-yellow-600 font-medium">
                                {session.lateStudents}
                              </td>
                              <td className="px-4 py-3 text-center text-sm text-red-600 font-medium">
                                {session.absentStudents}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span
                                  className={`px-2 py-1 rounded text-xs font-medium ${
                                    parseFloat(session.attendanceRate) >= 80
                                      ? "bg-green-100 text-green-800"
                                      : parseFloat(session.attendanceRate) >= 60
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {session.attendanceRate}%
                                </span>
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            
          </div>
        </div>
      )}
    </div>
  );
}
