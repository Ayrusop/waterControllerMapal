// import React, { useState, useEffect } from 'react';
// import WaveAnimation from './WaveAnimation';

// export default function Controls() {
//     // Example water levels; replace these with actual values from your data source
//     const [tank1Level, setTank1Level] = useState(50); // Tank 1 level in percentage
//     const [tank2Level, setTank2Level] = useState(70); // Tank 2 level in percentage

//     useEffect(() => {
//         // Update tank levels dynamically here if needed
//         // Example: fetch data from an API or WebSocket
//     }, []);

//     return (
//         <section className="flex px-5">
//             <div className="container p-5">
//                 <div className="row m-2">
//                     <div className="col bg-primary h-[150px] text-center flex items-center justify-center text-white">
//                         <WaveAnimation isFlowing={isFlowing}/>
//                     </div>
//                 </div>
//                 <div className="row m-2">
//                     {/* Tank 1 Level */}
//                     <div className="col bg-primary m-2 h-[150px] p-3 flex flex-col items-center justify-center">
//                         <h2 className="text-white text-center">TANK 1 LEVEL</h2>
//                         <div className="w-full bg-gray-300 rounded-full mt-2">
//                             <div
//                                 className="bg-gradient-to-r from-white to-blue-400 rounded-full h-6 transition-all duration-1000"
//                                 style={{ width: `${tank1Level}%` }}
//                             ></div>
//                         </div>
//                         <p className="text-white mt-2">{tank1Level}%</p>
//                     </div>

//                     {/* Tank 2 Level */}
//                     <div className="col bg-primary m-2 h-[150px] p-3 flex flex-col items-center justify-center">
//                         <h2 className="text-white text-center">TANK 2 LEVEL</h2>
//                         <div className="w-full bg-gray-300 rounded-full mt-2">
//                             <div
//                                 className="bg-gradient-to-r from-white to-blue-400 rounded-full h-6 transition-all duration-1000"
//                                 style={{ width: `${tank2Level}%` }}
//                             ></div>
//                         </div>
//                         <p className="text-white mt-2">{tank2Level}%</p>
//                     </div>
//                 </div>
//             </div>
//             <div className="container p-5">
//                 <div className="row m-2">
//                     <div className="col bg-primary m-2 h-[150px] flex items-center justify-center text-white">
//                         1 of 3
//                     </div>
//                     <div className="col bg-primary m-2 h-[150px] flex items-center justify-center text-white">
//                         2 of 3
//                     </div>
//                 </div>
//             </div>
//         </section>
//     );
// }
