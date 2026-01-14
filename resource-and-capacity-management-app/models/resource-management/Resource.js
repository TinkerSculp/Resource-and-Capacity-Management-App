/**
 * Resource class for resource management
 */
import { Availability } from "../availability-capacity/Availability";
import { AvailabilityStatus } from "../availability-capacity";
import { Comments } from "../utility/Comments";

export class Resource {
  constructor(data = {}) {
    this.resourceID = data.resourceID || 0;
    this.name = data.name || "";
    this.role = data.role || "";
    this.department = data.department || "";
    this.skills = Array.isArray(data.skills) ? data.skills : []; // List<String>
    this.availability =
      data.availability instanceof Availability ? data.availability : null; // Availability class instance
    this.location = data.location || "";
    this.status = data.status !== undefined ? data.status : true;
    this.comments = Array.isArray(data.comments) ? data.comments : []; // List<Comments class>
  }

  /**
   * Create resource
   */
  create() {
    if (!this.name || !this.role) {
      throw new Error("Name and Role are required to create a resource.");
    }

    this.status = true;
    return this;
  }

  /**
   * Update resource
   */
  update(data = {}) {
    Object.assign(this, data);
    return this;
  }

  /**
   * Delete resource
   */
  delete() {
    this.resourceID = null;
    this.status = false;
    return true;
  }

  /**
   * Soft delete resource
   */
  softDelete() {
    this.status = false;

    if (this.availability) {
      this.availability.setAvailability(AvailabilityStatus.TERMINATED);
    }

    return this;
  }

  /**
   * Restore resource
   */
  restore() {
    this.status = true;

    if (this.availability) {
      this.availability.setAvailability(AvailabilityStatus.FULL_TIME);
    }

    return this;
  }

  /**
   * Get availability for specific month and year
   * @param {number} month - Month (1-12)
   * @param {number} year - Year
   * @returns {Availability} Availability class instance
   */
  getAvailability(month, year) {
    if (!this.availability) {
      return null;
    }

    if (this.availability.month === month && this.availability.year === year) {
      return this.availability;
    }

    return null;
  }

  /**
   * Get utilization
   * @returns {number} Utilization as a small real number
   */
  getUtilization() {
    if (!this.availability || !this.availability.isAvailable()) {
      return 0;
    }

    switch (this.availability.availabilityStatus) {
      case AvailabilityStatus.FULL_TIME:
        return 1.0;
      case AvailabilityStatus.PART_TIME:
        return 0.5;
      default:
        return 0;
    }
  }

  /**
   * Check if resource is over-allocated
   * @returns {boolean} True if over-allocated
   */
  isOverAllocated() {
    return this.getUtilization() > 1.0;
  }

  /**
   * Add skill to resource
   * @param {string} skill - Skill to add
   */
  addSkill(skill) {
    if (skill && !this.skills.includes(skill)) {
      this.skills.push(skill);
    }
  }

  /**
   * Add comment to resource
   * @param {string} content - Comment text
   * @param {string} author - Comment author
   */
  addComment(content, author) {
    this.comments.push(new Comments({ content, author }));
  }

  /**
   * Check if resource is active
   * @returns {boolean} True if active
   */
  isActive() {
    return this.status && this.availability.isAvailable();
  }
}
