const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");

// Import models
const ChatGroup = require("../model/chatGroupModel");
const ChatMessage = require("../model/chatMessageModel");
const Student = require("../model/userModel");

const router = express.Router();

// Configure multer for in-memory storage for files
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Fetch data for all students without populating related models
router.get("/students", async (req, res) => {
  try {
    // Fetch all students without populating related fields
    const students = await Student.find(); // No populate call, fetching only student data

    if (students.length === 0) {
      return res.status(404).json({ message: "No students found" });
    }

    res.status(200).json(students);
  } catch (error) {
    res.status(500).json({ message: "Error fetching students data", error });
  }
});

// Create a new group and update the Student model with the new group ID
router.post("/creategroup", async (req, res) => {
  const { name, members, adminId } = req.body;

  try {
    // Add adminId to the members array (if it's not already included)
    const updatedMembers = [...members];

    if (!updatedMembers.includes(adminId)) {
      updatedMembers.push(adminId); // Ensure admin is also in members
    }

    // Create a new group with members and admins
    const group = new ChatGroup({
      name,
      members: updatedMembers, // Now includes adminId
      admins: [adminId], // Admin stored separately in the admins field
    });

    await group.save();

    // Add the groupId to each student's chatgroups array
    const allMembers = updatedMembers; // Already includes admin

    // Iterate over each member (including admin) to update their chatgroups array
    for (const memberId of allMembers) {
      const student = await Student.findById(memberId);

      // Check if the groupId is already in the student's chatgroups array
      if (student && !student.chatgroups.includes(group._id)) {
        student.chatgroups.push(group._id); // Add the new group ID to chatgroups array
        await student.save();
      }
    }

    res.status(201).json({ message: "Group created successfully", group });
  } catch (error) {
    res.status(500).json({ message: "Error creating group", error });
  }
});

// Send a message in a group (either text or file)
router.post("/sendmessage/:groupId", upload.single("file"), async (req, res) => {
  const { groupId } = req.params;
  const { senderId, messageType, content } = req.body;
  const file = req.file;

  try {
    const chatGroup = await ChatGroup.findById(groupId);
    if (!chatGroup) return res.status(404).json({ message: "Group not found" });

    let newMessage;

    if (messageType === "file" && file) {
      // Create a new message with a file
      newMessage = new ChatMessage({
        chatGroup: groupId,
        sender: senderId,
        messageType: "file",
        file: {
          data: file.buffer.toString('base64'), // Convert file buffer to base64
          contentType: file.mimetype,
          fileName: file.originalname,
        },
        unseenBy: chatGroup.members.filter(
          (member) => member.toString() !== senderId.toString()
        ),
      });
    } else if (messageType === "text") {
      // Create a new message with text
      newMessage = new ChatMessage({
        chatGroup: groupId,
        sender: senderId,
        messageType: "text",
        content,
        unseenBy: chatGroup.members.filter(
          (member) => member.toString() !== senderId.toString()
        ),
      });
    } else {
      return res.status(400).json({ message: "Invalid message type or missing content" });
    }

    await newMessage.save();

    // Optionally update the lastMessage field in the chatGroup
    chatGroup.lastMessage = newMessage._id;
    await chatGroup.save();

    res.status(201).json({ message: "Message sent successfully", newMessage });
  } catch (error) {
    res.status(500).json({ message: "Error sending message", error });
  }
});

// Get all messages in a group
router.get("/messages/:groupId", async (req, res) => {
  const { groupId } = req.params;

  try {
    const messages = await ChatMessage.find({ chatGroup: groupId })
      .populate("sender", "name")
      .exec();

    // Format response for file messages
    const formattedMessages = messages.map((msg) => {
      if (msg.messageType === "file") {
        return {
          ...msg._doc,
          file: {
            fileName: msg.file.fileName,
            contentType: msg.file.contentType,
            data: msg.file.data, // Return file data as base64
          },
        };
      }
      return msg;
    });

    res.status(200).json(formattedMessages);
  } catch (error) {
    res.status(500).json({ message: "Error fetching messages", error });
  }
});

// Delete a message
router.delete("/deletemessage/:messageId", async (req, res) => {
  const { messageId } = req.params;

  try {
    const message = await ChatMessage.findByIdAndDelete(messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });

    res.status(200).json({ message: "Message deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting message", error });
  }
});

// Add a new member to the group
router.post("/addmember/:groupId", async (req, res) => {
  const { groupId } = req.params;
  const { memberId } = req.body;

  try {
    const group = await ChatGroup.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (!group.members.includes(memberId)) {
      group.members.push(memberId);
      await group.save();
      res.status(200).json({ message: "Member added successfully", group });
    } else {
      res.status(400).json({ message: "Member already in group" });
    }
  } catch (error) {
    res.status(500).json({ message: "Error adding member", error });
  }
});

// Edit group name
router.put("/editgroupname/:groupId", async (req, res) => {
  const { groupId } = req.params;
  const { newName } = req.body;

  try {
    const group = await ChatGroup.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    group.name = newName;
    await group.save();
    res.status(200).json({ message: "Group name updated successfully", group });
  } catch (error) {
    res.status(500).json({ message: "Error updating group name", error });
  }
});

// Leave group
router.post("/leavegroup/:groupId", async (req, res) => {
  const { groupId } = req.params;
  const { userId } = req.body;

  try {
    const group = await ChatGroup.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    // Remove the userId from the members array but don't delete the groupId from the user's chatgroups array
    group.members = group.members.filter(
      (member) => member.toString() !== userId.toString()
    );

    if (group.admins.includes(userId)) {
      if (group.admins.length === 1) {
        return res.status(400).json({
          message:
            "You are the only admin. Promote another admin before leaving.",
        });
      }
      group.admins = group.admins.filter(
        (admin) => admin.toString() !== userId.toString()
      );
    }

    await group.save();
    res
      .status(200)
      .json({ message: "User left the group successfully", group });
  } catch (error) {
    res.status(500).json({ message: "Error leaving group", error });
  }
});

// Delete group (admin only) but keep groupId in user chatgroups array
router.delete("/deletegroup/:groupId", async (req, res) => {
  const { groupId } = req.params;
  const { adminId } = req.body;

  try {
    const group = await ChatGroup.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (!group.admins.includes(adminId)) {
      return res
        .status(403)
        .json({ message: "Only admins can delete the group" });
    }

    // Remove the group but leave the groupId in each student's chatgroups array
    await ChatGroup.findByIdAndDelete(groupId);
    await ChatMessage.deleteMany({ chatGroup: groupId });

    res.status(200).json({ message: "Group deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting group", error });
  }
});

// Remove a member by admin but don't remove groupId from user chatgroups array
router.post("/removemember/:groupId", async (req, res) => {
  const { groupId } = req.params;
  const { adminId, memberId } = req.body;

  try {
    const group = await ChatGroup.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (!group.admins.includes(adminId)) {
      return res
        .status(403)
        .json({ message: "Only admins can remove members" });
    }

    // Remove member from group members array but don't remove groupId from user chatgroups
    group.members = group.members.filter(
      (member) => member.toString() !== memberId.toString()
    );
    await group.save();

    res.status(200).json({ message: "Member removed successfully", group });
  } catch (error) {
    res.status(500).json({ message: "Error removing member", error });
  }
});



router.get("/usergroups/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    // Fetch the student and populate their chatgroups
    const student = await Student.findById(userId).populate("chatgroups");

    if (!student) {
      return res.status(404).json({ message: "User not found" });
    }

    // Create an array to store the groups and unseen message count
    const chatgroupsWithUnseenCount = [];

    // Loop through each chatgroup to calculate unseen messages
    for (const group of student.chatgroups) {
      // Find unseen messages for the current user in this group
      const unseenMessagesCount = await ChatMessage.countDocuments({
        chatGroup: group._id,
        unseenBy: userId,
      });

      // Push group data and unseen message count to the result array
      chatgroupsWithUnseenCount.push({
        _id: group._id,
        name: group.name,
        members: group.members,
        admins: group.admins,
        createdAt: group.createdAt,
        lastMessage: group.lastMessage,
        unseenCount: unseenMessagesCount,
      });
    }

    // Send the response with groups and unseen message counts
    res.status(200).json({ chatgroups: chatgroupsWithUnseenCount });
  } catch (error) {
    res.status(500).json({ message: "Error fetching user groups", error });
  }
});

module.exports = router;

