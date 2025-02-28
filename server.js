const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const WebSocket = require('ws');
const express = require('express');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const cors = require('cors');
const moment = require("moment");
// Serial port configuration
const serialPortPath = 'COM4';
const baudRate = 9600;
const httpPort = 5000;
const wsPort = 8080;

const app = express();
app.use(cors());
app.use(express.json()); // Enable JSON parsing
// Initialize SerialPort
const port = new SerialPort({ path: serialPortPath, baudRate }, (err) => {
  if (err) {
    console.error(`Failed to open serial port ${serialPortPath}:`, err.message);
    process.exit(1);
  }
  console.log(`Serial port ${serialPortPath} opened successfully`);
});

// Serial data parser
const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

// WebSocket Server
const wss = new WebSocket.Server({ port: wsPort });
console.log(`WebSocket server running on ws://localhost:${wsPort}`);

// Function to get current timestamp
const getTimestamp = () => new Date().toLocaleString();

// Function to load or create Excel file
const excelFile = 'data.xlsx';
let workbook;

if (fs.existsSync(excelFile)) {
  workbook = XLSX.readFile(excelFile);
} else {
  workbook = XLSX.utils.book_new();
  workbook.SheetNames = ['Tank1', 'Tank2', 'Flow'];

  const tankHeaders = [['Timestamp', 'Motor Status', 'Percentage (%)', 'Liters', 'Mode']];
  const flowHeaders = [['Timestamp', 'Actual Flow', 'Total Flow']];

  workbook.Sheets['Tank1'] = XLSX.utils.aoa_to_sheet(tankHeaders);
  workbook.Sheets['Tank2'] = XLSX.utils.aoa_to_sheet(tankHeaders);
  workbook.Sheets['Flow'] = XLSX.utils.aoa_to_sheet(flowHeaders);

  XLSX.writeFile(workbook, excelFile);
}

// Function to parse and categorize data
const parseData = (data) => {
  const parts = data.trim().split(',');
  const timestamp = getTimestamp();

  if (parts.length === 5) {
    // Tank Data (1, 2)
    const tankData = {
      timestamp,
      motorStatus: parts[1],
      percentage: parseInt(parts[2], 10),
      liters: parseInt(parts[3], 10),
      mode: parts[4],
    };

    return parts[0] === '1' ? { type: 'Tank1', data: tankData } : { type: 'Tank2', data: tankData };
  } else if (parts.length === 3 && !isNaN(parts[1])) {
    // Flow Data (3)
    const flowData = {
      timestamp,
      actualFlow: parseFloat(parts[1]),
      totalFlow: parseFloat(parts[2]),
    };
    return { type: 'Flow', data: flowData };
  } else if (parts.length >= 2) {
    // New categories (4, 5, 6)
    const id = parts[0];

    const categoryMapping = {
      '4': 'RainwaterInlet',
      '5': 'Borewell',
      '6': 'RainwaterDrain',
    };

    if (categoryMapping[id]) {
      const categoryData = {
        timestamp,
        status: parts[1],
      };

      if (id === '4' && parts.length === 3) {
        categoryData.mode = parts[2]; // Only RainwaterInlet has a mode
      }

      return { type: categoryMapping[id], data: categoryData };
    }
  }

  return null;
};


// Function to append data to Excel
const saveToExcel = (sheetName, rowData) => {
  const fileExists = fs.existsSync(excelFile);
  const workbook = fileExists ? XLSX.readFile(excelFile) : XLSX.utils.book_new();

  if (!workbook.Sheets[sheetName]) {
    console.log(`Creating new sheet: ${sheetName}`);

    let headers;
    if (sheetName === "RainwaterInlet") {
      headers = [['Timestamp', 'Status', 'Mode']];
    } else if (sheetName === "Borewell" || sheetName === "RainwaterDrain") {
      headers = [['Timestamp', 'Status']];
    } else {
      headers = [Object.keys(rowData)];
    }

    workbook.Sheets[sheetName] = XLSX.utils.aoa_to_sheet(headers);
    workbook.SheetNames.push(sheetName);
  }

  const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
  sheetData.push(Object.values(rowData));

  workbook.Sheets[sheetName] = XLSX.utils.aoa_to_sheet(sheetData);
  XLSX.writeFile(workbook, excelFile);
};


// Handle data from Arduino
parser.on('data', (data) => {
  const parsedData = parseData(data);
  if (!parsedData) {
    console.warn(`Invalid data format received: ${data.trim()}`);
    return;
  }

  // console.log(`Saving data to ${parsedData.type}:`, parsedData.data);
  saveToExcel(parsedData.type, parsedData.data);

  // Broadcast to all connected WebSocket clients
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(parsedData));
      } catch (err) {
        console.error('Error sending data to WebSocket client:', err.message);
      }
    }
  });
});
app.get('/get-latest-data', (req, res) => {
  try {
    // console.log(`Reading file from: ${excelFile}`);

    if (!fs.existsSync(excelFile)) {
      console.error("Excel file not found:", excelFile);
      return res.status(500).json({ error: 'Excel file not found' });
    }

    const workbook = XLSX.readFile(excelFile);
    // console.log("Sheets available:", workbook.SheetNames);

    const latestData = {};
    const currentDate = moment().format("DD/MM/YYYY");

    ['Tank1', 'Tank2', 'Flow', 'RainwaterInlet', 'Borewell', 'RainwaterDrain'].forEach((sheetName) => {
      if (!workbook.SheetNames.includes(sheetName)) {
        console.warn(`Sheet '${sheetName}' not found!`);
        latestData[sheetName] = "Sheet Not Found";
        return;
      }

      const sheet = workbook.Sheets[sheetName];
      const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      if (sheetData.length > 1) {
        const headers = sheetData[0].map(h => h.trim().toLowerCase()); // Normalize headers
        // console.log(`Headers in ${sheetName}:`, headers);

        const lastRow = sheetData[sheetData.length - 1];

        latestData[sheetName] = Object.fromEntries(
          headers.map((key, index) => [key, lastRow[index]])
        );

        // 🔹 Find Timestamp & Liters Column
        const timestampIndex = headers.findIndex(h => h.includes("timestamp"));
        const litersIndex = headers.findIndex(h => h.includes("liters"));

        if (timestampIndex === -1 || litersIndex === -1) {
          latestData[sheetName].lastHarvesting = "Timestamp or Liters column missing";
          return;
        }

        // 🔹 Filter data for 12 AM - 12 PM
        const filteredData = sheetData.slice(1).filter(row => {
          const timestamp = moment(row[timestampIndex], "DD/MM/YYYY, h:mm:ss a", true);
          return (
            timestamp.isValid() &&
            timestamp.format("DD/MM/YYYY") === currentDate &&
            timestamp.hour() >= 0 && timestamp.hour() < 12
          );
        });

        if (filteredData.length < 2) {
          latestData[sheetName].lastHarvesting = "No sufficient data in time range";
          return;
        }

        // 🔹 Get First & Last Liters Value
        const firstLiters = parseFloat(filteredData[0][litersIndex]) || 0;
        const lastLiters = parseFloat(filteredData[filteredData.length - 1][litersIndex]) || 0;

        // 🔹 Calculate Harvesting
        const harvestedLiters = Math.max(0, firstLiters - lastLiters);
        latestData[sheetName].lastHarvesting = harvestedLiters;
      } else {
        latestData[sheetName] = "No Data";
      }
    });

    // console.log("Final Latest Data Sent:", latestData);
    res.json(latestData);
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});
app.get('/get-data-range-flow', (req, res) => {
  try {
    const { from, to, tank } = req.query;
    console.log("Request received:", from, to, tank);

    if (!from || !to || !tank) {
      return res.status(400).json({ error: "Missing required query parameters: from, to, or tank" });
    }

    if (!fs.existsSync(excelFile)) {
      console.error("Excel file not found:", excelFile);
      return res.status(500).json({ error: "Excel file not found" });
    }

    const workbook = XLSX.readFile(excelFile);
    const fromTime = moment(from, "YYYY-MM-DD HH:mm", true);
    const toTime = moment(to, "YYYY-MM-DD HH:mm", true);

    if (!fromTime.isValid() || !toTime.isValid()) {
      return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD HH:mm" });
    }

    let matchingData = [];

    for (const sheetName of workbook.SheetNames) {
      if (sheetName.toLowerCase() !== tank.toLowerCase()) continue;

      const sheet = workbook.Sheets[sheetName];
      const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      if (sheetData.length <= 1) continue;

      const headers = sheetData[0].map(h => h.trim().toLowerCase());
      const timestampIndex = headers.findIndex(h => h.includes("timestamp"));
      const actualFlowIndex = headers.findIndex(h => h.includes("actual flow"));
      const totalFlowIndex = headers.findIndex(h => h.includes("total flow"));

      if (timestampIndex === -1 || actualFlowIndex === -1 || totalFlowIndex === -1) continue;

      const filteredData = sheetData.slice(1).filter(row => {
        const timestamp = moment(row[timestampIndex], ["DD/MM/YYYY, h:mm:ss a", "D/M/YYYY, h:mm:ss a"], true);
        return timestamp.isValid() && timestamp.isSameOrAfter(fromTime) && timestamp.isSameOrBefore(toTime);
      });

      if (filteredData.length > 0) {
        matchingData = filteredData.map(row => [
          row[timestampIndex],
          row[actualFlowIndex],
          row[totalFlowIndex]
        ]);
        break;
      }
    }

    if (matchingData.length > 0) {
      res.json(matchingData);
    } else {
      res.json({ message: "No data found in the given range across all sheets" });
    }
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.get('/get-data-range', (req, res) => {
  try {
    const { from, to, tank } = req.query;
    console.log("Request received:", from, to, tank);

    if (!from || !to || !tank) {
      return res.status(400).json({ error: "Missing required query parameters: from, to, or tank" });
    }

    if (!fs.existsSync(excelFile)) {
      console.error("Excel file not found:", excelFile);
      return res.status(500).json({ error: "Excel file not found" });
    }

    const workbook = XLSX.readFile(excelFile);
    const fromTime = moment(from, "YYYY-MM-DD HH:mm", true);
    const toTime = moment(to, "YYYY-MM-DD HH:mm", true);

    if (!fromTime.isValid() || !toTime.isValid()) {
      return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD HH:mm" });
    }

    let matchingData = [];

    if (tank.toLowerCase() === "total") {
      let tank1Data = [];
      let tank2Data = [];

      for (const sheetName of workbook.SheetNames) {
        if (sheetName.toLowerCase() === "tank1") {
          const sheet = workbook.Sheets[sheetName];
          tank1Data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        }
        if (sheetName.toLowerCase() === "tank2") {
          const sheet = workbook.Sheets[sheetName];
          tank2Data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        }
      }

      if (tank1Data.length > 1 && tank2Data.length > 1) {
        const headers1 = tank1Data[0].map(h => h.trim().toLowerCase());
        const headers2 = tank2Data[0].map(h => h.trim().toLowerCase());
        const timestampIndex1 = headers1.findIndex(h => h.includes("timestamp"));
        const percentageIndex1 = headers1.findIndex(h => h.includes("percentage"));
        const litersIndex1 = headers1.findIndex(h => h.includes("liters"));
        const timestampIndex2 = headers2.findIndex(h => h.includes("timestamp"));
        const percentageIndex2 = headers2.findIndex(h => h.includes("percentage"));
        const litersIndex2 = headers2.findIndex(h => h.includes("liters"));

        let combinedData = {};

        tank1Data.slice(1).forEach(row => {
          const timestamp = moment(row[timestampIndex1], ["DD/MM/YYYY, h:mm:ss a", "D/M/YYYY, h:mm:ss a"], true);
          if (timestamp.isValid() && timestamp.isSameOrAfter(fromTime) && timestamp.isSameOrBefore(toTime)) {
            combinedData[timestamp.format()] = {
              timestamp: row[timestampIndex1],
              percentage1: row[percentageIndex1],
              liters1: row[litersIndex1],
              percentage2: 0,
              liters2: 0,
            };
          }
        });

        tank2Data.slice(1).forEach(row => {
          const timestamp = moment(row[timestampIndex2], ["DD/MM/YYYY, h:mm:ss a", "D/M/YYYY, h:mm:ss a"], true);
          if (timestamp.isValid() && timestamp.isSameOrAfter(fromTime) && timestamp.isSameOrBefore(toTime)) {
            if (combinedData[timestamp.format()]) {
              combinedData[timestamp.format()].percentage2 = row[percentageIndex2];
              combinedData[timestamp.format()].liters2 = row[litersIndex2];
            } else {
              combinedData[timestamp.format()] = {
                timestamp: row[timestampIndex2],
                percentage1: 0,
                liters1: 0,
                percentage2: row[percentageIndex2],
                liters2: row[litersIndex2],
              };
            }
          }
        });

        matchingData = Object.values(combinedData).map(entry => [
          entry.timestamp,
          (entry.percentage1 + entry.percentage2) / 2,
          entry.liters1 + entry.liters2
        ]);
      }
    } else {
      for (const sheetName of workbook.SheetNames) {
        if (sheetName.toLowerCase() !== tank.toLowerCase()) continue;

        const sheet = workbook.Sheets[sheetName];
        const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (sheetData.length <= 1) continue;

        const headers = sheetData[0].map(h => h.trim().toLowerCase());
        const timestampIndex = headers.findIndex(h => h.includes("timestamp"));
        const statusIndex = headers.findIndex(h => h.includes("status"));
        const modeIndex = headers.findIndex(h => h.includes("mode"));

        if (timestampIndex === -1 || statusIndex === -1) continue;

        const filteredData = sheetData.slice(1).filter(row => {
          const timestamp = moment(row[timestampIndex], ["DD/MM/YYYY, h:mm:ss a", "D/M/YYYY, h:mm:ss a"], true);
          return timestamp.isValid() && timestamp.isSameOrAfter(fromTime) && timestamp.isSameOrBefore(toTime);
        });

        if (filteredData.length > 0) {
          matchingData = filteredData.map(row => row);
          break;
        } else {
          // 🔹 If no data found, check for the next available entry after "to" date
          const nextAvailableEntries = sheetData.slice(1)
            .map(row => ({
              row,
              timestamp: moment(row[timestampIndex], ["DD/MM/YYYY, h:mm:ss a", "D/M/YYYY, h:mm:ss a"], true),
            }))
            .filter(entry => entry.timestamp.isValid() && entry.timestamp.isAfter(toTime))
            .sort((a, b) => a.timestamp - b.timestamp); // Sort by earliest available timestamp

          if (nextAvailableEntries.length > 0) {
            matchingData.push(nextAvailableEntries[0].row); // Get the closest future entry
            break;
          }

        }

      }
    }

    if (matchingData.length > 0) {
      res.json(matchingData);
    } else {
      res.json({ message: "No data found in the given range across all sheets" });
    }
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post('/send-command', (req, res) => {
  const { command } = req.body;

  if (!command) {
    return res.status(400).json({ error: 'Command is required' });
  }

  console.log(`Sending command to serial port: ${command}`);

  port.write(command, (err) => {
    if (err) {
      console.error('Error writing to serial port:', err.message);
      return res.status(500).json({ error: 'Failed to send command' });
    }
    res.json({ message: 'Command sent successfully' });
  });
});

// Handle serial port errors
port.on('error', (err) => {
  console.error('Serial port error:', err.message);
});

// Serve the frontend
app.use(express.static(path.join(__dirname, 'frontend', 'build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'build', 'index.html'));
});
// Allow all origins

// Start the HTTP server
app.listen(httpPort, () => {
  console.log(`HTTP server running on http://localhost:${httpPort}`);
});
