import React from "react";
import { Upload, message } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { useApi } from "../hooks/useApi";

export default function FileUpload({ month, onSuccess }) {
  const { uploadFile, loading } = useApi();

  const handleUpload = async (file) => {
    if (!month) {
      message.warning("请先选择考核月份");
      return false;
    }

    try {
      const result = await uploadFile(file, month);
      message.success(
        `上传成功：推荐词 ${result.recommend.records} 条，对比词 ${result.compare.records} 条，舆情词 ${result.sentiment.records} 条`
      );
      if (onSuccess) onSuccess(result);
    } catch (error) {
      message.error(`上传失败：${error.message}`);
    }

    return false; // prevent default upload
  };

  return (
    <Upload beforeUpload={handleUpload} showUploadList={false} accept=".xlsx,.xls">
      <button className="upload-btn" disabled={loading}>
        <UploadOutlined /> {loading ? "上传中..." : "上传 Excel 数据"}
      </button>
    </Upload>
  );
}