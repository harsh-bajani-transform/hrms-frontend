import api from "./api";
import { log, logError } from "../config/environment";

export const loginUser = async (username, password, deviceId, deviceType) => {
  try {
    const payload = {
      user_email: username,
      user_password: password,
      device_id: deviceId,
      device_type: deviceType
    };
    log('[authService] Attempting login for:', username);
    
    const response = await api.post("/auth/user", payload);
    log('[authService] Login successful');
    return response;
  } catch (error) {
    logError('[authService] Login failed:', error.response?.data || error.message);
    // Re-throw the original error to preserve response structure
    throw error;
  }
};

// Forgot Password - Send reset link to email
export const forgotPassword = async (email, deviceId, deviceType) => {
  try {
    const payload = {
      user_email: email,
      device_id: deviceId,
      device_type: deviceType
    };
    log('[authService] Requesting password reset for:', email);
    
    const response = await api.post("/password_reset/forgot-password", payload);
    log('[authService] Password reset request sent');
    return response.data;
  } catch (error) {
    logError('[authService] Forgot password failed:', error.response?.data || error.message);
    throw error;
  }
};

// Verify Reset Token
export const verifyResetToken = async (token, deviceId, deviceType) => {
  try {
    const payload = {
      token: token,
      device_id: deviceId,
      device_type: deviceType
    };
    log('[authService] Verifying reset token');
    
    const response = await api.post("/password_reset/verify-reset-token", payload);
    log('[authService] Token verified successfully');
    return response.data;
  } catch (error) {
    logError('[authService] Token verification failed:', error.response?.data || error.message);
    throw error;
  }
};

// Reset Password
export const resetPassword = async (token, newPassword, deviceId, deviceType) => {
  try {
    const payload = {
      token: token,
      device_id: deviceId,
      device_type: deviceType,
      new_password: newPassword
    };
    log('[authService] Resetting password');
    
    const response = await api.post("/password_reset/reset-password", payload);
    log('[authService] Password reset successful');
    return response.data;
  } catch (error) {
    logError('[authService] Password reset failed:', error.response?.data || error.message);
    throw error;
  }
};

// Add this function for creating a new user
export const addUser = async (userData) => {
  try {
    log('[authService] Creating new user');
    // When sending FormData, let the browser set the Content-Type header with boundary
    const response = await api.post("/auth/user", userData, {
      headers: {
        'Content-Type': undefined // This allows browser to set multipart/form-data with boundary
      }
    });
    log('[authService] User created successfully');
    return response.data;
  } catch (error) {
    logError('[authService] Failed to create user:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to create user');
  }
};

export const fetchUsersByRole = async (role) => {
  try {
    log('[authService] Fetching users by role:', role);
    const response = await api.post("/user/list", { role });
    return response.data;
  } catch (error) {
    logError('[authService] Failed to fetch users by role:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to fetch users');
  }
};

// Fetch all users without role filter (for Manage → Users)
export const fetchUsersList = async (userId, deviceId, deviceType) => {
  try {
    log('[authService] Fetching users list');
    const payload = {
      user_id: userId,
      device_id: deviceId,
      device_type: deviceType
    };
    const response = await api.post("/user/list", payload);
    log('[authService] Users list fetched successfully');
    return response.data;
  } catch (error) {
    logError('[authService] Failed to fetch users list:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to fetch users');
  }
};

export const updateUser = async (userData) => {
  try {
    // Check if userData is FormData
    if (userData instanceof FormData) {
      log('[authService] Sending FormData for user update');
      const userId = userData.get('user_id');
      log('[authService] Updating user (FormData):', userId);
      
      // Log all FormData entries for debugging
      for (let pair of userData.entries()) {
        log(`[authService] FormData entry: ${pair[0]} = ${pair[1]}`);
      }
      
      // api.js interceptor will handle removing Content-Type for FormData
      const response = await api.post('/user/update_user', userData);
      log('[authService] User updated successfully');
      return response.data;
    }
    
    // Regular JSON payload
    log('[authService] Updating user:', userData.user_id);
    const response = await api.post('/user/update_user', userData);
    log('[authService] User updated successfully');
    return response.data;
  } catch (error) {
    logError('[authService] Failed to update user:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to update user');
  }
};

export const deleteUser = async (user_id, audit = {}) => {
  try {
    log('[authService] Deleting user:', user_id);
    const payload = { user_id, ...audit };
    const response = await api.put("/user/delete_user", payload);
    log('[authService] User deleted successfully');
    return response;
  } catch (error) {
    logError('[authService] Failed to delete user:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to delete user');
  }
};

