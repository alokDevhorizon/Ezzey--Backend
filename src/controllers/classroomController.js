const Classroom = require('../models/Classroom');
const XLSX = require('xlsx');
const path = require('path');

// @desc    Create a classroom
// @route   POST /classrooms
// @access  Private/Admin
exports.createClassroom = async (req, res, next) => {
  try {
    const classroom = await Classroom.create(req.body);
    res.status(201).json({
      success: true,
      message: 'Classroom created successfully',
      data: classroom,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk upload classrooms from CSV/Excel
// @route   POST /classrooms/bulk-upload
// @access  Private/Admin
exports.bulkUploadClassrooms = async (req, res, next) => {
  try {
    // Check if file is provided
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file',
      });
    }

    const file = req.file;
    const fileExtension = path.extname(file.originalname).toLowerCase();

    let data = [];

    // Parse Excel/CSV file from buffer
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    data = XLSX.utils.sheet_to_json(worksheet);

    if (!data || data.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'File is empty or has no valid data',
      });
    }

    // Validate and process data
    const results = {
      successful: [],
      failed: [],
    };

    for (let i = 0; i < data.length; i++) {
      try {
        const row = data[i];

        // Validate required fields
        if (!row.name || !row.capacity) {
          results.failed.push({
            row: i + 2, // +2 because row 1 is header, array starts at 0
            reason: 'Missing required fields (name, capacity)',
            data: row,
          });
          continue;
        }

        // Validate capacity is a number
        const capacity = Number(row.capacity);
        if (isNaN(capacity) || capacity < 1) {
          results.failed.push({
            row: i + 2,
            reason: 'Capacity must be a valid number greater than 0',
            data: row,
          });
          continue;
        }

        // Validate type if provided
        const validTypes = ['lecture', 'lab', 'seminar'];
        const type = row.type?.toLowerCase() || 'lecture';
        if (!validTypes.includes(type)) {
          results.failed.push({
            row: i + 2,
            reason: `Type must be one of: ${validTypes.join(', ')}`,
            data: row,
          });
          continue;
        }

        // Create classroom
        const classroomData = {
          name: row.name.trim(),
          capacity: capacity,
          type: type,
        };

        const classroom = await Classroom.create(classroomData);
        results.successful.push({
          row: i + 2,
          id: classroom._id,
          name: classroom.name,
        });
      } catch (error) {
        // Handle duplicate key or other database errors
        results.failed.push({
          row: i + 2,
          reason: error.message.includes('duplicate key')
            ? 'Classroom name already exists'
            : error.message,
          data: data[i],
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Bulk upload completed: ${results.successful.length} successful, ${results.failed.length} failed`,
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all classrooms
// @route   GET /classrooms
// @access  Private
exports.getClassrooms = async (req, res, next) => {
  try {
    const classrooms = await Classroom.find({ isActive: true });
    res.status(200).json({
      success: true,
      count: classrooms.length,
      data: classrooms,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update classroom
// @route   PATCH /classrooms/:id
// @access  Private/Admin
exports.updateClassroom = async (req, res, next) => {
  try {
    const classroom = await Classroom.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!classroom) {
      return res.status(404).json({
        success: false,
        message: 'Classroom not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Classroom updated successfully',
      data: classroom,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete classroom
// @route   DELETE /classrooms/:id
// @access  Private/Admin
exports.deleteClassroom = async (req, res, next) => {
  try {
    const classroom = await Classroom.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!classroom) {
      return res.status(404).json({
        success: false,
        message: 'Classroom not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Classroom deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};