import Event from "../models/eventModel.js";

// Get banners for upcoming and current events (shows before and during event)
export const getEventBanners = async (req, res) => {
  try {
    const now = new Date();
    
    // Get events that haven't ended yet (upcoming + current)
    const events = await Event.find({
      isActive: true,
      endDate: { $gte: now },
      bannerImage: { $ne: null }
    }).sort({ startDate: 1 });

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
    
    const activeEvents = await Event.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now }
    }).sort({ startDate: 1 });

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
    const bannerImage = req.file ? req.file.filename : null;

    const newEvent = new Event({
      title,
      description,
      bannerImage,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });

    const savedEvent = await newEvent.save();

    res.status(201).json({
      status: true,
      message: "Event created successfully",
      data: savedEvent,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Failed to create event",
      error: error.message,
    });
  }
};

// Delete event (admin only)
export const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    
    const deletedEvent = await Event.findByIdAndDelete(id);
    
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