import React from 'react';
import { DateRangePicker } from '../common/CustomCalendar';

const QAFilterBar = ({ dateRange, handleDateRangeChange, handleClear }) => {
  return (
    <DateRangePicker
      startDate={dateRange.start}
      endDate={dateRange.end}
      onStartDateChange={(date) => handleDateRangeChange('start', date)}
      onEndDateChange={(date) => handleDateRangeChange('end', date)}
      onClear={handleClear}
      label="Date Range Filter"
      description="Select your preferred date range"
      showClearButton={true}
      fieldWidth="320px"
    />
  );
};

export default QAFilterBar;
