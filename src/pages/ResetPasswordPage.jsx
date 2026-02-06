import React, { useState, useEffect } from "react";
import { Lock, Loader2, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { verifyResetToken, resetPassword } from "../services/authService";
import { useDeviceInfo } from "../hooks/useDeviceInfo";

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { device_id, device_type } = useDeviceInfo();

  const [token, setToken] = useState("");
  const [isVerifying, setIsVerifying] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [newPasswordError, setNewPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Extract token from URL and verify it
  useEffect(() => {
    const tokenFromUrl = searchParams.get("token");
    
    if (!tokenFromUrl) {
      setIsVerifying(false);
      setIsTokenValid(false);
      setTokenError("No reset token found in the URL. Please use the link from your email.");
      return;
    }

    setToken(tokenFromUrl);
    verifyToken(tokenFromUrl);
  }, [searchParams]);

  const verifyToken = async (tokenToVerify) => {
    setIsVerifying(true);
    try {
      const response = await verifyResetToken(tokenToVerify, device_id, device_type);
      
      if (response.status === 200 && response.data?.user_id) {
        setIsTokenValid(true);
        setTokenError("");
        toast.success("Token verified successfully. Please set your new password.", { duration: 4000 });
      } else {
        setIsTokenValid(false);
        setTokenError("Invalid or expired reset link. Please request a new password reset.");
        toast.error("Invalid or expired reset link", { duration: 4000 });
      }
    } catch (error) {
      setIsTokenValid(false);
      const errorMessage = error?.response?.data?.message || "Link expired or invalid. Please try again.";
      setTokenError(errorMessage);
      toast.error(errorMessage, { duration: 5000 });
    } finally {
      setIsVerifying(false);
    }
  };

  // Live validation for new password
  const handleNewPasswordChange = (value) => {
    setNewPassword(value);

    if (!value.trim()) {
      setNewPasswordError("Please enter your new password");
    } else if (value.length < 6) {
      setNewPasswordError("Password must be at least 6 characters");
    } else {
      setNewPasswordError("");
    }

    // Also validate confirm password if it has been touched
    if (confirmPassword) {
      if (value !== confirmPassword) {
        setConfirmPasswordError("Passwords do not match");
      } else {
        setConfirmPasswordError("");
      }
    }
  };

  // Live validation for confirm password
  const handleConfirmPasswordChange = (value) => {
    setConfirmPassword(value);

    if (!value.trim()) {
      setConfirmPasswordError("Please confirm your password");
    } else if (value !== newPassword) {
      setConfirmPasswordError("Passwords do not match");
    } else {
      setConfirmPasswordError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Final validation
    if (!newPassword || !confirmPassword) {
      if (!newPassword) {
        setNewPasswordError("Please enter your new password");
      }
      if (!confirmPassword) {
        setConfirmPasswordError("Please confirm your password");
      }
      toast.error("Please fill in all fields", { duration: 3000 });
      return;
    }

    if (newPasswordError || confirmPasswordError) {
      toast.error("Please fix the errors before submitting", { duration: 3000 });
      return;
    }

    if (newPassword !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match");
      toast.error("Passwords do not match", { duration: 3000 });
      return;
    }

    setIsResetting(true);

    try {
      const response = await resetPassword(token, newPassword, device_id, device_type);
      
      if (response.status === 200) {
        setResetSuccess(true);
        toast.success("Password reset successfully! Redirecting to login...", { duration: 4000 });
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate("/", { replace: true });
        }, 2000);
      } else {
        toast.error(response.message || "Failed to reset password. Please try again.", { duration: 4000 });
      }
    } catch (error) {
      const errorMessage = error?.response?.data?.message || "Failed to reset password. Please try again.";
      toast.error(errorMessage, { duration: 5000 });
    } finally {
      setIsResetting(false);
    }
  };

  const handleBackToLogin = () => {
    navigate("/", { replace: true });
  };

  // Show loading state while verifying token
  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100">
        <div className="w-full max-w-[450px] bg-white rounded-2xl shadow-xl p-8">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-800">Verifying Reset Link...</h2>
            <p className="text-gray-600 text-center">Please wait while we verify your password reset link.</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if token is invalid
  if (!isTokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100">
        <div className="w-full max-w-[450px] bg-white rounded-2xl shadow-xl">
          <div className="bg-red-600 p-8 text-center">
            <XCircle className="h-16 w-16 text-white mx-auto mb-3" />
            <h1 className="text-3xl font-bold text-white mb-3">Link Expired</h1>
            <p className="text-red-100 font-medium">Your password reset link has expired or is invalid</p>
          </div>

          <div className="p-8">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800 text-sm text-center">
                {tokenError || "The password reset link is no longer valid. Please request a new password reset."}
              </p>
            </div>

            <button
              onClick={handleBackToLogin}
              className="w-full py-3 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold transition-colors"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show success state after password reset
  if (resetSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100">
        <div className="w-full max-w-[450px] bg-white rounded-2xl shadow-xl">
          <div className="bg-green-600 p-8 text-center">
            <CheckCircle className="h-16 w-16 text-white mx-auto mb-3" />
            <h1 className="text-3xl font-bold text-white mb-3">Success!</h1>
            <p className="text-green-100 font-medium">Your password has been reset successfully</p>
          </div>

          <div className="p-8">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-green-800 text-sm text-center">
                Redirecting you to the login page...
              </p>
            </div>

            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show password reset form
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100">
      <div className="w-full max-w-[450px] bg-white rounded-2xl shadow-xl">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-center">
          <Lock className="h-12 w-12 text-white mx-auto mb-3" />
          <h1 className="text-3xl font-bold text-white mb-3">Reset Password</h1>
          <p className="text-blue-100 font-medium">Enter your new password below</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {/* New Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute top-3 left-3 h-5 w-5 text-gray-400" />
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => handleNewPasswordChange(e.target.value)}
                  placeholder="Enter new password"
                  className={`block w-full pl-10 pr-10 py-3 border rounded-lg
                    focus:outline-none focus:ring-2 bg-gray-50
                    ${
                      newPasswordError
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-200 focus:ring-blue-500"
                    }`}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors p-1 rounded hover:bg-gray-200"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  tabIndex={-1}
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {newPasswordError && (
                <p className="text-red-600 text-sm mt-1">{newPasswordError}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute top-3 left-3 h-5 w-5 text-gray-400" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                  placeholder="Confirm new password"
                  className={`block w-full pl-10 pr-10 py-3 border rounded-lg
                    focus:outline-none focus:ring-2 bg-gray-50
                    ${
                      confirmPasswordError
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-200 focus:ring-blue-500"
                    }`}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors p-1 rounded hover:bg-gray-200"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  tabIndex={-1}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {confirmPasswordError && (
                <p className="text-red-600 text-sm mt-1">{confirmPasswordError}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isResetting}
              className={`w-full flex justify-center items-center py-3 rounded-lg text-white gap-2 font-semibold
                ${
                  isResetting
                    ? "bg-blue-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                }`}
            >
              {isResetting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Resetting Password...
                </>
              ) : (
                <>
                  <Lock className="h-5 w-5" />
                  Reset Password
                </>
              )}
            </button>

            {/* Back to Login Link */}
            <div className="text-center">
              <button
                type="button"
                onClick={handleBackToLogin}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
              >
                Back to Login
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
