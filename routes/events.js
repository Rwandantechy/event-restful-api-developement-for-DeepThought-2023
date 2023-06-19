const express = require("express");
const router = express.Router();
const upload = require("../multiConfig");
const { ObjectId } = require('mongodb');

// Creating a new event
router.post("/events", upload.single("image"), async (req, res, next) => {
  try {
    const eventData = req.body;
    const file = req.file;

    if (file) {
      eventData.image = file.path;
    }

    if (eventData.attendees) {
      eventData.attendees = eventData.attendees
        .split(",")
        .map((attendee) => attendee.trim());
    }

    const result = await req.eventsCollection.insertOne(eventData);
    const insertedId = result.insertedId;

    const createdEvent = await req.eventsCollection.findOne({
      _id: insertedId,
    });

    if (!createdEvent) {
      const error = new Error("Failed to create the event");
      error.status = 500;
      throw error;
    }

    const response = {
      message: "Event created successfully",
      event: createdEvent,
      request: {
        type: "GET",
        description: "The event details",
        url: `${req.protocol}://${req.get("host")}/api/v3/app/events/${createdEvent._id}`,
      },
    };

    res.status(201).json(response);
  } catch (error) {
    console.error("Failed to create the event:", error);
    next(error);
  }
});

// Get all events
router.get("/events", async (req, res, next) => {
  try {
    const events = await req.eventsCollection.find().toArray();
    const count = events.length;

    const response = events.map((event) => ({
      metadata: {
        count: count,
        message: "List of all events",
      },
      event,
      request: {
        type: "GET",
        description: "Get event details",
        url: `${req.protocol}://${req.get("host")}/api/v3/app/events/${event._id}`,
      },
    }));

    res.json(response);
  } catch (error) {
    console.error("Failed to fetch events:", error);
    next(error);
  }
});

// Get a single event by ID
router.get("/events/:id", async (req, res, next) => {
  const eventId = req.params.id;
  try {
    const event = await req.eventsCollection.findOne({
      _id: new ObjectId(eventId),
    });
    if (!event) {
      const error = new Error("Event not found");
      error.status = 404;
      throw error;
    } else {
      const response = {
        event,
        request: {
          type: "DELETE",
          description: "Delete this event",
          url: `${req.protocol}://${req.get("host")}/api/v3/app/events/${event._id}`,
        },
      };
      res.json(response);
    }
  } catch (error) {
    console.error("Failed to fetch the event:", error);
    next(error);
  }
});

// Updating an event
router.put("/events/:id", upload.single("image"), async (req, res, next) => {
  const eventId = req.params.id;
  const updateOps = {};

  if (req.file) {
    updateOps.image = req.file.path;
  }

  for (const key in req.body) {
    updateOps[key] = req.body[key];
  }

  try {
    const result = await req.eventsCollection.updateOne(
      { _id: new ObjectId(eventId) },
      { $set: updateOps }
    );

    if (result.matchedCount === 0) {
      const error = new Error("Event not found");
      error.status = 404;
      throw error;
    }

    const updatedEvent = await req.eventsCollection.findOne({
      _id: new ObjectId(eventId),
    });

    const response = {
      message: "Event updated successfully",
      event: updatedEvent,
      request: {
        type: "GET",
        description: "The event details",
        url: `${req.protocol}://${req.get("host")}/api/v3/app/events/${updatedEvent._id}`,
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Failed to update the event:", error);
    next(error);
  }
});

// Deleting an event
router.delete("/events/:id", async (req, res, next) => {
  const eventId = req.params.id;
  try {
    const result = await req.eventsCollection.deleteOne({
      _id: new ObjectId(eventId),
    });

    if (result.deletedCount === 0) {
      const error = new Error("Event not found");
      error.status = 404;
      throw error;
    }

    const response = {
      message: "Event deleted successfully",
      request: {
        type: "POST",
        description: "Create a new event",
        url: `${req.protocol}://${req.get("host")}/api/v3/app/events`,
        body: {
          name: "String",
          tagline: "String",
          schedule: "String (ISO 8601 date format)",
          description: "String",
          moderator: "String",
          category: "String",
          sub_category: "String",
          rigor_rank: "String",
          attendees: "Array of strings",
          image: "File",
        },
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Failed to delete the event:", error);
    next(error);
  }
});

module.exports = router;
