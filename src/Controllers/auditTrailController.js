import AuditLog from "../models/auditLogModel.js";

// Log audit trail entry
export const logAuditTrail = async (auditData) => {
  try {
    const auditEntry = new AuditLog({
      restaurantId: auditData.restaurantId,
      userId: auditData.userId,
      orderId: auditData.entityId && auditData.entityType === 'Order' ? auditData.entityId : undefined,
      action: auditData.action,
      details: typeof auditData.details === 'string' ? auditData.details : JSON.stringify(auditData.details || {}),
      ipAddress: auditData.ipAddress
    });
    await auditEntry.save();
  } catch (error) {
    console.error('Error logging audit trail:', error);
  }
};

// Get audit trail entries
export const getAuditTrail = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      action,
      userId,
      startDate,
      endDate
    } = req.query;

    const filter = { restaurantId: req.restaurantId };

    if (action) filter.action = { $regex: action, $options: 'i' };
    if (userId) filter.userId = userId;
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const auditEntries = await AuditLog.find(filter)
      .populate('userId', 'name email role')
      .populate('orderId', 'orderNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await AuditLog.countDocuments(filter);

    res.status(200).json({
      status: true,
      data: auditEntries,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Error fetching audit trail",
      error: error.message,
    });
  }
};

// Get audit trail statistics
export const getAuditStats = async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    let startDate = new Date();
    if (period === '24h') {
      startDate.setHours(startDate.getHours() - 24);
    } else if (period === '7d') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === '30d') {
      startDate.setDate(startDate.getDate() - 30);
    }

    const stats = await AuditLog.aggregate([
      {
        $match: {
          restaurantId: req.restaurantId,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: "$action",
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const userActivity = await AuditLog.aggregate([
      {
        $match: {
          restaurantId: req.restaurantId,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: "$userId",
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: "restaurantusers",
          localField: "_id",
          foreignField: "_id",
          as: "user"
        }
      },
      {
        $unwind: "$user"
      },
      {
        $project: {
          name: "$user.name",
          email: "$user.email",
          role: "$user.role",
          count: 1
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    res.status(200).json({
      status: true,
      data: {
        actionStats: stats,
        userActivity,
        period
      }
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Error fetching audit statistics",
      error: error.message,
    });
  }
};