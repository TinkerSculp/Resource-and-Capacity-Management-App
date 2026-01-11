/**
 * API endpoint constants
 * Centralizes all backend API routes in one place for consistency and maintainability.
 */

// Base URL for all API requests (supports environment override)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Object containing all endpoint paths used throughout the app
const ENDPOINTS = {
  // Health check endpoint
  HEALTH: `${API_BASE_URL}/health`,
  
  // Resource endpoints
  RESOURCES: `${API_BASE_URL}/resources`,                 // Get all resources
  RESOURCE_BY_ID: (id) => `${API_BASE_URL}/resources/${id}`, // Get a specific resource
  
  // Activity endpoints
  ACTIVITIES: `${API_BASE_URL}/activities`,               // Get all activities
  ACTIVITY_BY_ID: (id) => `${API_BASE_URL}/activities/${id}`, // Get a specific activity
  
  // User endpoints
  USERS: `${API_BASE_URL}/users`,                         // Get all users
  USER_BY_ID: (id) => `${API_BASE_URL}/users/${id}`,      // Get a specific user
  
  // Availability endpoints
  AVAILABILITY: `${API_BASE_URL}/availability`,           // Get all availability records
  AVAILABILITY_BY_EMPLOYEE: (employeeID) => `${API_BASE_URL}/availability/${employeeID}`, // Get availability for one employee
  
  // Capacity endpoints
  CAPACITY: `${API_BASE_URL}/capacity`,                   // Get capacity data
  
  // Allocation endpoints
  ALLOCATIONS: `${API_BASE_URL}/allocations`,             // Get all allocations
  ALLOCATION_BY_ID: (id) => `${API_BASE_URL}/allocations/${id}`, // Get a specific allocation
  
  // Report endpoints
  REPORTS: `${API_BASE_URL}/reports`,                     // Get all reports
  REPORT_BY_ID: (id) => `${API_BASE_URL}/reports/${id}`,  // Get a specific report
  
  // Lookup endpoints
  LOOKUPS: `${API_BASE_URL}/lookups`,                     // Get all lookup types
  LOOKUPS_BY_TYPE: (type) => `${API_BASE_URL}/lookups/${type}`, // Get lookup values for a specific type
  
  // Authentication endpoints
  LOGIN: `${API_BASE_URL}/auth/login`,                    // Login route
  LOGOUT: `${API_BASE_URL}/auth/logout`,                  // Logout route
  VERIFY: `${API_BASE_URL}/auth/verify`                   // Token/session verification
};

// Export all endpoints for use across the app
module.exports = ENDPOINTS;
