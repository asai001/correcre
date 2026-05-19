"use client";

import { useState, type MouseEvent } from "react";

import { IconButton, InputAdornment, SvgIcon, TextField, type SvgIconProps, type TextFieldProps } from "@mui/material";

type PasswordTextFieldProps = Omit<TextFieldProps, "type">;

function EyeIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path
        d="M2 12s3.8-6 10-6 10 6 10 6-3.8 6-10 6-10-6-10-6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="12"
        r="3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </SvgIcon>
  );
}

function EyeOffIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path
        d="M3 3l18 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.5 6.15A10.84 10.84 0 0 1 12 6c6.2 0 10 6 10 6a17.6 17.6 0 0 1-3.2 3.67"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.72 8.27A17.38 17.38 0 0 0 2 12s3.8 6 10 6c1.54 0 2.95-.37 4.23-.95"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.9 9.9A3 3 0 0 0 14.1 14.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </SvgIcon>
  );
}

export function PasswordTextField({ InputProps, ...props }: PasswordTextFieldProps) {
  const [isVisible, setIsVisible] = useState(false);

  const handleMouseDown = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  return (
    <TextField
      {...props}
      type={isVisible ? "text" : "password"}
      InputProps={{
        ...InputProps,
        endAdornment: (
          <>
            {InputProps?.endAdornment}
            <InputAdornment position="end">
              <IconButton
                type="button"
                onClick={() => setIsVisible((current) => !current)}
                onMouseDown={handleMouseDown}
                edge="end"
                size="small"
                aria-label={isVisible ? "パスワードを隠す" : "パスワードを表示"}
                sx={{ color: "primary.main" }}
              >
                {isVisible ? <EyeOffIcon fontSize="small" /> : <EyeIcon fontSize="small" />}
              </IconButton>
            </InputAdornment>
          </>
        ),
      }}
    />
  );
}
