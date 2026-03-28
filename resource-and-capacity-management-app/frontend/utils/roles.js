/* ---------------------------------------------------------
   ROLE CONSTANTS & ROLE CHECK HELPERS
   ---------------------------------------------------------
   • Centralizes all role IDs used across the application
   • Prevents magic numbers from being scattered in the codebase
   • Supports consistent, maintainable role-based access control
--------------------------------------------------------- */

export const ROLES = {
  RESOURCE_MANAGER: 1,
  STAKEHOLDER: 2,
  TEAM_MEMBER: 3,
  ADMIN: 4,
};

/* ---------------------------------------------------------
   ROLE CHECK HELPERS
   ---------------------------------------------------------
   • Provide readable, intention-revealing functions
   • Avoid direct numeric comparisons throughout the app
   • Improve security by reducing role-checking mistakes
--------------------------------------------------------- */

/**
 * Determine if the user is a Resource Manager.
 * -----------------------------------------------------
 * SECURITY NOTES:
 * • Used for gating high-privilege actions (editing resources,
 *   assignments, initiatives, etc.)
 * • Always validate the user object before calling this.
 */
export function isManager(role) {
  return role === ROLES.RESOURCE_MANAGER;
}

/**
 * Determine if the user is a Team Member.
 * -----------------------------------------------------
 * SECURITY NOTES:
 * • Team Members typically have limited access.
 * • Useful for restricting write operations or sensitive views.
 */
export function isTeamMember(role) {
  return role === ROLES.TEAM_MEMBER;
}

/**
 * Determine if the user is a Stakeholder.
 * -----------------------------------------------------
 * SECURITY NOTES:
 * • Stakeholders often have read-only or reporting access.
 * • Helps enforce least-privilege access patterns.
 */
export function isStakeholder(role) {
  return role === ROLES.STAKEHOLDER;
}

export function isAdmin(role) {
  return role === ROLES.ADMIN;
}