import React from 'react';

const StatCard = ({
     title,
     value,
     subtext,
     icon: Icon,
     trend,
     alert,
     className = ''
}) => (
     <div
          className={`relative overflow-hidden rounded-xl shadow-md hover:shadow-lg transition-all duration-300 min-w-0 group/card transform hover:-translate-y-1 ${className} 
                ${alert ? 'bg-white border-2 border-red-300' : 'bg-white border-2 border-slate-200 hover:border-blue-300'}`}
     >
          {/* Subtle decorative element */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -translate-y-12 translate-x-12"></div>
          
          <div className="relative p-5 flex items-center justify-between gap-4">
               {/* Content Container */}
               <div className="flex-1 min-w-0 z-10">
                    {/* Title */}
                    <div className="flex items-center gap-1.5 mb-2">
                         <p className={`text-xs font-bold uppercase tracking-wide truncate ${alert ? 'text-red-600' : 'text-slate-600'}`}>
                              {title}
                         </p>
                    </div>

                    {/* Value */}
                    <h3 className={`text-2xl sm:text-3xl font-extrabold truncate ${alert ? 'text-red-700' : 'text-slate-900'}`}>
                         {value}
                    </h3>

                    {/* Subtext */}
                    {subtext && (
                         <p className={`text-xs font-semibold mt-1.5 truncate 
                           ${trend === 'up' ? 'text-green-600' :
                                   trend === 'down' ? 'text-red-500' :
                                        'text-slate-500'}`}>
                              {subtext}
                         </p>
                    )}
               </div>

               {/* Icon Container */}
               <div className={`p-3 rounded-xl shadow-sm flex-shrink-0 z-10 
                         ${alert ? 'bg-red-100' :
                         trend === 'up' ? 'bg-green-100' :
                              'bg-blue-100'}`}>
                    <Icon className={`w-6 h-6 ${alert ? 'text-red-600' : trend === 'up' ? 'text-green-600' : 'text-blue-600'}`} />
               </div>
          </div>
     </div>
);

export default StatCard;