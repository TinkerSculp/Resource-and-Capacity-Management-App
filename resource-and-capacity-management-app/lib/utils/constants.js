/**
 * Application constants
 */

// User roles
const USER_ROLES = {
  TEAM_MEMBER: 'team_member',
  RESOURCE_MANAGER: 'resource_manager',
  STAKEHOLDER: 'stakeholder',
  ADMIN: 'admin'
};

// Activity categories (matches ActivityCategory enum in models)
const ACTIVITY_CATEGORIES = {
  VACATION: 0,
  BASELINE: 1,
  STRATEGIC: 2,
  DISCRETIONARY_PROJECT: 3
};

// Availability status (matches AvailabilityStatus enum in models)
const AVAILABILITY_STATUS = {
  FULL_TIME: 'full-time',
  PART_TIME: 'part-time',
  ON_LEAVE: 'on-leave',
  TERMINATED: 'terminated'
};

// Lookup types (matches LookupType enum in models)
const LOOKUP_TYPES = {
  ROLE: 'role',
  DEPARTMENT: 'department',
  ACTIVITY_CATEGORY: 'activity_category',
  FISCAL: 'fiscal',
  PERIOD: 'period',
  HOLIDAY: 'holiday',
  THRESHOLD_RULE: 'threshold_rule',
  REPORT_TO: 'report_to',
  REQUESTOR: 'requestor',
  REQUESTING_DEPARTMENT: 'requesting_department'
};

// Date formats
const DATE_FORMATS = {
  SHORT: 'MM/DD/YYYY',
  LONG: 'MMMM DD, YYYY',
  ISO: 'YYYY-MM-DD'
};

// Pagination defaults
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100
};

// API response codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500
};

module.exports = {
  USER_ROLES,
  ACTIVITY_CATEGORIES,
  AVAILABILITY_STATUS,
  LOOKUP_TYPES,
  DATE_FORMATS,
  PAGINATION,
  HTTP_STATUS
};
