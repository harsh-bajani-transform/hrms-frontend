// src/services/projectService.js
import api from "./api";

/**
 * Create Task API
 * @param {Object|FormData} payload
 */
export const addTask = async (payload) => {
  // If payload is FormData, set Content-Type to undefined to let browser set boundary
  const headers = payload instanceof FormData ? { 'Content-Type': undefined } : {};
  const res = await api.post("/task/add", payload, { headers });
  return res.data;
};

/**
 * Fetch project tasks API
 * @param {number} projectId
 * @param {number} userId - Logged in user ID
 * @param {string} deviceId - Device ID
 * @param {string} deviceType - Device type (e.g., LAPTOP)
 */
export const fetchProjectTasks = async (projectId, userId, deviceId, deviceType) => {
  const payload = {
    project_id: projectId
  };
  
  // Add optional user and device info if provided
  if (userId) payload.user_id = userId;
  if (deviceId) payload.device_id = deviceId;
  if (deviceType) payload.device_type = deviceType;
  
  const res = await api.post("/task/list", payload);
  return res.data;
};

/**
 * Update task API
 * @param {Object|FormData} payload
 */
export const updateTask = async (payload) => {
  // If payload is FormData, set Content-Type to undefined to let browser set boundary
  const headers = payload instanceof FormData ? { 'Content-Type': undefined } : {};
  const res = await api.post("/task/update", payload, { headers });
  return res.data;
};

/**
 * Delete task API
 * @param {Object} payload
 */
export const deleteTask = async (payload) => {
  const res = await api.put("/task/delete", payload);
  return res.data;
};

/**
 * Create Project API
 * @param {Object} payload
 */
export const createProject = async (payload) => {
  // If payload is FormData, set Content-Type to undefined to let browser set boundary
  const headers = payload instanceof FormData ? { 'Content-Type': undefined } : {};
  const res = await api.post("/project/create", payload, { headers });
  return res.data;
};

/**
 * Fetch Projects List API
 * @param {number} logged_in_user_id - The logged-in user's ID for filtering projects
 * @returns {Promise} Project list response
 */
export const fetchProjectsList = async (logged_in_user_id) => {
  console.log('[projectService] Fetching projects for user:', logged_in_user_id);
  const res = await api.post("/project/list", { logged_in_user_id });
  console.log('[projectService] Projects API response:', res);
  console.log('[projectService] Projects data:', res.data);
  return res.data;
};

/**
 * Update Project API
 * @param {number} projectId
 * @param {Object} payload
 */
export const updateProject = async (projectId, payload) => {
  // If payload is FormData, set Content-Type to undefined to let browser set boundary
  const headers = payload instanceof FormData ? { 'Content-Type': undefined } : {};
  
  // For FormData, append project_id instead of spreading
  if (payload instanceof FormData) {
    payload.append('project_id', projectId);
    const res = await api.post("/project/update", payload, { headers });
    return res.data;
  }
  
  // For regular objects, use the original logic
  const res = await api.post("/project/update", {
    project_id: projectId,
    ...payload
  }, { headers });
  return res.data;
};

/**
 * Delete Project API
 * @param {number} projectId
 */
export const deleteProject = async (projectId) => {
  const res = await api.post("/project/delete", {
    project_id: projectId
  });
  return res.data;
};
