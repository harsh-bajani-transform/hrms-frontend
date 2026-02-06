// src/services/projectService.js
import api from "./api";

/**
 * Create Task API
 * @param {Object} payload
 */
export const addTask = async (payload) => {
  const res = await api.post("/task/add", payload);
  return res.data;
};

/**
 * Fetch project tasks API
 * @param {number} projectId
 */
export const fetchProjectTasks = async (projectId) => {
  const res = await api.post("/task/list", { project_id: projectId });
  return res.data;
};

/**
 * Update task API
 * @param {Object} payload
 */
export const updateTask = async (payload) => {
  const res = await api.put("/task/update", payload);
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
  const res = await api.put("/project/delete", {
    project_id: projectId
  });
  return res.data;
};
