import React, { useState, useEffect } from 'react';
import axios from 'axios';
import moment from 'moment';
import * as XLSX from 'xlsx';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./Rainwater.css";
const FlowDischarge = () => {
    const [flowData, setFlowData] = useState(null);
    const [todayFlow, setTodayFlow] = useState(0);
    const [monthFlow, setMonthFlow] = useState(0);
    const [yearFlow, setYearFlow] = useState(0);
    const [fromDate, setFromDate] = useState(null);
    const [toDate, setToDate] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const BASE_URL = `http://${window.location.hostname}:5000`;
    useEffect(() => {
        fetchFlowData();
    }, []);

    const fetchFlowData = async () => {
        try {
            const response = await axios.get(`${BASE_URL}/get-latest-data`);
            if (response.status === 200) {
                setFlowData(response.data);
                calculateCumulativeFlows();
                // console.log(response.data);
            }
        } catch (error) {
            console.error('Error fetching flow data:', error);
        }
    };

    const calculateCumulativeFlows = async () => {
        try {
            const todayStart = moment().startOf('day').format("YYYY-MM-DD HH:mm");
            const monthStart = moment().startOf('month').format("YYYY-MM-DD HH:mm");
            const yearStart = moment().startOf('year').format("YYYY-MM-DD HH:mm");

            const [todayResponse, monthResponse, yearResponse] = await Promise.all([
                axios.get(`${BASE_URL}/get-data-range`, { params: { from: todayStart, to: moment().format("YYYY-MM-DD HH:mm"), tank: "Flow" } }),
                axios.get(`${BASE_URL}/get-data-range`, { params: { from: monthStart, to: moment().format("YYYY-MM-DD HH:mm"), tank: "Flow" } }),
                axios.get(`${BASE_URL}/get-data-range`, { params: { from: yearStart, to: moment().format("YYYY-MM-DD HH:mm"), tank: "Flow" } })
            ]);

            // Calculate cumulative flows
            if (todayResponse.data.length > 0) {
                const todayData = todayResponse.data;
                const todayFlow = todayData[todayData.length - 1].totalFlow - todayData[0].totalFlow;
                setTodayFlow(todayFlow);
            }

            if (monthResponse.data.length > 0) {
                const monthData = monthResponse.data;
                const monthFlow = monthData[monthData.length - 1].totalFlow - monthData[0].totalFlow;
                setMonthFlow(monthFlow);
            }

            if (yearResponse.data.length > 0) {
                const yearData = yearResponse.data;
                const yearFlow = yearData[yearData.length - 1].totalFlow - yearData[0].totalFlow;
                setYearFlow(yearFlow);
            }

        } catch (error) {
            console.error('Error calculating cumulative flows:', error);
        }
    };

    const tableStyle = {
        width: '75%',
        borderCollapse: 'collapse',
        margin: '20px auto',

    };

    const thStyle = {
        border: '1px solid black',
        padding: '8px',
        textAlign: 'left',
        backgroundColor: '#f2f2f2',
        textAlign: 'center',
    };

    const tdStyle = {
        border: '1px solid black',
        padding: '8px',
        textAlign: 'center',
    };
    const downloadFlowData = async () => {
        try {
            const response = await axios.get(`${BASE_URL}/get-data-range`, {
                params: {
                    from: moment(fromDate).format("YYYY-MM-DD HH:mm"),
                    to: moment(toDate).format("YYYY-MM-DD HH:mm"),
                    tank: "Flow",
                },
            });

            if (response.status === 200 && response.data.length > 0) {
                const headers = ["Time", "Actual Flow Rate", "Total Cumulative Flow"];
                const sheetData = response.data.map(entry => ({
                    Time: entry.timestamp,
                    "Actual Flow Rate": entry.actualFlow,
                    "Total Cumulative Flow": entry.totalFlow,
                }));

                const worksheet = XLSX.utils.json_to_sheet(sheetData, { header: headers });
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "Flow Data");
                XLSX.writeFile(workbook, "Flow_Data.xlsx");
            } else {
                alert("No data available for the selected range.");
            }
        } catch (error) {
            console.error("Error downloading flow data:", error);
        }
    };

    return (
        <div className='container'>
            <h1 className='text-center text-gradient-to-r from-primary to-black'><b>Flowmeter Discharge Summary</b></h1>
            <table style={{ width: '75%', borderCollapse: 'collapse', margin: '20px auto' }}>
                <thead>
                    <tr>
                        <th style={thStyle}></th>
                        <th style={thStyle}>Actual Flow Rate</th>
                        <th style={thStyle}>Total Cumulative Flow</th>
                        <th style={thStyle}>Today Cumulative Flow</th>
                        <th style={thStyle}>Month Cumulative Flow</th>
                        <th style={thStyle}>Year Cumulative Flow</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style={tdStyle}><b>Rain Water Discharge</b></td>
                        <td style={tdStyle}><b>{flowData?.Flow.actualFlow} m³/h</b></td>
                        <td style={tdStyle}><b>{flowData?.Flow.totalFlow} m³</b></td>
                        <td style={tdStyle}><b>{todayFlow.toFixed(2)} m³</b></td>
                        <td style={tdStyle}><b>{monthFlow.toFixed(2)} m³</b></td>
                        <td style={tdStyle}><b>{yearFlow.toFixed(2)} m³</b></td>
                    </tr>
                </tbody>
            </table>
            <div className='container w-80'>
                <i className="fa fa-download float-end cursor-pointer" aria-hidden="true" onClick={() => setShowModal(true)}></i>
            </div>

            {showModal && (
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
                                onClick={() => setShowModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="w-full sm:w-auto bg-indigo-700 text-white py-2 px-4 rounded-md hover:bg-indigo-600 transition-all duration-300"
                                onClick={downloadFlowData}
                            >
                                Download
                            </button>

                        </div>
                    </div>
                </div>
            )
            }
        </div >
    );
};

export default FlowDischarge;
