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
  const res = await api.post("/project/create", payload);
  return res.data;
};

/**
 * Fetch Projects List API
 * @param {number} logged_in_user_id - The logged-in user's ID for filtering projects
 * @returns {Promise} Project list response
 */
export const fetchProjectsList = async (logged_in_user_id) => {
  const res = await api.post("/project/list", { logged_in_user_id });
  return res.data;
};

/**
 * Update Project API
 * @param {number} projectId
 * @param {Object} payload
 */
export const updateProject = async (projectId, payload) => {
  const res = await api.put("/project/update", {
    project_id: projectId,
    ...payload
  });
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
