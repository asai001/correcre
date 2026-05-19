"use client";

import { useMemo } from "react";
import { Autocomplete, TextField } from "@mui/material";

export type DepartmentOption = {
  name: string;
  employeeCount: number;
};

type DepartmentAutocompleteFieldProps = {
  departmentOptions: DepartmentOption[];
  value: string;
  error?: boolean;
  helperText?: string;
  label?: string;
  placeholder?: string;
  noOptionsText?: string;
  onChange: (value: string) => void;
};

export function DepartmentAutocompleteField({
  departmentOptions,
  value,
  error = false,
  helperText,
  label = "部署",
  placeholder = "既存部署を選択、または新しい部署名を入力",
  noOptionsText = "一致する部署はありません。この名前で新規追加できます。",
  onChange,
}: DepartmentAutocompleteFieldProps) {
  const selectedValue = useMemo(
    () => departmentOptions.find((departmentOption) => departmentOption.name === value) ?? value,
    [departmentOptions, value],
  );

  return (
    <Autocomplete<DepartmentOption, false, false, true>
      freeSolo
      fullWidth
      selectOnFocus
      handleHomeEndKeys
      options={departmentOptions}
      value={selectedValue}
      noOptionsText={noOptionsText}
      getOptionLabel={(option) => (typeof option === "string" ? option : option.name)}
      isOptionEqualToValue={(option, currentValue) =>
        typeof currentValue !== "string" && option.name === currentValue.name
      }
      onChange={(_event, nextValue) => {
        if (typeof nextValue === "string") {
          onChange(nextValue);
          return;
        }

        onChange(nextValue?.name ?? "");
      }}
      onInputChange={(_event, nextValue) => {
        onChange(nextValue);
      }}
      renderOption={(props, option) => {
        const { key, ...optionProps } = props;

        return (
          <li key={key} {...optionProps}>
            <div className="flex w-full items-center justify-between gap-3">
              <span>{option.name}</span>
              <span className="text-xs text-slate-500">{option.employeeCount}人</span>
            </div>
          </li>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          required
          fullWidth
          error={error}
          helperText={helperText}
          placeholder={placeholder}
        />
      )}
    />
  );
}
