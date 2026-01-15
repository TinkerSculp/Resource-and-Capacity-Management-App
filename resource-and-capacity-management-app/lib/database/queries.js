import { getDB } from './mongodb.js';
// Import helper to access the active MongoDB database instance

/**
 * Generic query utilities for database operations
 * Provides reusable wrappers for common CRUD actions.
 */

/**
 * Find all documents in a collection
 * @param {string} collectionName - Name of the collection
 * @param {Object} filter - Query filter (default: empty object)
 * @param {Object} options - Additional query options
 * @returns {Promise<Array>} Array of matching documents
 */
export async function findAll(collectionName, filter = {}, options = {}) {
  const db = getDB(); // Get active DB connection
  const collection = db.collection(collectionName); // Select collection
  return await collection.find(filter, options).toArray(); // Return all matching docs
}

/**
 * Find one document in a collection
 * @param {string} collectionName - Name of the collection
 * @param {Object} filter - Query filter
 * @returns {Promise<Object|null>} First matching document or null
 */
export async function findOne(collectionName, filter) {
  const db = getDB();
  const collection = db.collection(collectionName);
  return await collection.findOne(filter); // Return single document
}

/**
 * Insert one document into a collection
 * Automatically adds createdAt and updatedAt timestamps.
 * @param {string} collectionName - Name of the collection
 * @param {Object} document - Document to insert
 * @returns {Promise<Object>} Insert result
 */
export async function insertOne(collectionName, document) {
  const db = getDB();
  const collection = db.collection(collectionName);
  return await collection.insertOne({
    ...document,
    createdAt: new Date(), // Timestamp for creation
    updatedAt: new Date()  // Timestamp for last update
  });
}

/**
 * Update one document in a collection
 * Automatically updates the updatedAt timestamp.
 * @param {string} collectionName - Name of the collection
 * @param {Object} filter - Query filter
 * @param {Object} update - Update operations (must include $set if modifying fields)
 * @returns {Promise<Object>} Update result
 */
export async function updateOne(collectionName, filter, update) {
  const db = getDB();
  const collection = db.collection(collectionName);

  return await collection.updateOne(filter, {
    ...update,
    // Ensure updatedAt is always refreshed
    $set: { ...update.$set, updatedAt: new Date() }
  });
}

/**
 * Delete one document from a collection
 * @param {string} collectionName - Name of the collection
 * @param {Object} filter - Query filter
 * @returns {Promise<Object>} Delete result
 */
export async function deleteOne(collectionName, filter) {
  const db = getDB();
  const collection = db.collection(collectionName);
  return await collection.deleteOne(filter);
}

/**
 * Count documents in a collection
 * @param {string} collectionName - Name of the collection
 * @param {Object} filter - Query filter (default: empty object)
 * @returns {Promise<number>} Number of matching documents
 */
export async function count(collectionName, filter = {}) {
  const db = getDB();
  const collection = db.collection(collectionName);
  return await collection.countDocuments(filter);
}