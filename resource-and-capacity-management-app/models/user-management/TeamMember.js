/**
 * TeamMember subclass extending User
 */
import { User } from './User';
import { Activity } from '../allocation-activities/Activity';
import { Availability } from '../availability-capacity';
import { Report } from '../utility/Report';

export class TeamMember extends User {
  constructor(data = {}) {
    super(data); // superclass constructor
    this.assignedActivities = data.assignedActivities || []; // Array of Activity instances
    this.personalAvailability = data.personalAvailability || null; // Availability instance
  }

  /**
   * View my assignments
   * @returns {Activity[]} List of assigned activities
   */
  viewMyAssignment() {
    // Implementation here
  }

  /**
   * View my availability
   * @returns {Availability[]} List of availability (returns array with single availability instance)
   */
  viewMyAvailability() {
    // Implementation here
  }

  /**
   * Set availability
   * @param {Availability} availability - Availability instance to set
   */
  setAvailability(availability) {
    // Implementation here
  }

  /**
   * Get availability
   * @returns {Availability} Availability instance
   */
  getAvailability() {
    // Implementation here
  }

  /**
   * View report
   * @returns {Report} Report instance
   */
  viewReport() {
    // Implementation here
  }

  /**
   * Create user (static factory method)
   * @param {Object} data - User data
   * @returns {TeamMember} New TeamMember instance
   */
  static createUser(data) {
    // Implementation here
  }
}
