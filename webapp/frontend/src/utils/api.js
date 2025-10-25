/**
 * API client for fetching GeoJSON data from backend
 */
import { BACKEND_URL } from '../config/constants';

const API_BASE_URL = import.meta.env.VITE_API_URL || BACKEND_URL;

/**
 * Fetch railway stations data
 * @param {string} dataset - 'default' or 'full'
 * @returns {Promise<object>} GeoJSON data
 */
export async function fetchStations(dataset = 'default') {
  try {
    const response = await fetch(`${API_BASE_URL}/api/stations?dataset=${dataset}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch stations: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching stations:', error);
    throw error;
  }
}

/**
 * Fetch India boundary data
 * @param {boolean} detailed - true for detailed boundary, false for simple
 * @returns {Promise<object>} GeoJSON data
 */
export async function fetchIndiaBoundary(detailed = true) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/india-boundary?detailed=${detailed}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch India boundary: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching India boundary:', error);
    throw error;
  }
}

/**
 * Fetch state boundaries data
 * @returns {Promise<object>} GeoJSON data
 */
export async function fetchStates() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/states`);
    if (!response.ok) {
      throw new Error(`Failed to fetch states: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching states:', error);
    throw error;
  }
}

/**
 * Fetch data info
 * @returns {Promise<object>} Data information
 */
export async function fetchDataInfo() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/data-info`);
    if (!response.ok) {
      throw new Error(`Failed to fetch data info: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching data info:', error);
    throw error;
  }
}

/**
 * Health check
 * @returns {Promise<object>} Health status
 */
export async function healthCheck() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error in health check:', error);
    throw error;
  }
}
