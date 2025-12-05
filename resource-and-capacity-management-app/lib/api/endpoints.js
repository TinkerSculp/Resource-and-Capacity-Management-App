/**
 * API endpoint constants
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const ENDPOINTS = {
  // Health check
  HEALTH: `${API_BASE_URL}/health`,
  
  // Resources
  RESOURCES: `${API_BASE_URL}/resources`,
  RESOURCE_BY_ID: (id) => `${API_BASE_URL}/resources/${id}`,
  
  // Activities
  ACTIVITIES: `${API_BASE_URL}/activities`,
  ACTIVITY_BY_ID: (id) => `${API_BASE_URL}/activities/${id}`,
  
  // Users
  USERS: `${API_BASE_URL}/users`,
  USER_BY_ID: (id) => `${API_BASE_URL}/users/${id}`,
  
  // Availability
  AVAILABILITY: `${API_BASE_URL}/availability`,
  AVAILABILITY_BY_EMPLOYEE: (employeeID) => `${API_BASE_URL}/availability/${employeeID}`,
  
  // Capacity
  CAPACITY: `${API_BASE_URL}/capacity`,
  
  // Allocations
  ALLOCATIONS: `${API_BASE_URL}/allocations`,
  ALLOCATION_BY_ID: (id) => `${API_BASE_URL}/allocations/${id}`,
  
  // Reports
  REPORTS: `${API_BASE_URL}/reports`,
  REPORT_BY_ID: (id) => `${API_BASE_URL}/reports/${id}`,
  
  // Lookups
  LOOKUPS: `${API_BASE_URL}/lookups`,
  LOOKUPS_BY_TYPE: (type) => `${API_BASE_URL}/lookups/${type}`,
  
  // Auth
  LOGIN: `${API_BASE_URL}/auth/login`,
  LOGOUT: `${API_BASE_URL}/auth/logout`,
  VERIFY: `${API_BASE_URL}/auth/verify`
};

module.exports = ENDPOINTS;
