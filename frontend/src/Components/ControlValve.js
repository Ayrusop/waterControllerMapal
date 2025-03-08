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
    const BASE_URL = `http://${window.location.hostname}:5000`;
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedValve, setSelectedValve] = useState(null);
    const [fromDate, setFromDate] = useState(new Date());
    const [toDate, setToDate] = useState(new Date());
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        // Fetch data from API
        const fetchData = async () => {
            try {
                const response = await axios.get(`${BASE_URL}/get-latest-data`);
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

            const response = await axios.get(`${BASE_URL}/get-data-range`, {
                params: {
                    from: formattedFrom,
                    to: formattedTo,
                    tank: mappedValve,
                },
            });
            console.log(response)
            if (response.status === 200) {
                const data = response.data;
                console.log("Data received for download:", data);

                if (data.length > 0) {
                    const sheetData = data.map((entry) => ({
                        Timestamp: entry.timestamp,
                        Status: entry.status.endsWith('N') ? 'Valve ON' : 'Valve OFF',
                        Mode: entry.mode === 'A' ? 'Automatic' : 'Manual' || null,
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
            setLoading(true);
            await axios.post(`${BASE_URL}/send-command`, {
                valve,
                command,
            });
            // console.log(`Command sent: ${valve} -> ${command}`);
        } catch (error) {
            // console.error("Error sending command:", error);
        } finally {
            setTimeout(() => setLoading(false), 10000); // Hide loading after 5 seconds
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
            {loading && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="p-6 bg-white rounded-lg shadow-lg flex flex-col items-center">
                        <div className="loader"></div>
                        <p className="text-lg font-medium mt-4">Processing...</p>
                    </div>
                </div>
            )}
            <h1 className='bg-gradient-to-r from-primary to-black bg-clip-text text-transparent text-5xl'><b>Control Valve Status</b></h1>
            <div className="row">
                {renderValve("Rainwater Inlet", valveData.rainwaterInlet, "rainwaterInlet")}
                {renderValve("Borewell", valveData.borewell, "borewell")}
                {renderValve("Rainwater Drain", valveData.rainwaterDrain, "rainwaterDrain")}
            </div>

            {modalOpen && (
                 <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                                    <div className="bg-white p-6 rounded-lg shadow-lg w-1/3 text-center">
                                        <h2 className="text-2xl font-semibold text-center mb-4">Select Date and Time</h2>
                
                                        <div className="mb-4">
                                            <label className="block text-lg font-medium mb-2">From:</label>
                                            <div>
                                                <DatePicker
                                                    selected={fromDate}
                                                    onChange={(date) => setFromDate(date)}
                                                    showTimeSelect
                                                    dateFormat="yyyy-MM-dd HH:mm"
                                                    withPortal
                                                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>
                                        </div>
                
                                        <div className="mb-4">
                                            <label className="block text-lg font-medium mb-2">To:</label>
                                            <div>
                                                <DatePicker
                                                    selected={toDate}
                                                    onChange={(date) => setToDate(date)}
                                                    showTimeSelect
                                                    dateFormat="yyyy-MM-dd HH:mm"
                                                    withPortal
                                                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>
                                        </div>
                
                                        <div className="flex justify-between gap-4">
                                            <button
                                                className="btn btn-secondary w-full sm:w-auto bg-gray-400 text-white py-2 px-4 rounded-md hover:bg-gray-500 transition-all duration-300"
                                                onClick={() => setModalOpen(false)}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                className="w-full sm:w-auto bg-indigo-700 text-white py-2 px-4 rounded-md hover:bg-indigo-600 transition-all duration-300"
                                                onClick={downloadData}
                                            >
                                                Download
                                            </button>
                                           
                                        </div>
                                    </div>
                                </div>
            )}
        </div>
    );
};

export default ControlValve;