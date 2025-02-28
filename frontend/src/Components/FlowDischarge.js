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

    useEffect(() => {
        fetchFlowData();
    }, []);

    const fetchFlowData = async () => {
        try {
            const response = await axios.get('http://localhost:5000/get-latest-data');
            if (response.status === 200) {
                setFlowData(response.data.Flow);
                calculateCumulativeFlows();
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
                axios.get('http://localhost:5000/get-data-range-flow', { params: { from: todayStart, to: moment().format("YYYY-MM-DD HH:mm"), tank: "Flow" } }),
                axios.get('http://localhost:5000/get-data-range-flow', { params: { from: monthStart, to: moment().format("YYYY-MM-DD HH:mm"), tank: "Flow" } }),
                axios.get('http://localhost:5000/get-data-range-flow', { params: { from: yearStart, to: moment().format("YYYY-MM-DD HH:mm"), tank: "Flow" } })
            ]);

            if (todayResponse.data.length > 0) setTodayFlow(todayResponse.data[todayResponse.data.length - 1][2] - todayResponse.data[0][2]);
            if (monthResponse.data.length > 0) setMonthFlow(monthResponse.data[monthResponse.data.length - 1][2] - monthResponse.data[0][2]);
            if (yearResponse.data.length > 0) setYearFlow(yearResponse.data[yearResponse.data.length - 1][2] - yearResponse.data[0][2]);
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
            const response = await axios.get('http://localhost:5000/get-data-range-flow', {
                params: {
                    from: moment(fromDate).format("YYYY-MM-DD HH:mm"),
                    to: moment(toDate).format("YYYY-MM-DD HH:mm"),
                    tank: "Flow",
                },
            });

            if (response.status === 200 && response.data.length > 0) {
                const headers = ["Time", "Actual Flow Rate", "Total Cumulative Flow"];
                const sheetData = response.data.map(entry => ({
                    Time: entry[0],
                    "Actual Flow Rate": entry[1],
                    "Total Cumulative Flow": entry[2],
                }));

                const worksheet = XLSX.utils.json_to_sheet(sheetData, { header: headers });
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "Flow Data");
                XLSX.writeFile(workbook, "Flow_Data.xlsx");
            } else {
                console.error("No data available for the selected range.");
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
                        <td style={tdStyle}><b>{flowData?.["actual flow"] || 'N/A'} m³/h</b></td>
                        <td style={tdStyle}><b>{flowData?.["total flow"] || 'N/A'} m³</b></td>
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
                <div className="modal-overlay">
                    <div className='modal'>
                        <h2>Select Date and Time</h2>
                        <label>From:</label>
                        <div style={{ marginBottom: '10px', border: '1px solid #ccc', borderRadius: '5px' }}>
                            <DatePicker
                                selected={fromDate}
                                onChange={(date) => setFromDate(date)}
                                showTimeSelect
                                dateFormat="yyyy-MM-dd HH:mm"
                                withPortal
                            />
                        </div>
                        <label>To:</label>
                        <div style={{ marginBottom: '10px', border: '1px solid #ccc', borderRadius: '5px' }}>
                            <DatePicker
                                selected={toDate}
                                onChange={(date) => setToDate(date)}
                                showTimeSelect
                                dateFormat="yyyy-MM-dd HH:mm"
                                withPortal
                            />
                        </div>
                        <button className="btn btn-primary mt-3" onClick={downloadFlowData}>Download Data</button>
                        <button className="btn btn-secondary mt-3" onClick={() => setShowModal(false)}>Close</button>
                    </div>
                </div>
            )
            }
        </div >
    );
};

export default FlowDischarge;
