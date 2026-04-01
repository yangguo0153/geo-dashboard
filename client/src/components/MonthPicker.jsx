import React from "react";
import { DatePicker } from "antd";
import dayjs from "dayjs";

export default function MonthPicker({ value, onChange }) {
  return (
    <DatePicker
      picker="month"
      value={value ? dayjs(value, "YYYY-MM") : null}
      onChange={(date) => onChange(date ? date.format("YYYY-MM") : null)}
      style={{ width: 160 }}
      placeholder="选择月份"
    />
  );
}