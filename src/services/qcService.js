/**
 * File Name: qcService.js
 * Author: Naitik Maisuriya
 * Description: API service for QC (Quality Control) operations
 */

import api from "./api";
import { log, logError } from "../config/environment";

/**
 * Save temporary QC data for a user
 * @param {Object} payload - Request payload containing user_id, date, and optional assigned_hours and qc_score
 * @returns {Promise} Response data
 */
export const saveTempQC = async (payload) => {
  try {
    log(`[QC Service] Saving temp QC for user ${payload.user_id} on ${payload.date}`);
    
    console.log('[QC Service] Request payload:', payload);
    
    const response = await api.post("/qc/temp-qc", payload);
    
    log(`[QC Service] Temp QC saved successfully:`, response.data);
    return response.data;
  } catch (error) {
    logError("[QC Service] Error saving temp QC:", error);
    console.error('[QC Service] Error details:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};
