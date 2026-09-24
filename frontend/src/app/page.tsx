/**
 * Main Page - Student Management System
 * DBUG TEAM
 */

"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/config/api";

const DEMO_ACCOUNTS = [
  {
    role: "Teacher",
    name: "TRAN QUANG DUNG",
    email: "tqd0105@gmail.com",
    password: "Dungabc123@",
    icon: "/icons/teacher.png",
    color: "bg-gradient-to-r from-amber-500 to-orange-500",
    hoverColor: "hover:from-amber-600 hover:to-orange-600",
  },
  {
    role: "Student",
    name: "DUNG TRAN QUANG",
    email: "dtq287@gmail.com",
    password: "Dungabc123@",
    icon: "/icons/student.png",
    color: "bg-gradient-to-r from-blue-500 to-cyan-500",
    hoverColor: "hover:from-blue-600 hover:to-cyan-600",
  },
  {
    role: "Student",
    name: "DTECH",
    email: "tranquangdung.tech@gmail.com",
    password: "Dungabc123@",
    icon: "/icons/student.png",
    color: "bg-gradient-to-r from-purple-500 to-indigo-500",
    hoverColor: "hover:from-purple-600 hover:to-indigo-600",
  },
];

export default function HomePage() {
  const { user, isAuthenticated, isAdmin, login, loading } = useAuth();
  const router = useRouter();
  const [showDemo, setShowDemo] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      // Admin redirect to admin panel
      if (isAdmin) {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    }
  }, [isAuthenticated, user, isAdmin, router]);

  // Check for error from Google OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err === "google_denied") setError("Bạn đã huỷ đăng nhập Google.");
    else if (err === "oauth_failed") setError("Đăng nhập Google thất bại. Thử lại.");
  }, []);

  const handleGoogleLogin = () => {
    const returnUrl = encodeURIComponent(window.location.origin);
    window.location.href = `${API_BASE_URL}/api/auth/google?redirect_to=${returnUrl}`;
  };

  const handleDemoLogin = async (email: string, password: string) => {
    setDemoLoading(true);
    setShowDemo(false);
    setError(null);
    try {
      await login(email, password);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Demo login failed");
    } finally {
      setDemoLoading(false);
    }
  };

  if (isAuthenticated && user) {
    return (
      <div className="min-h-inherit bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <div
        className="min-h-dvh grid  lg:grid-cols-2 gap-0 md:gap-3 lg:gap-0 sm:px-6 lg:px-8 overflow-hidden"
        style={{
          backgroundImage: "linear-gradient(-225deg, #D4FFEC 0%, #57F2CC 48%, #4596FB 100%)",
        }}
      >
        {/* Header */}
        <div className="sm:mx-auto mx-4 md:mx-0 sm:w-full flex flex-col sm:flex-row lg:flex-col items-center sm:items-end lg:items-center justify-center gap-4 lg:border-r-3 lg:border-white pt-4 sm:pt-0 lg:pt-4">
          <div className="flex flex-col items-center px-4 sm:px-6 py-4 sm:mb-3 lg:m-0 m-2 rounded-xl w-full max-w-sm sm:max-w-md lg:max-w-lg"
            style={{ backgroundImage: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)", boxShadow: "rgba(0, 0, 0, 0.19) 0px 10px 20px, rgba(0, 0, 0, 0.23) 0px 6px 6px" }}
          >
            <div className="flex items-center justify-center  w-full">
              <div className="text-gray-600 flex-shrink-0">
                <img
                  src="/images/logo.png"
                  width="100"
                  height="100"
                  className="rounded-full w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32"
                  alt=""
                />
              </div>

              <div className="text-center flex-1 min-w-0">
                <h1 className="text-xl sm:text-xl lg:text-2xl xl:text-3xl font-bold text-red-600 mb-1 sm:mb-2 break-words leading-tight">
                  LIGHTBRAVE.EDU
                </h1>
                <div className="inline-flex items-center px-2 sm:px-3 lg:px-4 py-1 sm:py-2 bg-blue-100 text-black font-bold rounded-full shadow-xl text-xs"
                  style={{ backgroundImage: "linear-gradient(180deg, rgb(255, 255, 255) 0%, rgb(222, 222, 222) 100%)" }}
                >
                  <svg
                    className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  <span className="text-xs sm:text-xs whitespace-nowrap">Powered by LightBrave Team</span>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full max-w-xs sm:max-w-sm lg:max-w-lg  lg:block hidden">
            <img
              src="/images/Banner-lightbrave.png"
              alt="Banner"
              className="w-full h-auto mx-auto mt-2 sm:mt-4 rounded-2xl shadow-2xl  "
            />
          </div>
        </div>

        {/* Login/Register Form */}
        <div className="flex flex-col items-center justify-start lg:justify-center  gap-4 ">
          <div className="mt-2 sm:mx-auto  sm:max-w-lg w-full">

            {/* Google Sign-In Card */}
            <div className="py-8 px-6 shadow-2xl rounded-lg sm:px-10 mx-4 lg:mx-0" style={{backgroundImage: "linear-gradient(to top, rgb(244, 233, 255) 0%, rgb(255, 255, 255) 99%) "}}>
              <div className="pb-5 text-center">
                <h2 className="text-2xl font-extrabold text-gray-900">SIGN IN</h2>
                <span className="text-sm text-gray-600">Use your Google account to continue</span>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 text-center">
                  {error}
                </div>
              )}

              {/* Google Button */}
              <button
                id="google-signin-btn"
                onClick={handleGoogleLogin}
                disabled={loading || demoLoading}
                className="w-full flex items-center justify-center gap-3 py-3 px-5 rounded-full border-2 border-gray-200 bg-white shadow-md hover:shadow-lg hover:border-blue-300 transition-all duration-200 font-semibold text-gray-700 text-base cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group mb-4"
              >
                <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  <path fill="none" d="M0 0h48v48H0z"/>
                </svg>
                <span className="group-hover:text-blue-600 transition-colors">
                  {loading || demoLoading ? "Đang xử lý..." : "Tiếp tục với Google"}
                </span>
              </button>

              {/* Demo Accounts Button */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowDemo(true)}
                  disabled={loading || demoLoading}
                  className="flex items-center justify-center gap-2 cursor-pointer w-full py-2 px-4 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 shadow-lg transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-60"
                >
                  <img src="/icons/boy.png" width={25} alt="" />
                  Use Demo Accounts
                </button>
              </div>
            </div>

          </div>

          {/* Features */}
          <div className=" sm:mx-auto sm:w-full sm:max-w-xl px-4 pb-4 sm:pb-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 justify-center items-center max-w-sm sm:max-w-none mx-auto">
              <div className="text-center p-4 bg-white rounded-xl shadow-2xl w-full" style={{ backgroundImage: "linear-gradient(to top, rgb(255, 247, 247) 0%, rgb(218, 255, 217) 99%)" }}>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-2" >
                  <>
                    <>
                      {/*?xml version="1.0" encoding="utf-8"?*/}
                      {/* Uploaded to: SVG Repo, www.svgrepo.com, Generator: SVG Repo Mixer Tools */}
                      <svg
                        fill="#000000"
                        width="100px"
                        height="100px"
                        viewBox="0 0 24 24"
                        id="qr-code-scan-2"
                        data-name="Flat Color"
                        xmlns="http://www.w3.org/2000/svg"
                        className="icon flat-color"
                      >
                        <path
                          id="secondary"
                          d="M10,15v2a1,1,0,0,1-1,1H7a1,1,0,0,1-1-1V15a1,1,0,0,1,1-1H9A1,1,0,0,1,10,15Zm7-9H15a1,1,0,0,0-1,1V9a1,1,0,0,0,1,1h2a1,1,0,0,0,1-1V7A1,1,0,0,0,17,6Zm0,6H13a1,1,0,0,0-1,1v4a1,1,0,0,0,1,1h4a1,1,0,0,0,1-1V13A1,1,0,0,0,17,12ZM12,7a1,1,0,0,0-1-1H7A1,1,0,0,0,6,7v4a1,1,0,0,0,1,1h4a1,1,0,0,0,1-1Z"
                          style={{ fill: "rgb(44, 169, 188)" }}
                        />
                        <path
                          id="primary"
                          d="M3,9A1,1,0,0,1,2,8V4A2,2,0,0,1,4,2H8A1,1,0,0,1,8,4H4V8A1,1,0,0,1,3,9ZM22,8V4a2,2,0,0,0-2-2H16a1,1,0,0,0,0,2h4V8a1,1,0,0,0,2,0ZM9,21a1,1,0,0,0-1-1H4V16a1,1,0,0,0-2,0v4a2,2,0,0,0,2,2H8A1,1,0,0,0,9,21Zm13-1V16a1,1,0,0,0-2,0v4H16a1,1,0,0,0,0,2h4A2,2,0,0,0,22,20Z"
                          style={{ fill: "rgb(0, 0, 0)" }}
                        />
                      </svg>
                    </>
                  </>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  QR Attendance
                </h3>
                <p className="text-sm text-gray-600">
                  Quick and accurate attendance tracking using QR codes
                </p>
              </div>
              <div className="text-center p-4 bg-white rounded-xl shadow-2xl w-full" style={{ backgroundImage: "linear-gradient(to top, rgb(252, 234, 239) 0%, rgb(255, 254, 185) 99%)" }}>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <>
                    {/*?xml version="1.0" encoding="utf-8"?*/}
                    {/* Uploaded to: SVG Repo, www.svgrepo.com, Generator: SVG Repo Mixer Tools */}
                    <svg
                      fill="#000000"
                      width="100px"
                      height="100px"
                      viewBox="0 0 24 24"
                      id="sticky-notes-7"
                      data-name="Flat Line"
                      xmlns="http://www.w3.org/2000/svg"
                      className="icon flat-line"
                    >
                      <path
                        id="secondary"
                        d="M15,6H4A1,1,0,0,0,3,7v9a1,1,0,0,0,1,1H16a1,1,0,0,0,1-1V8A2,2,0,0,0,15,6Z"
                        style={{ fill: "rgb(44, 169, 188)", strokeWidth: 2 }}
                      />
                      <path
                        id="primary"
                        d="M17,7v9a1,1,0,0,1-1,1H4a1,1,0,0,1-1-1V7A1,1,0,0,1,4,6H16"
                        style={{
                          fill: "none",
                          stroke: "rgb(0, 0, 0)",
                          strokeLinecap: "round",
                          strokeLinejoin: "round",
                          strokeWidth: 2,
                        }}
                      />
                      <path
                        id="primary-2"
                        data-name="primary"
                        d="M5,21H17a4,4,0,0,0,4-4V10"
                        style={{
                          fill: "none",
                          stroke: "rgb(0, 0, 0)",
                          strokeLinecap: "round",
                          strokeLinejoin: "round",
                          strokeWidth: 2,
                        }}
                      />
                      <path
                        id="primary-3"
                        data-name="primary"
                        d="M20,5a2,2,0,0,0-2-2h0a2,2,0,0,0-2,2h0a2,2,0,0,0,2,2h0a2,2,0,0,0,2-2ZM16.59,6.41,14,9"
                        style={{
                          fill: "none",
                          stroke: "rgb(0, 0, 0)",
                          strokeLinecap: "round",
                          strokeLinejoin: "round",
                          strokeWidth: 2,
                        }}
                      />
                    </svg>
                  </>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Class Management
                </h3>
                <p className="text-sm text-gray-500">
                  Management of classes, students, and attendance.              </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Accounts Modal */}
      {showDemo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDemo(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-violet-500 to-fuchsia-500">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <img src="/icons/boy.png" width={40} alt="" />
                DEMO ACCOUNTS
              </h2>
              <button
                onClick={() => setShowDemo(false)}
                className="p-1 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
              >
                <img src="/icons/close.png" width={30} alt="" />
              </button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto max-h-[60vh]">
              <p className="text-sm text-gray-600 text-center mb-4">
                Select an account to login instantly
              </p>
              {DEMO_ACCOUNTS.map((account, index) => (
                <button
                  key={index}
                  onClick={() => handleDemoLogin(account.email, account.password)}
                  disabled={demoLoading}
                  className={`w-full p-4 rounded-xl cursor-pointer ${account.color} ${account.hoverColor} text-white shadow-lg transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-white/30 rounded-full w-12 h-12 flex items-center justify-center">
                      <img src={account.icon} width={24} height={24} alt={account.role} className="w-6 h-6 object-contain" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-bold text-sm">{account.role}</div>
                      <div className="text-white/90 text-xs">{account.name}</div>
                      <div className="text-white/70 text-xs w-40 truncate">{account.email}</div>
                    </div>
                    <div className="text-gray-100 text-sm font-semibold flex flex-col items-center gap-1">
                      Login <img src="./icons/next.png" width={35} alt="" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
