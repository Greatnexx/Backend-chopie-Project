import Event from "../models/eventModel.js";

// Get banners for upcoming and current events (shows before and during event)
export const getEventBanners = async (req, res) => {
  try {
    const now = new Date();
    
    const query = {
      isActive: true,
      endDate: { $gte: now },
      bannerImage: { $ne: null }
    };
    if (req.restaurantId) {
      query.restaurantId = req.restaurantId;
    }
    
    const events = await Event.find(query).sort({ startDate: 1 });

    res.status(200).json({
      status: true,
      message: "Event banners fetched successfully",
      data: events,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Failed to fetch event banners",
      error: error.message,
    });
  }
};

// Get currently active events (during event time)
export const getActiveEvents = async (req, res) => {
  try {
    const now = new Date();
    
    const query = {
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now }
    };
    if (req.restaurantId) {
      query.restaurantId = req.restaurantId;
    }
    
    const activeEvents = await Event.find(query).sort({ startDate: 1 });

    res.status(200).json({
      status: true,
      message: "Active events fetched successfully",
      data: activeEvents,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Failed to fetch active events",
      error: error.message,
    });
  }
};

// Create new event (admin only)
export const createEvent = async (req, res) => {
  try {
    const { title, description, startDate, endDate } = req.body;
    const bannerImage = req.file ? req.file.path : null; // Cloudinary URL

    // Validate required fields
    if (!bannerImage) {
      return res.status(400).json({
        status: false,
        message: "Banner image is required",
      });
    }
    
    if (!startDate || !startDate.trim()) {
      return res.status(400).json({
        status: false,
        message: "Start date is required",
      });
    }
    
    if (!endDate || !endDate.trim()) {
      return res.status(400).json({
        status: false,
        message: "End date is required",
      });
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start >= end) {
      return res.status(400).json({
        status: false,
        message: "End date must be after start date",
      });
    }

    const eventData = {
      title: title || '',
      description: description || '',
      bannerImage,
      startDate: start,
      endDate: end,
    };
    
    if (req.restaurantId) {
      eventData.restaurantId = req.restaurantId;
    }

    const newEvent = new Event(eventData);
    const savedEvent = await newEvent.save();

    res.status(201).json({
      status: true,
      message: "Event created successfully",
      data: savedEvent,
    });
  } catch (error) {
    console.error('Event creation error:', error);
    res.status(400).json({
      status: false,
      message: error.message || "Failed to create event",
    });
  }
};

// Delete event (admin only)
export const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = { _id: id };
    if (req.restaurantId) {
      query.restaurantId = req.restaurantId;
    }
    
    const deletedEvent = await Event.findOneAndDelete(query);
    
    if (!deletedEvent) {
      return res.status(404).json({
        status: false,
        message: "Event not found",
      });
    }

    res.status(200).json({
      status: true,
      message: "Event deleted successfully",
      data: deletedEvent,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Failed to delete event",
      error: error.message,
    });
  }
};

// Get events by restaurant ID (for customer popup)
export const getEventsByRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const now = new Date();
    
    // Get upcoming and current events for the restaurant
    const events = await Event.find({
      restaurantId: restaurantId,
      isActive: true,
      endDate: { $gte: now } // Events that haven't ended yet
    }).sort({ startDate: 1 });

    res.status(200).json({
      status: true,
      message: "Restaurant events fetched successfully",
      data: events,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Failed to fetch restaurant events",
      error: error.message,
    });
  }
};

// Auto-cleanup expired events (can be called by cron job)
export const cleanupExpiredEvents = async (req, res) => {
  try {
    const now = new Date();
    
    const result = await Event.updateMany(
      { endDate: { $lt: now }, isActive: true },
      { isActive: false }
    );

    res.status(200).json({
      status: true,
      message: `${result.modifiedCount} expired events deactivated`,
      data: { deactivatedCount: result.modifiedCount },
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Failed to cleanup expired events",
      error: error.message,
    });
  }
};