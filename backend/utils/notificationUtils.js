/**
 * Real-time notification helper functions
 */

import Notification from "../models/Notification.js";

/**
 * Create a new notification with real-time update
 * @param {Object} notificationData - Notification data object
 * @returns {Promise<Object>} The created notification
 */
export const createNotification = async (notificationData) => {
  try {
    // Create and save notification
    const notification = new Notification(notificationData);
    await notification.save();
    
    // Emit real-time update if io is available
    if (global.io) {
      global.io.to(notification.recipient).emit('new-notification', notification);
      console.log(`Emitted new-notification to ${notification.recipient}`);
    }
    
    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
};

/**
 * Create notifications for multiple recipients
 * @param {Array<string>} recipients - Array of recipient usernames
 * @param {Object} baseNotificationData - Base notification data without recipient
 * @returns {Promise<Array<Object>>} Created notifications
 */
export const createMultipleNotifications = async (recipients, baseNotificationData) => {
  try {
    const notifications = [];
    
    for (const recipient of recipients) {
      const notificationData = {
        ...baseNotificationData,
        recipient
      };
      
      const notification = await createNotification(notificationData);
      notifications.push(notification);
    }
    
    return notifications;
  } catch (error) {
    console.error("Error creating multiple notifications:", error);
    throw error;
  }
};