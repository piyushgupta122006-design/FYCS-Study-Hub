import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { useTheme } from "../context/ThemeContext";
import { Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";

export default function Login() {
  const { login, user } = useApp();
  const { isGlass } = useTheme();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const sendWelcomeEmail = async (userEmail, userName) => {
    const mailScriptUrl = import.meta.env.VITE_MAIL_SCRIPT_URL;
    if (!mailScriptUrl || mailScriptUrl === "YOUR_NEWLY_DEPLOYED_APPS_SCRIPT_URL") {
      console.warn("Mail script URL is not configured. Skipping welcome email.");
      return;
    }

    const welcomeTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          /* Mobile-first responsive rules */
          @media screen and (max-width: 480px) {
            .container { width: 100% !important; padding: 20px 12px !important; }
            .card { border-radius: 12px !important; }
            .header { padding: 20px 16px !important; }
            .body { padding: 20px 16px !important; }
            .footer { padding: 16px !important; }
            h1 { font-size: 18px !important; }
            p { font-size: 13px !important; }
            .cta-btn { display: block !important; max-width: 100% !important; margin: 0 auto !important; }
          }
        </style>
      </head>
      <body style="margin:0; padding:0; background-color:#0a0a0a; -webkit-font-smoothing:antialiased;">
        <div style="width:100%; table-layout:fixed; background-color:#0a0a0a;">
          <!-- Container with max-width for desktop, fluid for mobile -->
          <div class="container" style="max-width:480px; margin:0 auto; padding:32px 20px; font-family:'Segoe UI', Arial, sans-serif; box-sizing:border-box;">
            
            <!-- Card -->
            <div class="card" style="background:linear-gradient(180deg,#151515 0%,#0d0d0d 100%); border:1px solid rgba(255,215,0,0.25); border-radius:16px; overflow:hidden;">

              <!-- Header -->
              <div class="header" style="background:linear-gradient(135deg,#1a1a1a,#0a0a0a); padding:28px 24px; text-align:center; border-bottom:1px solid rgba(255,215,0,0.15);">
                <img src="https://fycs-study-hub.vercel.app/logo192.png" alt="BNN CS Study Hub" width="52" height="52" style="border-radius:12px; margin-bottom:12px;" />
                <div style="color:#FFD700; font-size:11px; letter-spacing:2px; text-transform:uppercase; font-weight:700;">BNN CS Study Hub</div>
              </div>

              <!-- Body -->
              <div class="body" style="padding:28px 24px;">
                <h1 style="color:#ffffff; font-size:20px; margin:0 0 14px 0; font-weight:700;">Welcome aboard, ${userName} 👋</h1>
                <p style="color:#d4d4d8; font-size:14px; line-height:1.6; margin:0 0 16px 0;">
                  Your account has been successfully created on the official study portal for BNN Computer Science students. You now have access to notes, practicals, previous year questions, and assignments.
                </p>
                <p style="color:#d4d4d8; font-size:14px; line-height:1.6; margin:0 0 24px 0;">
                  Everything is free, community-driven, and built specifically for our CS batch.
                </p>

                <!-- CTA button -->
                <div style="text-align:center; margin:24px 0;">
                  <a href="https://fycs-study-hub.vercel.app/" class="cta-btn" style="background-color:#FFD700; color:#0a0a0a; text-decoration:none; font-weight:700; font-size:14px; padding:14px 28px; border-radius:8px; display:inline-block;">
                    Go to Study Hub →
                  </a>
                </div>
              </div>

              <!-- Footer -->
              <div class="footer" style="padding:18px 24px; border-top:1px solid rgba(255,255,255,0.08); text-align:center;">
                <p style="color:#71717a; font-size:11px; margin:0 0 4px 0;">This is an automated message from BNN CS Study Hub.</p>
                <p style="color:#52525b; font-size:11px; margin:0;">Questions? Reach out at <a href="mailto:rishiuttamsahu@gmail.com" style="color:#a1a1aa;">rishiuttamsahu@gmail.com</a></p>
              </div>

            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const urls = mailScriptUrl.split(",").map(u => u.trim()).filter(Boolean);
    let success = false;

    for (const url of urls) {
      try {
        await fetch(url, {
          method: "POST",
          mode: "no-cors",
          body: JSON.stringify({
            email: userEmail,
            subject: "Welcome to BNN CS Study Hub 🎓",
            messageHtml: welcomeTemplate
          })
        });
        success = true;
        break;
      } catch (err) {
        console.warn("Mail script failed, trying next:", err);
      }
    }

    if (success) {
      console.log("Welcome email triggered successfully");
    } else {
      console.error("All welcome email mail script URLs failed.");
    }
  };

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      const result = await login();
      // If a redirect-based login was triggered, the page is about to
      // navigate away to Google — don't call navigate('/') here, it'll
      // just be discarded. The redirect result is handled on the next load.
      if (result?.redirecting) return;

      if (result?.user?.email) {
        await sendWelcomeEmail(result.user.email, result.user.displayName || "Student");
      }

      navigate('/');
    } catch (error) {
      // Always reset spinner — no matter what went wrong
      setIsLoading(false);

      // Firebase error codes for Google popup auth
      const code = error?.code || "";

      if (
        code === "auth/popup-closed-by-user" ||
        code === "auth/cancelled-popup-request"
      ) {
        // A genuine fast manual close (the AppContext login() function
        // already auto-retries via redirect for the "disguised storage
        // block" case, so anything that reaches here really was the user
        // backing out quickly). Silent, no toast needed.
        return;
      }

      if (code === "auth/popup-blocked") {
        toast.error("Popup blocked! Please allow popups for this site and try again.");
        return;
      }

      if (code === "auth/network-request-failed") {
        toast.error("No internet connection. Please check your network and try again.");
        return;
      }

      if (code === "auth/too-many-requests") {
        toast.error("Too many attempts. Please wait a moment and try again.");
        return;
      }

      // Generic fallback for anything unexpected
      console.error("Login error:", error);
      toast.error("Sign in failed. Please try again.");
    }
  };

  return (
    // Root container wahi hai jo aapne bheja tha (Scrolling 100% kaam karegi)
    <div className="bg-[#0a0a0a] min-h-screen text-white overflow-y-auto font-sans relative login-page">

      {/* 1. MAIN LOGIN SECTION */}
      {/* 🚨 FIX: flex-col aur justify-between lagaya hai, aur 100svh use kiya hai */}
      <div className="min-h-[100svh] w-full flex flex-col items-center justify-between p-4 relative overflow-hidden">

        {/* Animated Background Blobs */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}
        />
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-600/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-600/30 rounded-full blur-3xl animate-pulse" />

        {/* 🚨 FIX: Upar ek khali jagah (spacer) di hai taaki card exactly center me rahe */}
        <div className="w-full h-8 md:h-12 relative z-10"></div>

        {/* Glass Card Container */}
        <div className="relative z-10 max-w-md w-full">
          <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
            <div className="text-center">
              {/* Logo */}
              <div className="flex justify-center mb-8">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-600/30 to-blue-500/30 border border-white/20 flex items-center justify-center shadow-lg shadow-purple-500/20 backdrop-blur-sm">
                  <img
                    src={isGlass ? "/logo-b.png" : "/logo.png"}
                    alt="BNN CS Study Hub Logo"
                    width="64"
                    height="64"
                    className="w-16 h-16 object-contain drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                  />
                </div>
              </div>

              {/* Heading */}
              <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                BNN CS Study Hub
              </h1>

              {/* Subtext */}
              <p className="text-zinc-400 text-sm mb-10">
                Your central hub for BNN computer science students.
              </p>

              {/* Login Button */}
              <button
                type="button"
                onClick={handleLogin}
                disabled={isLoading}
                className={`w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold flex items-center justify-center gap-3 transition-all duration-300 ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:scale-105 hover:shadow-lg'}`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M21.35 11.1h-9.17v2.73h6.51c-.33 1.76-1.77 3.12-3.77 3.12-2.29 0-4.14-1.86-4.14-4.15s1.85-4.15 4.14-4.15c1.11 0 2.08.41 2.81 1.19l2.06-2.06c-1.27-1.19-2.88-1.92-4.87-1.92-4.02 0-7.29 3.27-7.29 7.29s3.27 7.29 7.29 7.29c3.68 0 6.74-2.69 6.74-7.29 0-.58-.1-1.14-.2-1.67z" />
                    </svg>
                    Sign in with Google
                  </>
                )}
              </button>

              {/* PUBLIC LINKS */}
              <div className="mt-8 pt-6 border-t border-white/10 flex flex-col items-center gap-2 text-xs text-zinc-500">
                <p>By signing in, you agree to our policies.</p>
                <div className="flex gap-4">
                  <a href="/privacy.html" className="hover:text-blue-400 transition-colors">Privacy Policy</a>
                  <span className="text-zinc-700">•</span>
                  <a href="/terms.html" className="hover:text-blue-400 transition-colors">Terms of Service</a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 🚨 FIX: Absolute hata diya hai. Ab ye natural flow mein hamesha bottom par rahega */}
        {/* Scroll Indicator */}
        <div className="flex flex-col items-center animate-bounce text-zinc-500 z-10 mb-2 md:mb-6 mt-4">
          <span className="text-xs mb-2">Read More</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
        </div>
      </div>

      {/* 2. SEO CONTENT SECTION */}
      {/* THE MAGIC FIX: pt-16 mt-12 md:mt-0 */}
      <div className="max-w-4xl mx-auto px-6 py-24 text-zinc-400 border-t border-white/5 relative z-20 bg-[#0a0a0a] mt-24 md:mt-0">
        <h2 className="text-2xl font-bold text-white mb-6">Welcome to BNN CS Study Hub</h2>

        <div className="grid md:grid-cols-2 gap-8 text-sm leading-relaxed">
          <div>
            <p className="mb-4">
              BNN CS Study Hub is premier digital academic library and collaborative platform designed exclusively for First Year and Second Year Computer Science (FYCS & SYCS) students. Our primary mission is to simplify the educational journey by providing a secure, centralized, and easy-to-navigate environment for managing academic resources.
            </p>
            <p>
              Whether you are preparing for your upcoming semester examinations or working on complex assignments, our platform offers structured access to high-quality study materials, comprehensive notes, previous year question papers, and practical reference files. Everything is organized meticulously by semester and subject to save your valuable time.
            </p>
          </div>
          <div>
            <p className="mb-4">
              We understand the importance of peer-to-peer learning in computer science. Therefore, BNN CS Study Hub leverages the power of Google Drive API to allow students to seamlessly upload and share their personal notes and educational materials with classmates, fostering a strong academic community.
            </p>
            <p>
              Security and privacy are at the core of our application. By utilizing secure Google Authentication, we ensure that only verified students can access the study vault. We do not store your personal files on our servers; instead, we efficiently manage public access links, maintaining absolute transparency and data safety. Join the hub today and elevate your academic performance!
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}