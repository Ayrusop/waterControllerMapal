import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import * as XLSX from "xlsx";
import axios from "axios";
import "./Rainwater.css";
import moment from "moment";

const Rainwater = () => {
    const [tankData, setTankData] = useState({
        tankA: { percentage: 0, liters: 0, lastHarvesting: 0 },
        tankB: { percentage: 0, liters: 0, lastHarvesting: 0 },
        total: { percentage: 0, liters: 0, lastHarvesting: 0 },
    });

    const [modalOpen, setModalOpen] = useState(false);
    const [selectedTank, setSelectedTank] = useState(null);
    const [fromDate, setFromDate] = useState(new Date());
    const [toDate, setToDate] = useState(new Date());
    const [lastHarvestingDate, setLastHarvestingDate] = useState(null);
    useEffect(() => {
        // Fetch data from API
        const fetchData = async () => {
            try {
                const response = await axios.get('http://localhost:5000/get-latest-data');
                if (response.status === 200) {
                    const data = response.data;

                    // Calculate lastHarvesting for Tank1
                    const lastHarvestingTank1 = await calculateLastHarvesting("Tank1");
                    // Calculate lastHarvesting for Tank2
                    const lastHarvestingTank2 = await calculateLastHarvesting("Tank2");

                    setTankData({
                        tankA: {
                            percentage: data.Tank1?.["percentage (%)"] || 0,
                            liters: data.Tank1?.liters || 0,
                            lastHarvesting: lastHarvestingTank1,
                        },
                        tankB: {
                            percentage: data.Tank2?.["percentage (%)"] || 0,
                            liters: data.Tank2?.liters || 0,
                            lastHarvesting: lastHarvestingTank2,
                        },
                        total: {
                            percentage: ((data.Tank1?.liters + data.Tank2?.liters) / 57000) * 100,
                            liters: data.Tank1?.liters + data.Tank2?.liters,
                            lastHarvesting: lastHarvestingTank1 + lastHarvestingTank2,
                        },
                    });
                }
            } catch (error) {
                console.error("Error fetching tank data:", error);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 15000);
        return () => clearInterval(interval);
    }, []);

    const calculateLastHarvesting = async (tank) => {
        const formattedFrom = moment().startOf('day').format("YYYY-MM-DD HH:mm");
        const formattedTo = moment().format("YYYY-MM-DD HH:mm");

        try {
            const response = await axios.get('http://localhost:5000/get-data-range', {
                params: {
                    from: formattedFrom,
                    to: formattedTo,
                    tank: tank,
                },
            });

            if (response.status === 200) {
                const data = response.data;
                if (data.length > 0) {
                    const firstEntry = data[0];
                    const lastEntry = data[data.length - 1];
                    const firstLiters = firstEntry[3];
                    const lastLiters = lastEntry[3];
                    const lastHarvesting = lastLiters - firstLiters;

                    if (lastHarvesting >= 5000) {
                        setLastHarvestingDate(moment().format("YYYY-MM-DD"));
                    }
                    return lastHarvesting;
                }
            }
        } catch (error) {
            console.error("Error fetching data range:", error);
        }
        return 0;
    };

    const openDownloadModal = (tank) => {
        console.log("Opening modal for tank:", tank);
        setSelectedTank(tank);
        setModalOpen(true);
    };

    const downloadData = async () => {
        setModalOpen(false);

        try {
            const tankMapping = {
                "TANK A": "Tank1",
                "TANK B": "Tank2",
                "TANK A+B": "Total",
            };

            const mappedTank = tankMapping[selectedTank.toUpperCase()] || selectedTank;

            // Format the date as "YYYY-MM-DD HH:mm" before sending
            const formattedFrom = moment(fromDate).format("YYYY-MM-DD HH:mm");
            const formattedTo = moment(toDate).format("YYYY-MM-DD HH:mm");

            const response = await axios.get('http://localhost:5000/get-data-range', {
                params: {
                    from: formattedFrom,
                    to: formattedTo,
                    tank: mappedTank,
                },
            });

            if (response.status === 200) {
                const data = response.data;
                console.log("Data received for download:", data);

                if (data.length > 0) {
                    // Ensure correct structure: ["Time", "Percentage", "Liters"]
                    const headers = ["Time", "Percentage", "Liters"];
                    const sheetData = data.map((entry) => {
                        // Ensure that data aligns correctly regardless of whether it's a single tank or combined
                        if (entry.length === 3) {
                            return {
                                Time: entry[0],
                                Percentage: entry[1],
                                Liters: entry[2]
                            };
                        } else {
                            return {
                                Time: entry[0],
                                Percentage: entry[2],
                                Liters: entry[3]
                            };
                        }
                    });

                    const worksheet = XLSX.utils.json_to_sheet(sheetData, { header: headers });
                    const workbook = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(workbook, worksheet, "Tank Data");

                    XLSX.writeFile(workbook, `${selectedTank}_Data.xlsx`);
                } else {
                    console.error("No data available for the selected range.");
                }
            } else {
                console.error("Error fetching tank data:", response.status, response.statusText);
            }
        } catch (error) {
            console.error("Error fetching tank data:", error);
        }
    };

    const getWaterLevel = (percentage) => {
        if (percentage >= 75) {
            return 0;
        } else if (percentage >= 50) {
            return 10;
        } else if (percentage >= 25) {
            return 20;
        } else {
            return 40;
        }
    };

    const renderTank = (title, tank, key) => {
        const waterLevel = getWaterLevel(tank.percentage);

        return (
            <div key={key} className="col border shadow-2xl p-5 m-3">
                <div className="water-tank ml-10">
                    <div className="liquid">
                        <h2 className="bg-red">{title}</h2>
                        <svg className="water" viewBox="0 0 200 100">
                            <defs>
                                <linearGradient id="waterGradient" x1="0%" y1="10%" x2="0%" y2="50%">
                                    <stop offset="0" style={{ stopColor: "#29ABE2" }} />
                                    <stop offset="0.1643" style={{ stopColor: "#28A6E3" }} />
                                    <stop offset="0.3574" style={{ stopColor: "#2496E6" }} />
                                    <stop offset="0.5431" style={{ stopColor: "#1E7DEA" }} />
                                    <stop offset="0.7168" style={{ stopColor: "#1559F0" }} />
                                    <stop offset="0.874" style={{ stopColor: "#0B2CF7" }} />
                                    <stop offset="1" style={{ stopColor: "#0000FF" }} />
                                </linearGradient>
                            </defs>
                            <path fill="url(#waterGradient)" d={`M 0,${waterLevel} v ${100 - waterLevel} h 200 v -${100 - waterLevel} 
                            c -10,0 -15,5 -25,5 c -10,0 -15,-5 -25,-5
                            c -10,0 -15,5 -25,5 c -10,0 -15,-5 -25,-5
                            c -10,0 -15,5 -25,5 c -10,0 -15,-5 -25,-5
                            c -10,0 -15,5 -25,5 c -10,0 -15,-5 -25,-5`} />
                        </svg>
                    </div>
                    <div className="label">{tank.liters} Liters</div>
                </div>
                <p className="justify-center mt-2 text-green-500 text-2xl">
                    Last harvesting - <span>{tank.lastHarvesting} Liters</span>
                </p>
                {lastHarvestingDate && (
                    <p className="justify-center mt-2 text-green-500 text-2xl">
                        Last above 5000 liters harvested data - <span>{lastHarvestingDate}</span>
                    </p>
                )}
                <i className="fa fa-download float-end cursor-pointer" aria-hidden="true" onClick={() => openDownloadModal(title)}></i>
            </div>
        );
    };

    return (
        <div className="rainwater-container container">
            <div className="row">
                {renderTank("TANK A", tankData.tankA, "tankA")}
                {renderTank("TANK B", tankData.tankB, "tankB")}
                {renderTank("TANK A+B", tankData.total, "total")}
            </div>

            {modalOpen && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h2>Select Date and Time</h2>
                        <label>From:</label>
                        <div>
                            <DatePicker
                                selected={fromDate}
                                onChange={(date) => setFromDate(date)}
                                showTimeSelect
                                dateFormat="yyyy-MM-dd HH:mm"
                                withPortal
                            />
                        </div>
                        <label>To:</label>
                        <div>
                            <DatePicker
                                selected={toDate}
                                onChange={(date) => setToDate(date)}
                                showTimeSelect
                                dateFormat="yyyy-MM-dd HH:mm"
                                withPortal
                            />
                        </div>
                        <button className="btn btn-primary mt-3" onClick={downloadData}>
                            Download
                        </button>
                        <button className="btn btn-secondary mt-3" onClick={() => setModalOpen(false)}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Rainwater;