/**
 * Main Page - Student Management System
 * DBUG TEAM
 */

"use client";

import { useAuth } from "@/contexts/AuthContext";
import LoginForm from "@/components/auth/LoginForm";
import RegisterForm from "@/components/auth/RegisterForm";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function HomePage() {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const router = useRouter();
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

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

  if (isAuthenticated && user) {
    return (
      <div className="min-h-inherit bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div
      className="min-h-dvh grid  lg:grid-cols-2 gap-0 md:gap-3 lg:gap-0 sm:px-6 lg:px-8 overflow-hidden"
      style={{
        backgroundImage: "linear-gradient(-225deg, #D4FFEC 0%, #57F2CC 48%, #4596FB 100%)",
      }}
    >
      {/* Header */}
      <div className="sm:mx-auto mx-4 md:mx-0 sm:w-full flex flex-col sm:flex-row lg:flex-col items-center sm:items-end lg:items-center justify-center gap-4 lg:border-r-3 lg:border-white pt-4 sm:pt-0 lg:pt-4"> 
        <div className="flex flex-col items-center px-4 sm:px-6 py-4 sm:mb-3 lg:m-0 m-2 rounded-xl w-full max-w-sm sm:max-w-md lg:max-w-lg"
        style={{backgroundImage: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)", boxShadow: "rgba(0, 0, 0, 0.19) 0px 10px 20px, rgba(0, 0, 0, 0.23) 0px 6px 6px"}}
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
                style={{backgroundImage: "linear-gradient(180deg, rgb(255, 255, 255) 0%, rgb(222, 222, 222) 100%)"}}
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
          {authMode === "login" ? (
            <LoginForm onSwitchToRegister={() => setAuthMode("register")} />
          ) : (
            <RegisterForm onSwitchToLogin={() => setAuthMode("login")} />
          )}
        </div>

        {/* Features */}
        <div className=" sm:mx-auto sm:w-full sm:max-w-xl px-4 pb-4 sm:pb-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 justify-center items-center max-w-sm sm:max-w-none mx-auto">
            <div className="text-center p-4 bg-white rounded-xl shadow-2xl w-full" style={{backgroundImage: "linear-gradient(to top, rgb(255, 247, 247) 0%, rgb(218, 255, 217) 99%)"}}> 
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
            <div className="text-center p-4 bg-white rounded-xl shadow-2xl w-full" style={{backgroundImage: "linear-gradient(to top, rgb(252, 234, 239) 0%, rgb(255, 254, 185) 99%)"}}>
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
            {/* <div className="text-center p-6 bg-white rounded-lg shadow">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Real-time Reports
            </h3>
            <p className="text-sm text-gray-500">
              Live attendance tracking and comprehensive reporting dashboard
            </p>
          </div> */}
          </div>
        </div>

        {/* Footer */}
        {/* <div className="mt-12 text-center text-sm text-white">
        <p>© 2025 LightBrave Team - An programming team from UTH</p>
        <p className="mt-1">Dedicated technology solutions from passion</p>
      </div> */}
      </div>
    </div>
  );
}
