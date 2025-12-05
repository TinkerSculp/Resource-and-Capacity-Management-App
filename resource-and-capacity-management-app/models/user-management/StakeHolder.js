/**
 * StakeHolder subclass extending User
 */
import { User } from './User';
import { Activity } from '../allocation-activities/Activity';
import { Report } from '../utility/Report';
import { TeamMember } from './TeamMember';

export class StakeHolder extends User {
  constructor(data = {}) {
    super(data);
    this.watchedProjects = data.watchedProjects || []; // List of Activity instances
  }

  /**
   * View dashboard
   * @returns {Object} Dashboard data
   */
  viewDashboard() {
    // Implementation here
  }

  /**
   * View summary report
   * @returns {Report} Report instance
   */
  viewSummaryReport() {
    // Implementation here
  }

  /**
   * Get team overview
   * @returns {TeamMember[]} List of TeamMember instances
   */
  getTeamOverview() {
    // Implementation here
  }

  /**
   * Create user (static factory method)
   * @param {Object} data - User data
   * @returns {StakeHolder} New StakeHolder instance
   */
  static createUser(data) {
    // Implementation here
  }
}
