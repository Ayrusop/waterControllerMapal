const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const WebSocket = require('ws');
const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

// Serial port configuration
const serialPortPath = 'COM4'; //COM4
const baudRate = 9600;
const httpPort = 5000;
const wsPort = 8080;
const dbFile = 'data.db';
const moment = require('moment-timezone');
const app = express();
app.use(cors());
app.use(express.json());

// Initialize SQLite database
const db = new sqlite3.Database(dbFile, (err) => {
  if (err) {
    console.error('Failed to open database:', err.message);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Create tables if they do not exist
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS Tank1 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT,
    motorStatus TEXT,
    percentage INTEGER,
    liters INTEGER,
    mode TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS Tank2 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT,
    motorStatus TEXT,
    percentage INTEGER,
    liters INTEGER,
    mode TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS Flow (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT,
    actualFlow REAL,
    totalFlow REAL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS RainwaterInlet (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT,
    status TEXT,
    mode TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS Borewell (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT,
    status TEXT,
    mode TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS RainwaterDrain (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT,
    status TEXT,
    mode TEXT
  )`);
});
// Open serial port
const port = new SerialPort({ path: serialPortPath, baudRate }, (err) => {
  if (err) {
    console.error(`Failed to open serial port ${serialPortPath}:`, err.message);
    process.exit(1);
  }
  console.log(`Serial port ${serialPortPath} opened successfully`);
});


const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));
const wss = new WebSocket.Server({ port: wsPort });
console.log(`WebSocket server running on ws://localhost:${wsPort}`);

const getTimestampIST = () => {
  return moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
};

// console.log(getTimestampIST());


const parseData = (data) => {
  const parts = data.trim().split(',');
  const timestamp = getTimestampIST();
  // console.log(timestamp)
  if (parts.length === 5) {
    return {
      type: parts[0] === '1' ? 'Tank1' : 'Tank2',
      data: { timestamp, motorStatus: parts[1], percentage: +parts[2], liters: +parts[3], mode: parts[4] }
    };
  } else if (parts.length === 3 && !isNaN(parts[1])) {
    return {
      type: 'Flow',
      data: { timestamp, actualFlow: +parts[1], totalFlow: +parts[2] }
    };
  } else if (parts.length >= 2) {
    const categoryMapping = { '4': 'RainwaterInlet', '5': 'Borewell', '6': 'RainwaterDrain' };
    if (categoryMapping[parts[0]]) {
      const type = categoryMapping[parts[0]];
      const data = { timestamp, status: parts[1] };

      // Only add mode if it's RainwaterInlet (which has a mode column)
      if (type === 'RainwaterInlet' && parts.length >= 3) {
        data.mode = parts[2];
      }

      return { type, data };
    }
  }
  return null;
}; 


const saveToDatabase = (table, data) => {
  const columns = Object.keys(data).join(', ');
  const placeholders = Object.keys(data).map(() => '?').join(', ');
  const values = Object.values(data);

  db.run(`INSERT INTO ${table} (${columns}) VALUES (${placeholders})`, values, (err) => {
    if (err) {
      console.error(`Error inserting into ${table}:`, err.message);
    }
  });
};

parser.on('data', (data) => {
  const parsedData = parseData(data);
  if (!parsedData) {
    console.warn(`Invalid data format received: ${data.trim()}`);
    return;
  }

  saveToDatabase(parsedData.type, parsedData.data);

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
//get all data

app.get('/get-latest-data', (req, res) => {
  try {
    const latestData = {};
    const currentDate = moment().format("DD/MM/YYYY");
    const tables = ['Tank1', 'Tank2', 'Flow', 'RainwaterInlet', 'Borewell', 'RainwaterDrain'];
    let queriesCompleted = 0;

    tables.forEach((table) => {
      db.get(`SELECT * FROM ${table} ORDER BY id DESC LIMIT 1`, [], (err, row) => {
        if (err) {
          console.error(`Error fetching latest data from ${table}:`, err);
          latestData[table] = { error: 'Error fetching data' };
        } else if (!row) {
          latestData[table] = "No Data";
        } else {
          latestData[table] = row;
        }

        // Fetch Harvesting Data (For tables with 'liters' column)
        if (['Tank1', 'Tank2', 'Flow', 'RainwaterInlet'].includes(table)) {
          db.all(
            `SELECT timestamp, liters FROM ${table} WHERE timestamp LIKE ? ORDER BY timestamp ASC`,
            [`${currentDate}%`],
            (err, rows) => {
              if (err || rows.length < 2) {
                latestData[table].lastHarvesting = "No sufficient data in time range";
              } else {
                const firstLiters = parseFloat(rows[0].liters) || 0;
                const lastLiters = parseFloat(rows[rows.length - 1].liters) || 0;
                latestData[table].lastHarvesting = Math.max(0, firstLiters - lastLiters);
              }

              queriesCompleted++;
              if (queriesCompleted === tables.length) {
                res.json(latestData);
              }
            }
          );
        } else {
          queriesCompleted++;
          if (queriesCompleted === tables.length) {
            res.json(latestData);
          }
        }
      });
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});
// get range data


app.get("/get-data-range", (req, res) => {
  try {
    const { from, to, tank } = req.query;
    console.log("Request received:", from, to, tank);

    if (!from || !to || !tank) {
      return res.status(400).json({ error: "Missing required query parameters: from, to, or tank" });
    }

    const fromTime = moment.tz(from, "YYYY-MM-DD HH:mm", "Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");
    const toTime = moment.tz(to, "YYYY-MM-DD HH:mm", "Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");

    if (!moment(fromTime, "YYYY-MM-DD HH:mm:ss", true).isValid() || !moment(toTime, "YYYY-MM-DD HH:mm:ss", true).isValid()) {
      return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD HH:mm" });
    }

    if (tank.toUpperCase() === "TOTAL") {
      let queryTank1 = `SELECT * FROM Tank1 WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp ASC`;
      let queryTank2 = `SELECT * FROM Tank2 WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp ASC`;
      let params = [fromTime, toTime];

      db.all(queryTank1, params, (err, tank1Rows) => {
        if (err) {
          console.error("Database error (Tank1):", err);
          return res.status(500).json({ error: "Internal server error" });
        }

        db.all(queryTank2, params, (err, tank2Rows) => {
          if (err) {
            console.error("Database error (Tank2):", err);
            return res.status(500).json({ error: "Internal server error" });
          }

          let combinedData = {};

          tank1Rows.forEach((entry) => {
            combinedData[entry.timestamp] = {
              timestamp: entry.timestamp,
              percentageSum: entry.percentage,
              litersSum: entry.liters,
              count: 1,
            };
          });

          tank2Rows.forEach((entry) => {
            if (combinedData[entry.timestamp]) {
              combinedData[entry.timestamp].percentageSum += entry.percentage;
              combinedData[entry.timestamp].litersSum += entry.liters;
              combinedData[entry.timestamp].count += 1;
            } else {
              combinedData[entry.timestamp] = {
                timestamp: entry.timestamp,
                percentageSum: entry.percentage,
                litersSum: entry.liters,
                count: 1,
              };
            }
          });

          const finalData = Object.values(combinedData).map((entry) => ({
            timestamp: entry.timestamp,
            percentage: (entry.percentageSum / entry.count).toFixed(2),
            liters: entry.litersSum,
          }));

          if (finalData.length > 0) {
            return res.json(finalData);
          }

          // Fallback if no data
          let nextTank1Query = `SELECT * FROM Tank1 WHERE timestamp > ? ORDER BY timestamp ASC LIMIT 1`;
          let nextTank2Query = `SELECT * FROM Tank2 WHERE timestamp > ? ORDER BY timestamp ASC LIMIT 1`;

          db.get(nextTank1Query, [fromTime], (err, next1) => {
            if (err) return res.status(500).json({ error: "Internal server error" });

            db.get(nextTank2Query, [fromTime], (err, next2) => {
              if (err) return res.status(500).json({ error: "Internal server error" });

              return res.json([next1, next2].filter(Boolean));
            });
          });
        });
      });
    } else {
      let query = `SELECT * FROM ${tank} WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp ASC`;
      let params = [fromTime, toTime];

      db.all(query, params, (err, rows) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({ error: "Internal server error" });
        }

        if (rows.length > 0) {
          return res.json(rows);
        }

        let nextQuery = `SELECT * FROM ${tank} WHERE timestamp > ? ORDER BY timestamp ASC LIMIT 1`;
        db.get(nextQuery, [fromTime], (err, nextRow) => {
          if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ error: "Internal server error" });
          }

          if (nextRow) return res.json([nextRow]);
          return res.json({ message: "No data found in the given range" });
        });
      });
    }
  } catch (error) {
    console.error("Error fetching data:", error);
    return res.status(500).json({ error: "Internal server error" });
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
port.on('error', (err) => {
  console.error('Serial port error:', err.message);
});

app.use(express.static(path.join(__dirname, 'frontend', 'build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'build', 'index.html'));
});

app.listen(httpPort,'0.0.0.0', () => {
  console.log(`HTTP server running on ${httpPort}`);
});
