import React, { useCallback } from "react";
import { CameraOutlined } from "@ant-design/icons";
import html2canvas from "html2canvas";
import { message } from "antd";

export default function ScreenshotButton({ targetRef, filename = "screenshot" }) {
  const handleScreenshot = useCallback(async () => {
    if (!targetRef?.current) return;

    try {
      const canvas = await html2canvas(targetRef.current, {
        backgroundColor: "#0a0e17",
        scale: 2,
      });

      const link = document.createElement("a");
      link.download = `${filename}-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      message.success("截屏已下载");
    } catch (error) {
      message.error("截屏失败");
    }
  }, [targetRef, filename]);

  return (
    <button className="screenshot-btn" onClick={handleScreenshot}>
      <CameraOutlined /> 截屏
    </button>
  );
}