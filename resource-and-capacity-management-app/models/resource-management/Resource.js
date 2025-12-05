/**
 * Resource class for resource management
 */
import { Availability } from '../availability-capacity/Availability';
import { Comments } from '../utility/Comments';

export class Resource {
  constructor(data = {}) {
    this.resourceID = data.resourceID || 0;
    this.name = data.name || '';
    this.role = data.role || '';
    this.department = data.department || '';
    this.skills = data.skills || []; // List<String>
    this.availability = data.availability || null; // Availability class instance
    this.location = data.location || '';
    this.status = data.status !== undefined ? data.status : true;
    this.Comments = data.Comments || []; // List<Comments class>
  }

  /**
   * Create resource
   */
  create() {
    // Implementation here
  }

  /**
   * Update resource
   */
  update() {
    // Implementation here
  }

  /**
   * Delete resource
   */
  delete() {
    // Implementation here
  }

  /**
   * Soft delete resource
   */
  softDelete() {
    // Implementation here
  }

  /**
   * Restore resource
   */
  restore() {
    // Implementation here
  }

  /**
   * Get availability for specific month and year
   * @param {number} month - Month (1-12)
   * @param {number} year - Year
   * @returns {Availability} Availability class instance
   */
  getAvailability(month, year) {
    // Implementation here
  }

  /**
   * Get utilization
   * @returns {number} Utilization as a small real number
   */
  getUtilization() {
    // Implementation here
  }

  /**
   * Check if resource is over-allocated
   * @returns {boolean} True if over-allocated
   */
  isOverAllocated() {
    // Implementation here
  }
}
