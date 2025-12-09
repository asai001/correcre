"use client";

import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import { useState, ReactNode } from "react";

type TabItem = {
  label: string;
  content: ReactNode;
};

type CustomTabsProps = {
  tabs: TabItem[];
  defaultIndex?: number;
};

export default function CustomTabs({ tabs, defaultIndex = 0 }: CustomTabsProps) {
  const [value, setValue] = useState(defaultIndex);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <div className="mt-5">
      <Box sx={{ borderBottom: "none", mb: 2 }}>
        <Tabs
          value={value}
          onChange={handleChange}
          sx={{
            borderRadius: "5px",
            minHeight: "auto",
            "& .MuiTabs-indicator": {
              display: "none", // 下線を非表示
            },
            "& .MuiTabs-flexContainer": {
              backgroundColor: "#f1f5f9", // タブコンテナの背景色を薄いグレーに
            },
          }}
        >
          {tabs.map((tab, index) => (
            <Tab
              key={index}
              label={tab.label}
              id={`tab-${index}`}
              aria-controls={`tabpanel-${index}`}
              sx={{
                minHeight: "auto",
                py: 1.5,
                px: 3.5,
                mr: 1,
                borderRadius: "5px",
                textTransform: "none",
                fontWeight: 700,
                fontSize: "0.95rem",
                color: "#555", // 非アクティブ時はグレー
                backgroundColor: "#f1f5f9", // 非アクティブ時は薄いグレー
                "&.Mui-selected": {
                  color: "#ffffff", // アクティブ時は白
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", // 青から紫へのグラデーション
                },
                "&:hover": {
                  background: value === index ? "linear-gradient(135deg, #5a72d8 0%, #6a4292 100%)" : "#e2e8f0",
                },
                transition: "all 0.2s ease-in-out",
              }}
            />
          ))}
        </Tabs>
      </Box>
      {tabs.map((tab, index) => (
        <div key={index} role="tabpanel" hidden={value !== index} id={`tabpanel-${index}`} aria-labelledby={`tab-${index}`}>
          {value === index && <Box sx={{ p: 3 }}>{tab.content}</Box>}
        </div>
      ))}
    </div>
  );
}
