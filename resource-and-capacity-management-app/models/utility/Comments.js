/**
 * Comments class for utility package
 */
import { User } from "../user-management/User";

export class Comments {
  constructor(data = {}) {
    this.commentID = data.commentID || 0;
    this.author = data.author instanceof User ? data.author : null; // User class instance
    this.timestamp = data.timestamp || new Date(); // DateTime
    this.content = data.content || "";
  }

  /**
   * Add comment
   * @param {number} commentID - Comment ID
   * @param {string} content - Comment content
   * @param {User} author - Comment author
   */
  addComment(commentID, content, author = null) {
    if (!content) {
      throw new Error("Comment content cannot be empty");
    }

    this.commentID = commentID;
    this.content = content;
    this.author = author;
    this.timestamp = new Date();

    return this;
  }

  /**
   * Get comments by IDs
   * @param {number[]} commentIDs - List of comment IDs
   * @returns {Comments[]} List of Comments class instances
   */
  static getComments(comments = [], commentIDs = []) {
    if (!Array.isArray(comments) || !Array.isArray(commentIDs)) {
      return [];
    }

    return comments.filter((comment) => commentIDs.includes(comment.commentID));
  }
}
