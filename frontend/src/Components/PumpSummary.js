import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import * as XLSX from "xlsx";
import pumpimg from '../assets/pump.png';
import moment from "moment";
const PumpSummary = () => {
    const [pumpData, setPumpData] = useState({
        pumpA: { motorStatus: 'MF', mode: 'A' },
        pumpB: { motorStatus: 'MF', mode: 'A' },
    });

    const [modalOpen, setModalOpen] = useState(false);
    const [selectedPump, setSelectedPump] = useState(null);
    const [fromDate, setFromDate] = useState(new Date());
    const [toDate, setToDate] = useState(new Date());

    useEffect(() => {
        // Fetch data from API
        const fetchData = async () => {
            try {
                const response = await axios.get('http://localhost:5000/get-latest-data');
                if (response.status === 200) {
                    const data = response.data;
                    setPumpData({
                        pumpA: {
                            motorStatus: data.Tank1?.["motor status"] || 'MF',
                            mode: data.Tank1?.mode || 'A',
                        },
                        pumpB: {
                            motorStatus: data.Tank2?.["motor status"] || 'MF',
                            mode: data.Tank2?.mode || 'A',
                        },
                    });
                }
            } catch (error) {
                console.error("Error fetching pump data:", error);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);
    const sendCommand = async (pump, command) => {
        try {
            await axios.post('http://localhost:5000/send-command', {
                pump,
                command,
            });
            console.log(`Command ${command} sent to ${pump}`);
        } catch (error) {
            console.error("Error sending command:", error);
        }
    };
    const openDownloadModal = (pump) => {
        setSelectedPump(pump);
        setModalOpen(true);
    };

    const downloadData = async () => {
        setModalOpen(false);

        try {
            const pumpMapping = {
                "Pump A": "Tank1",
                "Pump B": "Tank2",
            };

            const mappedPump = pumpMapping[selectedPump] || selectedPump;
            console.log(mappedPump)
            // Format the date as "YYYY-MM-DD HH:mm" before sending
            const formattedFrom = moment(fromDate).format("YYYY-MM-DD HH:mm");
            const formattedTo = moment(toDate).format("YYYY-MM-DD HH:mm");

            const response = await axios.get('http://localhost:5000/get-data-range', {
                params: {
                    from: formattedFrom,
                    to: formattedTo,
                    tank: mappedPump,
                },
            });

            if (response.status === 200) {
                const data = response.data;
                console.log("Data received for download:", data);

                if (data.length > 0) {
                    const sheetData = data.map((entry) => ({
                        Timestamp: entry[0],
                        "Motor Status": entry[1] === 'MF' ? 'Motor OFF' : 'Motor ON',
                        Mode: entry[2] === 'A' ? 'Automatic' : 'Manual',
                    }));

                    const headers = ["Timestamp", "Motor Status", "Mode"];
                    const worksheet = XLSX.utils.json_to_sheet(sheetData, { header: headers });
                    const workbook = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(workbook, worksheet, "Pump Data");

                    XLSX.writeFile(workbook, `${selectedPump}_Data.xlsx`);
                } else {
                    console.error("No data available for the selected range.");
                }
            } else {
                console.error("Error fetching pump data:", response.status, response.statusText);
            }
        } catch (error) {
            console.error("Error fetching pump data:", error);
        }
    };

    const renderPump = (title, pump, key) => {
        const isOn = pump.motorStatus === 'MN';
        const isAuto = pump.mode === 'A';
        const isPumpA = title === "Pump A";

        return (
            <div key={key} className="col">
                <h2>{title}</h2>
                <div className='d-flex justify-content-center'>
                    <img src={pumpimg} alt={title} />
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
                        onClick={() => sendCommand(title, isPumpA ? 'T' : 'D')}
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
                                <button >
                                    <div>O</div>
                                    <div>N</div>
                                </button>
                            ) : (
                                <button onClick={() => sendCommand(title, isPumpA ? 'S' : 'C')}>
                                    <div>O</div>
                                    <div>F</div>
                                    <div>F</div>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
                <div className='mt-3'>
                    <button className={`m-2 p-3 rounded ${isAuto ? 'bg-gradient-to-r from-primary to-black text-white' : 'bg-secondary text-white'}`}
                        onClick={() => sendCommand(title, 'A')}
                    >
                        AUTO
                    </button>
                    <button className={`m-2 p-3 rounded ${!isAuto ? 'bg-gradient-to-r from-primary to-black text-white' : 'bg-secondary text-white'}`}
                        onClick={() => sendCommand(title, 'M')}
                    >
                        Manual
                    </button>
                    <i className="fa fa-download cursor-pointer" aria-hidden="true" onClick={() => openDownloadModal(title)}></i>
                </div>
            </div>
        );
    };

    return (
        <div className='container text-center'>
            <h1 className='bg-gradient-to-r from-primary to-black bg-clip-text text-transparent text-5xl'><b>Pump Summary</b></h1>
            <div className="row">
                {renderPump("Pump A", pumpData.pumpA, "pumpA")}
                {renderPump("Pump B", pumpData.pumpB, "pumpB")}
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

export default PumpSummary; 