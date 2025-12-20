# Classroom Bulk Upload Guide

## Overview
You can now upload classrooms in bulk using a CSV or Excel file instead of adding them one by one.

## API Endpoint
```
POST /classrooms/bulk-upload
```

## File Format

Your CSV or Excel file should have the following columns:

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| name | String | Yes | Unique classroom name (e.g., "Room 129") |
| capacity | Number | Yes | Number of seats (must be > 0) |
| type | String | No | One of: "lecture", "lab", "seminar" (defaults to "lecture") |

## Example Data

### CSV Format (classroom_data.csv)
```csv
name,capacity,type
Room 101,50,lecture
Room 102,45,lecture
Lab 201,30,lab
Seminar Hall A,60,seminar
Lab 301,35,lab
```

### Excel Format (classroom_data.xlsx)
| name | capacity | type |
|------|----------|------|
| Room 101 | 50 | lecture |
| Room 102 | 45 | lecture |
| Lab 201 | 30 | lab |
| Seminar Hall A | 60 | seminar |
| Lab 301 | 35 | lab |

## How to Upload

### Using cURL
```bash
curl -X POST http://localhost:5000/classrooms/bulk-upload \
  -H "Authorization: Bearer <YOUR_AUTH_TOKEN>" \
  -F "file=@classroom_data.csv"
```

### Using Postman
1. Select POST method
2. Enter URL: `http://localhost:5000/classrooms/bulk-upload`
3. Go to Authorization tab → Select "Bearer Token" → Enter your token
4. Go to Body tab → Select "form-data"
5. Add key "file" (type: File) and select your CSV/Excel file
6. Click Send

### Using JavaScript Fetch
```javascript
const formData = new FormData();
const fileInput = document.querySelector('input[type="file"]');
formData.append('file', fileInput.files[0]);

const response = await fetch('/classrooms/bulk-upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${authToken}`
  },
  body: formData
});

const data = await response.json();
console.log(data);
```

## Response Format

The API returns a detailed report:

```json
{
  "success": true,
  "message": "Bulk upload completed: 5 successful, 0 failed",
  "data": {
    "successful": [
      {
        "row": 2,
        "id": "64abc123def456ghi789jkl0",
        "name": "Room 101"
      },
      {
        "row": 3,
        "id": "64abc123def456ghi789jkl1",
        "name": "Room 102"
      }
    ],
    "failed": []
  }
}
```

## Error Handling

If some rows fail, they'll be listed in the `failed` array:

```json
{
  "success": true,
  "message": "Bulk upload completed: 4 successful, 1 failed",
  "data": {
    "successful": [...],
    "failed": [
      {
        "row": 5,
        "reason": "Classroom name already exists",
        "data": {
          "name": "Room 101",
          "capacity": 55,
          "type": "lecture"
        }
      }
    ]
  }
}
```

## Validation Rules

- **name**: Required, must be unique (no duplicates)
- **capacity**: Required, must be a valid number > 0
- **type**: Optional, must be "lecture", "lab", or "seminar" (case-insensitive)

## Advantages

✅ **Bulk Upload** - Add hundreds of classrooms at once  
✅ **Validation** - All rows are validated before being saved  
✅ **Error Reporting** - Get detailed feedback on which rows failed and why  
✅ **Partial Success** - Even if some rows fail, successful rows are still saved  
✅ **Both Formats** - Works with CSV and Excel (.xlsx, .xls)
