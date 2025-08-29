import React from "react";

type BoxProps = {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

export default function Box({ children, className = "", style }: BoxProps) {
  return (
    <div
      className={`rounded-2xl shadow-md bg-white p-4 ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
