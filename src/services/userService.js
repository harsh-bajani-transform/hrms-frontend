import api from "./api";
import { log, logError } from "../config/environment";

// Fetch user by ID (from user/list)
export async function fetchUserById(userId, deviceId, deviceType) {
  try {
    log('[userService] Fetching user by ID:', userId);
    
    // Fallback to sessionStorage for device_id/device_type if not provided
    let _deviceId = deviceId;
    let _deviceType = deviceType;
    if (!_deviceId || !_deviceType) {
      const user = JSON.parse(sessionStorage.getItem("user") || "{}");
      _deviceId = _deviceId || user.device_id || "web";
      _deviceType = _deviceType || user.device_type || "Laptop";
    }
    
    // Get the current logged-in user's ID from sessionStorage
    const currentUser = JSON.parse(sessionStorage.getItem("user") || "{}");
    const currentUserId = currentUser.user_id || currentUser.id;
    
    const res = await api.post("user/list", {
      user_id: String(currentUserId), // Send current user's ID, not the target user's ID
      device_id: _deviceId,
      device_type: _deviceType
    });
    
    if (res.data && res.status === 200) {
      const users = res.data.data || res.data || [];
      const user = users.find(u => String(u.user_id) === String(userId));
      if (user) {
        log('[userService] User found:', user.user_name);
        return user;
      }
    }
    
    logError('[userService] User not found with ID:', userId);
    throw new Error("User not found");
  } catch (error) {
    logError('[userService] Failed to fetch user by ID:', error.message);
    throw new Error(error.response?.data?.message || 'Failed to fetch user details');
  }
}

// Update user (POST with FormData support)
export async function updateUser(payload) {
  try {
    log('[userService] Updating user:', payload.user_id || payload.get?.('user_id'));
    
    // Check if payload is FormData
    if (payload instanceof FormData) {
      log('[userService] Sending FormData for user update');
      const res = await api.post("user/update_user", payload, {
        headers: {
          'Content-Type': undefined // Let browser set multipart/form-data with boundary
        }
      });
      log('[userService] User updated successfully');
      log('[userService] Backend response:', res.data);
      return res.data;
    }
    
    // Regular JSON payload
    log('[userService] Full payload being sent:', JSON.stringify(payload, null, 2));
    log('[userService] Designation ID in payload:', payload.designation_id);
    log('[userService] Payload keys:', Object.keys(payload));
    
    const res = await api.post("user/update_user", payload);
    
    log('[userService] User updated successfully');
    log('[userService] Backend response:', res.data);
    return res.data;
  } catch (error) {
    logError('[userService] Failed to update user:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to update user');
  }
}

// Get dropdowns for user roles (and optionally others)
export async function getUserDropdowns() {
  try {
    log('[userService] Fetching user dropdowns');
    const rolesRes = await api.post("dropdown/get", { dropdown_type: "user roles" });
    
    log('[userService] Dropdowns fetched successfully');
    return {
      roles: (rolesRes.data && rolesRes.data.data) || [],
      designations: [],
      projectManagers: [],
      assistantManagers: [],
      qas: [],
      teams: []
    };
  } catch (error) {
    logError('[userService] Failed to fetch dropdowns:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to fetch dropdowns');
  }
}
