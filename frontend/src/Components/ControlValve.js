import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import * as XLSX from "xlsx";
import moment from "moment";

const ControlValve = () => {
    const [valveData, setValveData] = useState({
        rainwaterInlet: { status: 'SN', mode: 'A' },
        borewell: { status: 'BN' },
        rainwaterDrain: { status: 'RN' },
    });

    const [modalOpen, setModalOpen] = useState(false);
    const [selectedValve, setSelectedValve] = useState(null);
    const [fromDate, setFromDate] = useState(new Date());
    const [toDate, setToDate] = useState(new Date());

    useEffect(() => {
        // Fetch data from API
        const fetchData = async () => {
            try {
                const response = await axios.get('http://localhost:5000/get-latest-data');
                if (response.status === 200) {
                    const data = response.data;
                    setValveData({
                        rainwaterInlet: {
                            status: data.RainwaterInlet?.status || 'SN',
                            mode: data.RainwaterInlet?.mode || 'A',
                        },
                        borewell: {
                            status: data.Borewell?.status || 'BN',
                        },
                        rainwaterDrain: {
                            status: data.RainwaterDrain?.status || 'RN',
                        },
                    });
                }
            } catch (error) {
                console.error("Error fetching valve data:", error);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 15000);
        return () => clearInterval(interval);
    }, []);

    const openDownloadModal = (valve) => {
        setSelectedValve(valve);
        setModalOpen(true);
    };

    const downloadData = async () => {
        setModalOpen(false);

        try {
            const valveMapping = {
                "Rainwater Inlet": "RainwaterInlet",
                "Borewell": "Borewell",
                "Rainwater Drain": "RainwaterDrain",
            };

            const mappedValve = valveMapping[selectedValve] || selectedValve;

            // Format the date as "YYYY-MM-DD HH:mm" before sending
            const formattedFrom = moment(fromDate).format("YYYY-MM-DD HH:mm");
            const formattedTo = moment(toDate).format("YYYY-MM-DD HH:mm");

            const response = await axios.get('http://localhost:5000/get-data-range', {
                params: {
                    from: formattedFrom,
                    to: formattedTo,
                    tank: mappedValve,
                },
            });

            if (response.status === 200) {
                const data = response.data;
                console.log("Data received for download:", data);

                if (data.length > 0) {
                    const sheetData = data.map((entry) => ({
                        Timestamp: entry[0],
                        Status: entry[1].endsWith('N') ? 'Valve ON' : 'Valve OFF',
                        Mode: entry[2] === 'A' ? 'Automatic' : 'Manual',
                    }));

                    const headers = ["Timestamp", "Status", "Mode"];
                    const worksheet = XLSX.utils.json_to_sheet(sheetData, { header: headers });
                    const workbook = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(workbook, worksheet, "Valve Data");

                    XLSX.writeFile(workbook, `${selectedValve}_Data.xlsx`);
                } else {
                    console.error("No data available for the selected range.");
                }
            } else {
                console.error("Error fetching valve data:", response.status, response.statusText);
            }
        } catch (error) {
            console.error("Error fetching valve data:", error);
        }
    };
    const sendCommand = async (valve, command) => {
        try {
            await axios.post('http://localhost:5000/send-command', {
                valve,
                command,
            });
            console.log(`Command sent: ${valve} -> ${command}`);
        } catch (error) {
            console.error("Error sending command:", error);
        }
    };
    const renderValve = (title, valve, key) => {
        const isOn = valve.status.endsWith('N');
        const isAuto = valve.mode === 'A';
        const updatedTitle = title === "Rainwater Inlet" ? "Rainwater Tank Inlet Valve" :
            title === "Borewell" ? "Borewell Inlet Valve" :
                title === "Rainwater Drain" ? "Rainwater Collection Drain Valve" : title;
        return (
            <div key={key} className="col mt-5">
                <h2>{updatedTitle}</h2>
                <div className='d-flex justify-content-center'>
                    <div
                        style={{
                            width: '60px',
                            height: '190px',
                            background: isOn ? 'green' : 'red',
                            borderRadius: '10px',
                            position: 'relative',
                            cursor: 'pointer',
                            margin: '50px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'column',
                            textAlign: 'center',
                            color: 'white',
                            fontSize: '16px',
                            fontWeight: 'bold',
                        }}
                        onClick={() => sendCommand(key, isOn ? (key === 'borewell' ? 'W' : key === 'rainwaterDrain' ? 'Y' : 'F') : (key === 'borewell' ? 'U' : key === 'rainwaterDrain' ? 'X' : 'N'))}
                    >
                        <div
                            style={{
                                width: '50px',
                                height: '50px',
                                left: "5px",
                                background: 'white',
                                borderRadius: '10px',
                                position: 'absolute',
                                top: isOn ? '10px' : '130px',
                                transition: 'top 0.3s'
                            }}
                        />
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                        >
                            {isOn ? (
                                <>
                                    <div>O</div>
                                    <div>N</div>
                                </>
                            ) : (
                                <>
                                    <div>O</div>
                                    <div>F</div>
                                    <div>F</div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <div className='mt-3'>
                    {key === 'rainwaterInlet' && (
                        <>
                            <button className={`m-2 p-3 rounded ${isAuto ? 'bg-gradient-to-r from-primary to-black text-white' : 'bg-secondary text-white'}`}
                                onClick={() => sendCommand("RainwaterInlet", "A")}
                            >
                                AUTO
                            </button>
                            <button className={`m-2 p-3 rounded ${!isAuto ? 'bg-gradient-to-r from-primary to-black text-white' : 'bg-secondary text-white'}`}
                                onClick={() => sendCommand("RainwaterInlet", "M")}
                            >
                                Manual
                            </button>
                        </>
                    )}
                    <i className="fa fa-download cursor-pointer" aria-hidden="true" onClick={() => openDownloadModal(title)}></i>
                </div>
            </div>
        );
    };

    return (
        <div className='container text-center'>
            <h1 className='bg-gradient-to-r from-primary to-black bg-clip-text text-transparent text-5xl'><b>Control Valve Status</b></h1>
            <div className="row">
                {renderValve("Rainwater Inlet", valveData.rainwaterInlet, "rainwaterInlet")}
                {renderValve("Borewell", valveData.borewell, "borewell")}
                {renderValve("Rainwater Drain", valveData.rainwaterDrain, "rainwaterDrain")}
            </div>

            {modalOpen && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h2>Select Date and Time</h2>
                        <label>From:</label>
                        <DatePicker
                            selected={fromDate}
                            onChange={(date) => setFromDate(date)}
                            showTimeSelect
                            dateFormat="yyyy-MM-dd HH:mm"
                            withPortal
                        />
                        <label>To:</label>
                        <DatePicker
                            selected={toDate}
                            onChange={(date) => setToDate(date)}
                            showTimeSelect
                            dateFormat="yyyy-MM-dd HH:mm"
                            withPortal  
                        />
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

export default ControlValve;