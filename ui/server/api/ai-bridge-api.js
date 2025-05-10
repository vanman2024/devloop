/**
 * AI Bridge API
 * 
 * Handles communication between the UI and Claude AI system
 * through a file-based message exchange system.
 */
const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const { exec } = require('child_process');
const router = express.Router();

// Base paths
const AI_BRIDGE_DIR = '/mnt/c/Users/angel/Devloop/system-core/ai-bridge';
const CLAUDE_INBOX_PATH = path.join(AI_BRIDGE_DIR, 'claude-inbox.json');
const CLAUDE_OUTBOX_PATH = path.join(AI_BRIDGE_DIR, 'claude-outbox.json');

// Ensure directories and files exist
async function ensureAiBridgeExists() {
  try {
    // Check if directory exists, create if not
    try {
      await fs.access(AI_BRIDGE_DIR);
    } catch (error) {
      await fs.mkdir(AI_BRIDGE_DIR, { recursive: true });
      console.log(`Created AI bridge directory: ${AI_BRIDGE_DIR}`);
    }
    
    // Check if inbox file exists, create if not
    try {
      await fs.access(CLAUDE_INBOX_PATH);
    } catch (error) {
      await fs.writeFile(CLAUDE_INBOX_PATH, '[]');
      console.log(`Created Claude inbox file: ${CLAUDE_INBOX_PATH}`);
    }
    
    // Check if outbox file exists, create if not
    try {
      await fs.access(CLAUDE_OUTBOX_PATH);
    } catch (error) {
      await fs.writeFile(CLAUDE_OUTBOX_PATH, '[]');
      console.log(`Created Claude outbox file: ${CLAUDE_OUTBOX_PATH}`);
    }
    
    return true;
  } catch (error) {
    console.error('Failed to ensure AI bridge exists:', error);
    return false;
  }
}

// Initialize when server starts
ensureAiBridgeExists().then(result => {
  console.log(`AI Bridge initialization ${result ? 'succeeded' : 'failed'}`);
});

/**
 * Read messages from a file
 * @param {string} filePath - Path to the message file
 * @returns {Array} - Array of messages
 */
async function readMessages(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data || '[]');
  } catch (error) {
    console.error(`Failed to read messages from ${filePath}:`, error);
    return [];
  }
}

/**
 * Write messages to a file
 * @param {string} filePath - Path to the message file
 * @param {Array} messages - Array of messages to write
 */
async function writeMessages(filePath, messages) {
  try {
    await fs.writeFile(filePath, JSON.stringify(messages, null, 2));
  } catch (error) {
    console.error(`Failed to write messages to ${filePath}:`, error);
    throw error;
  }
}

/**
 * Generate a unique message ID
 * @returns {string} - Unique ID
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Routes

// Get all Claude messages
router.get('/messages', async (req, res) => {
  try {
    const inbox = await readMessages(CLAUDE_INBOX_PATH);
    const outbox = await readMessages(CLAUDE_OUTBOX_PATH);
    
    res.json({
      inbox,
      outbox
    });
  } catch (error) {
    console.error('Failed to get Claude messages:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get unread Claude messages
router.get('/messages/unread', async (req, res) => {
  try {
    const outbox = await readMessages(CLAUDE_OUTBOX_PATH);
    const unreadMessages = outbox.filter(msg => msg.status === 'unread');
    
    res.json({ messages: unreadMessages });
  } catch (error) {
    console.error('Failed to get unread Claude messages:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send a message to Claude
router.post('/messages/send', async (req, res) => {
  try {
    const { type, content, metadata } = req.body;
    
    // Validate message
    if (!type || !content) {
      return res.status(400).json({ error: 'Invalid message: must include type and content' });
    }
    
    // Create message with ID and timestamp
    const message = {
      id: generateId(),
      type,
      content,
      metadata: metadata || {},
      timestamp: new Date().toISOString(),
      status: 'unread',
      source: 'ui_system'
    };
    
    // Read existing messages
    const messages = await readMessages(CLAUDE_INBOX_PATH);
    
    // Add new message
    messages.push(message);
    
    // Write updated messages
    await writeMessages(CLAUDE_INBOX_PATH, messages);
    
    // Return success with message ID
    res.json({
      success: true,
      messageId: message.id
    });
  } catch (error) {
    console.error('Failed to send message to Claude:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark Claude messages as read
router.post('/messages/mark-read', async (req, res) => {
  try {
    const { messageIds } = req.body;
    
    // Validate message IDs
    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ error: 'Invalid message IDs' });
    }
    
    // Read existing messages
    const messages = await readMessages(CLAUDE_OUTBOX_PATH);
    
    // Mark messages as read
    const updatedMessages = messages.map(msg => 
      messageIds.includes(msg.id)
        ? { ...msg, status: 'read' }
        : msg
    );
    
    // Write updated messages
    await writeMessages(CLAUDE_OUTBOX_PATH, updatedMessages);
    
    // Return success
    res.json({
      success: true,
      markedCount: messageIds.length
    });
  } catch (error) {
    console.error('Failed to mark Claude messages as read:', error);
    res.status(500).json({ error: error.message });
  }
});

// Clear Claude messages
router.post('/messages/clear', async (req, res) => {
  try {
    // Clear inbox and outbox
    await writeMessages(CLAUDE_INBOX_PATH, []);
    await writeMessages(CLAUDE_OUTBOX_PATH, []);
    
    // Return success
    res.json({
      success: true,
      message: 'Claude messages cleared'
    });
  } catch (error) {
    console.error('Failed to clear Claude messages:', error);
    res.status(500).json({ error: error.message });
  }
});

// Execute a notification to trigger Claude's attention
router.post('/notify-claude', async (req, res) => {
  try {
    // Get message type
    const { messageType } = req.body;
    
    if (!messageType) {
      return res.status(400).json({ error: 'Missing message type' });
    }
    
    // Create a special notification marker file with timestamp
    const notificationPath = path.join(AI_BRIDGE_DIR, `notification-${Date.now()}.txt`);
    await fs.writeFile(notificationPath, `Message type: ${messageType}\nTimestamp: ${new Date().toISOString()}`);
    
    // Execute Claude attention command if it exists
    try {
      exec('/mnt/c/Users/angel/Devloop/system-core/scripts/utils/claude-notify.sh', (error, stdout, stderr) => {
        if (error) {
          console.warn('Claude notification command failed:', error);
          // This is non-fatal, continue
        } else {
          console.log('Claude notification sent:', stdout);
        }
      });
    } catch (error) {
      console.warn('Failed to execute Claude notification command:', error);
      // This is non-fatal, continue
    }
    
    // Return success
    res.json({
      success: true,
      message: 'Claude notification sent',
      notificationFile: notificationPath
    });
  } catch (error) {
    console.error('Failed to notify Claude:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ensure directory exists
router.post('/ensure-directory', async (req, res) => {
  try {
    const { path: dirPath } = req.body;
    
    if (!dirPath) {
      return res.status(400).json({ error: 'Missing directory path' });
    }
    
    await fs.mkdir(dirPath, { recursive: true });
    
    res.json({
      success: true,
      path: dirPath
    });
  } catch (error) {
    console.error('Failed to ensure directory exists:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check if file exists
router.get('/file-exists', async (req, res) => {
  try {
    const { path: filePath } = req.query;
    
    if (!filePath) {
      return res.status(400).json({ error: 'Missing file path' });
    }
    
    try {
      await fs.access(filePath);
      res.json({ exists: true });
    } catch (error) {
      res.json({ exists: false });
    }
  } catch (error) {
    console.error('Failed to check if file exists:', error);
    res.status(500).json({ error: error.message });
  }
});

// Read file
router.get('/read-file', async (req, res) => {
  try {
    const { path: filePath } = req.query;
    
    if (!filePath) {
      return res.status(400).json({ error: 'Missing file path' });
    }
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      res.send(content);
    } catch (error) {
      if (error.code === 'ENOENT') {
        res.status(404).json({ error: 'File not found' });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Failed to read file:', error);
    res.status(500).json({ error: error.message });
  }
});

// Write file
router.post('/write-file', async (req, res) => {
  try {
    const { path: filePath, content } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ error: 'Missing file path' });
    }
    
    if (content === undefined) {
      return res.status(400).json({ error: 'Missing content' });
    }
    
    // Ensure directory exists
    const dirPath = path.dirname(filePath);
    await fs.mkdir(dirPath, { recursive: true });
    
    // Write file
    await fs.writeFile(filePath, content);
    
    res.json({
      success: true,
      path: filePath
    });
  } catch (error) {
    console.error('Failed to write file:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;