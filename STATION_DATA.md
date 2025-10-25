# Station Data Management

## Overview
The Indian Railway Stations Map application now loads station data from external JSON files instead of embedded data. This makes it easy to switch between different station datasets.

## Available Station Files

### 1. **stations.geojson** (Default)
- **Purpose**: Quick route visualization
- **Stations**: 22 major stations on Delhi-Howrah main line
- **Route**: New Delhi → Howrah via Patna
- **Use Case**: Fast loading, railway route demonstration

### 2. **fullstations.json** (Comprehensive)
- **Purpose**: Complete Indian Railway network
- **Stations**: 90+ major railway stations across India
- **Coverage**: All zones (Northern, Southern, Eastern, Western, etc.)
- **Categories**: A1, A, and B category stations
- **Additional Data**: 
  - Station codes (e.g., NDLS, HWH, CSTM)
  - Railway zones
  - Station categories

## File Format

Both files use GeoJSON format with the following structure:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "name": "Station Name (CODE)",
        "code": "STATION_CODE",
        "zone": "Railway Zone",
        "category": "A1/A/B"
      },
      "geometry": {
        "type": "Point",
        "coordinates": [longitude, latitude]
      }
    }
  ]
}
```

## How to Switch Station Files

### Method 1: Edit the Code (Permanent Change)
In `mapwidget.cpp`, modify the constructor:

```cpp
// For default stations (22 stations)
loadStations();  // Uses stations.geojson

// For all major stations (90+ stations)
loadStations("fullstations.json");
```

### Method 2: Create Your Own Station File
1. Copy the format from `fullstations.json`
2. Add your stations with:
   - `name`: Station name with code in brackets
   - `coordinates`: [longitude, latitude]
   - `code`: Station code (optional)
   - `zone`: Railway zone (optional)
   - `category`: Station category (optional)
3. Save as `mystations.json`
4. Load with: `loadStations("mystations.json")`

## Station Coverage in fullstations.json

### **Major Cities Covered:**
- **North**: Delhi, Amritsar, Chandigarh, Dehradun, Lucknow, Kanpur
- **South**: Chennai, Bangalore, Hyderabad, Kochi, Trivandrum, Coimbatore
- **East**: Kolkata, Howrah, Patna, Guwahati, Bhubaneswar
- **West**: Mumbai, Pune, Ahmedabad, Surat, Indore, Nagpur
- **Central**: Bhopal, Jabalpur, Raipur, Gwalior

### **Railway Zones Represented:**
- Northern Railway (NR)
- Southern Railway (SR)
- Eastern Railway (ER)
- Western Railway (WR)
- Central Railway (CR)
- South Central Railway (SCR)
- South Eastern Railway (SER)
- East Central Railway (ECR)
- North Central Railway (NCR)
- North Eastern Railway (NER)
- Northeast Frontier Railway (NFR)
- North Western Railway (NWR)
- South Western Railway (SWR)
- West Central Railway (WCR)
- East Coast Railway (ECoR)
- South East Central Railway (SECR)

## Benefits of External JSON Files

✅ **Easy Updates**: Modify station data without recompiling
✅ **Flexible**: Switch between different datasets
✅ **Maintainable**: Separate data from code
✅ **Scalable**: Add hundreds or thousands of stations
✅ **Portable**: Share station datasets between users
✅ **No Embedded Data**: Cleaner, smaller binary

## Adding New Stations

To add a new station to `fullstations.json`:

```json
{
  "type": "Feature",
  "properties": {
    "name": "Your Station (CODE)",
    "code": "CODE",
    "zone": "Zone Name",
    "category": "A"
  },
  "geometry": {
    "type": "Point",
    "coordinates": [longitude, latitude]
  }
}
```

**Finding Coordinates:**
- Use Google Maps (right-click → coordinates)
- Format: [longitude, latitude] (longitude first!)
- Example: Mumbai coordinates are [72.8347, 18.9398]

## Performance Notes

- **stations.geojson**: Instant loading, shows Delhi-Howrah route
- **fullstations.json**: Quick loading (~90 stations), shows pan-India coverage
- Map automatically fits to show all loaded stations
- Zoom and pan work smoothly with any number of stations

## Future Enhancements

Possible additions to station data:
- Train connections
- Platform information
- Station facilities
- Historical information
- Images/photos
- Passenger statistics

---

**Your application is now completely data-driven with no embedded station data!** 🚂✨
