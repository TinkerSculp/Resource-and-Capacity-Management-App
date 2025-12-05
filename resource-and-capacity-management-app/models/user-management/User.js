/**
 * User parent class for user management
 */
export class User {
  constructor(data = {}) {
    this.employeeID = data.employeeID || 0;
    this.firstName = data.firstName || '';
    this.lastName = data.lastName || '';
    this.title = data.title || '';
    this.status = data.status !== undefined ? data.status : true;
    this.department = data.department || '';
    this.role = data.role || '';
    this.permissions = data.permissions || [];
  }

  /**
   * Login user
   */
  login() {
    // Implementation here
  }

  /**
   * Logout user
   */
  logout() {
    // Implementation here
  }

  /**
   * Give permission to user
   * @param {string} permission - Permission to add
   */
  givePermission(permission) {
    // Implementation here
  }

  /**
   * Remove permission from user
   * @param {string} permission - Permission to remove
   */
  removePermission(permission) {
    // Implementation here
  }

  /**
   * Get user role
   * @returns {string} User role
   */
  getRole() {
    // Implementation here
  }
}
